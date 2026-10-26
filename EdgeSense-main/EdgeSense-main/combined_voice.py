import json
import os
import queue
import sys
import time
import threading
import urllib.error
import urllib.request

import serial
from vosk import Model, KaldiRecognizer


# ============================================================
# EDGESENSE CONFIGURATION
# ============================================================

SERIAL_PORT = os.environ.get("EDGESENSE_SERIAL_PORT", "COM9")
SERIAL_BAUD = int(os.environ.get("EDGESENSE_SERIAL_BAUD", "921600"))
BACKEND_URL = os.environ.get("EDGESENSE_BACKEND_URL", "http://127.0.0.1:5000")

SAMPLE_RATE = 16000

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "vosk-model-small-en-us-0.15"
)

PACKET_HEADER = b"\xAA\x55"

PACKET_AUDIO = 1
PACKET_TELEMETRY = 2

MAX_PACKET_SIZE = 32768

# Print serial statistics every five seconds.
STATS_INTERVAL = 5

# Print only final recognition results by default.
SHOW_PARTIAL_RESULTS = False


# ============================================================
# SHARED STATE
# ============================================================

running = True

serial_port = None
serial_lock = threading.Lock()

audio_queue = []
audio_lock = threading.Lock()
telemetry_queue = queue.Queue(maxsize=2)

stats_lock = threading.Lock()

stats = {
    "bytes": 0,
    "audio_packets": 0,
    "audio_bytes": 0,
    "telemetry_packets": 0,
    "unknown_packets": 0,
    "invalid_packets": 0,
    "commands_sent": 0,
}

latest_telemetry = {}

last_stats_time = time.monotonic()


# ============================================================
# SERIAL COMMANDS
# ============================================================

def send_command(command):
    """
    Send a text command to the ESP32.

    The ESP32 firmware must read newline-terminated commands.
    """

    global serial_port

    command = command.strip().upper()

    allowed_commands = {
        "LIGHT ON",
        "LIGHT OFF",
        "FAN ON",
        "FAN OFF",
    }

    if command not in allowed_commands:
        print(f"[COMMAND] Rejected unknown command: {command}")
        return

    try:
        with serial_lock:
            if serial_port is None or not serial_port.is_open:
                print("[COMMAND] Serial connection is unavailable.")
                return

            serial_port.write((command + "\n").encode("ascii"))
            serial_port.flush()

        with stats_lock:
            stats["commands_sent"] += 1

        print(f"[COMMAND SENT] {command}")

    except (serial.SerialException, OSError) as exc:
        print(f"[COMMAND ERROR] {exc}")


# ============================================================
# PACKET PARSER
# ============================================================

def process_packet(packet_type, payload):
    """
    Process one complete packet.

    Packet layout:
        AA 55 | type | length_low | length_high | payload
    """

    global latest_telemetry

    if packet_type == PACKET_AUDIO:

        if len(payload) == 0:
            with stats_lock:
                stats["invalid_packets"] += 1
            return

        # Audio must be 16-bit signed PCM.
        if len(payload) % 2 != 0:
            with stats_lock:
                stats["invalid_packets"] += 1

            print(
                "[AUDIO ERROR] Payload has an odd byte count:",
                len(payload)
            )
            return

        with stats_lock:
            stats["audio_packets"] += 1
            stats["audio_bytes"] += len(payload)

        # Copy immutable bytes into the recognition queue.
        with audio_lock:
            audio_queue.append(bytes(payload))

        return

    if packet_type == PACKET_TELEMETRY:

        try:
            text = payload.decode("utf-8").strip()
            data = json.loads(text)

            if not isinstance(data, dict):
                raise ValueError("Telemetry JSON must be an object")

            latest_telemetry = data

            try:
                telemetry_queue.put_nowait(data)
            except queue.Full:
                try:
                    telemetry_queue.get_nowait()
                except queue.Empty:
                    pass
                try:
                    telemetry_queue.put_nowait(data)
                except queue.Full:
                    pass

            with stats_lock:
                stats["telemetry_packets"] += 1

            print("[TELEMETRY]", json.dumps(data))

        except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
            with stats_lock:
                stats["invalid_packets"] += 1

            print(
                f"[TELEMETRY ERROR] {exc}; "
                f"payload={payload[:100]!r}"
            )

        return

    with stats_lock:
        stats["unknown_packets"] += 1

    print(
        f"[PACKET] Unknown type={packet_type}, "
        f"length={len(payload)}"
    )


def parse_serial_buffer(buffer):
    """
    Extract complete packets from a bytearray.

    Supports packets split across multiple serial reads.
    """

    while True:

        header_index = buffer.find(PACKET_HEADER)

        if header_index < 0:

            # Preserve a trailing 0xAA because it could be
            # the first byte of a header in the next read.
            if buffer and buffer[-1] == 0xAA:
                buffer[:] = b"\xAA"
            else:
                buffer.clear()

            return

        if header_index > 0:
            del buffer[:header_index]

        # Header + type + 2-byte payload length.
        if len(buffer) < 5:
            return

        packet_type = buffer[2]

        payload_length = (
            buffer[3] |
            (buffer[4] << 8)
        )

        if payload_length > MAX_PACKET_SIZE:

            with stats_lock:
                stats["invalid_packets"] += 1

            print(
                f"[PACKET ERROR] Invalid length {payload_length}; "
                "resynchronizing."
            )

            del buffer[0]
            continue

        total_length = 5 + payload_length

        if len(buffer) < total_length:
            return

        payload = bytes(buffer[5:total_length])

        del buffer[:total_length]

        process_packet(packet_type, payload)


# ============================================================
# SERIAL READER THREAD
# ============================================================

def serial_reader():
    """
    Read binary packets continuously.

    Do not print raw binary audio as text. Doing so can corrupt
    packet processing and flood the console.
    """

    global running

    buffer = bytearray()

    while running:

        try:
            with serial_lock:
                if serial_port is None or not serial_port.is_open:
                    break

                waiting = serial_port.in_waiting

                # Read available bytes without blocking for
                # a large number of bytes.
                chunk = serial_port.read(
                    min(max(waiting, 1), 4096)
                )

            if not chunk:
                continue

            with stats_lock:
                stats["bytes"] += len(chunk)

            buffer.extend(chunk)

            parse_serial_buffer(buffer)

            # Guard against malformed streams growing forever.
            if len(buffer) > MAX_PACKET_SIZE + 5:
                with stats_lock:
                    stats["invalid_packets"] += 1

                print("[PACKET ERROR] Buffer overflow; resynchronizing.")

                del buffer[:-4]

        except (serial.SerialException, OSError) as exc:

            if running:
                print(f"[SERIAL ERROR] {exc}")

            break

        except Exception as exc:

            if running:
                print(f"[READER ERROR] {exc}")

            break

    print("[SERIAL] Reader stopped.")


# ============================================================
# BACKEND TELEMETRY PUBLISHER
# ============================================================

def telemetry_publisher():
    global running

    last_error_time = 0.0

    while running or not telemetry_queue.empty():
        try:
            telemetry = telemetry_queue.get(timeout=0.25)
        except queue.Empty:
            continue

        request = urllib.request.Request(
            f"{BACKEND_URL}/api/hardware/telemetry",
            data=json.dumps(telemetry).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "X-EdgeSense-Port": SERIAL_PORT,
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=1) as response:
                response.read()
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            now = time.monotonic()
            if now - last_error_time >= 10:
                print(f"[BACKEND] Telemetry upload failed: {exc}")
                last_error_time = now


def hardware_command_poller():
    last_error_time = 0.0

    while running:
        request = urllib.request.Request(
            f"{BACKEND_URL}/api/hardware/commands",
            headers={"Accept": "application/json"},
        )

        try:
            with urllib.request.urlopen(request, timeout=1) as response:
                result = json.loads(response.read().decode("utf-8"))

            for item in result.get("commands", []):
                if isinstance(item, dict):
                    send_command(item.get("command", ""))

        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            now = time.monotonic()
            if now - last_error_time >= 10:
                print(f"[BACKEND] Command polling failed: {exc}")
                last_error_time = now

        time.sleep(0.2)


# ============================================================
# VOICE COMMAND NORMALIZATION
# ============================================================

def normalize_text(text):
    """
    Normalize likely Vosk misrecognitions.

    Examples:
        'laid on' -> 'light on'
        'late on' -> 'light on'
        'right on' -> 'light on'
        'laid off' -> 'light off'

    These substitutions are only applied when the resulting
    phrase matches a supported command.
    """

    text = text.lower().strip()

    if text == "fan of":
        return "fan off"

    replacements = {
        "laid on": "light on",
        "late on": "light on",
        "lay on": "light on",
        "right on": "light on",
        "light's on": "light on",
        "light is on": "light on",

        "laid off": "light off",
        "late off": "light off",
        "lay off": "light off",
        "right off": "light off",
        "light's off": "light off",
        "light is off": "light off",

        "the fan on": "fan on",
        "fan is on": "fan on",
        "for and on": "fan on",
        "four and on": "fan on",
        "for an on": "fan on",
        "hi on": "fan on",
        "high on": "fan on",
        "fun on": "fan on",
        "fine on": "fan on",
        "phone on": "fan on",
        "find on": "fan on",
        "fan one": "fan on",
        "fan won": "fan on",
        "one on": "fan on",
        "turn on the fan": "fan on",
        "turn on fan": "fan on",
        "turn the fan on": "fan on",
        "turn fan on": "fan on",
        "switch on the fan": "fan on",
        "switch on fan": "fan on",
        "switch the fan on": "fan on",
        "switch fan on": "fan on",
        "start the fan": "fan on",
        "start fan": "fan on",
        "fan start": "fan on",
        "enable the fan": "fan on",
        "enable fan": "fan on",
        "activate the fan": "fan on",
        "activate fan": "fan on",
        "the fan off": "fan off",
        "fan is off": "fan off",
        "fan is of": "fan off",
        "one off": "fan off",
        "turn off the fan": "fan off",
        "turn off fan": "fan off",
        "turn the fan off": "fan off",
        "turn fan off": "fan off",
        "switch off the fan": "fan off",
        "switch off fan": "fan off",
        "switch the fan off": "fan off",
        "switch fan off": "fan off",
        "stop the fan": "fan off",
        "stop fan": "fan off",
        "fan stop": "fan off",
        "disable the fan": "fan off",
        "disable fan": "fan off",
        "deactivate the fan": "fan off",
        "deactivate fan": "fan off",
    }

    for incorrect, corrected in replacements.items():
        text = text.replace(incorrect, corrected)

    return text


def detect_command(text):
    """
    Return a command only when a supported phrase is detected.
    """

    normalized = normalize_text(text)

    words = normalized.split()

    if not words:
        return None

    # Avoid executing commands from arbitrary longer sentences.
    # Allow common filler words before or after the command.
    supported = {
        ("light", "on"): "LIGHT ON",
        ("light", "off"): "LIGHT OFF",
        ("fan", "on"): "FAN ON",
        ("fan", "off"): "FAN OFF",
    }

    for index in range(len(words) - 1):

        pair = tuple(words[index:index + 2])

        if pair in supported:
            return supported[pair]

    return None


# ============================================================
# RECOGNITION LOOP
# ============================================================

def voice_loop():
    global running

    print("[VOSK] Loading model...")

    if not os.path.isdir(MODEL_PATH):
        print("[ERROR] Vosk model directory not found:")
        print(MODEL_PATH)
        print("Place vosk-model-small-en-us-0.15 beside this script.")
        return

    model = Model(MODEL_PATH)

    recognizer = KaldiRecognizer(model, SAMPLE_RATE)

    print("[VOSK] Model loaded.")

    print()
    print("Listening for microphone packets...")
    print("Speak clearly in English.")
    print("Commands: light on, light off, fan on, fan off")
    print("Press Ctrl+C to stop.")
    print()

    last_partial = ""
    last_command = None
    last_command_time = 0.0

    while running:

        with audio_lock:
            if audio_queue:
                payload = audio_queue.pop(0)
            else:
                payload = None

        if payload is None:
            time.sleep(0.005)
            continue

        # Vosk requires bytes, not bytearray.
        if recognizer.AcceptWaveform(bytes(payload)):

            try:
                result = json.loads(recognizer.Result())
                text = result.get("text", "").strip()

            except json.JSONDecodeError:
                continue

            if not text:
                continue

            print(f"[YOU] {text}")

            command = detect_command(text)

            if command:

                now = time.monotonic()

                # Prevent repeated commands from one utterance.
                if (
                    command != last_command
                    or now - last_command_time > 1.5
                ):
                    print(f"[COMMAND] {command}")
                    send_command(command)

                    last_command = command
                    last_command_time = now

            last_partial = ""

        elif SHOW_PARTIAL_RESULTS:

            try:
                result = json.loads(recognizer.PartialResult())
                partial = result.get("partial", "").strip()

                if partial and partial != last_partial:
                    print(f"[PARTIAL] {partial}")
                    last_partial = partial

            except json.JSONDecodeError:
                pass


# ============================================================
# STATISTICS THREAD
# ============================================================

def statistics_loop():
    global running

    previous_bytes = 0
    previous_audio_packets = 0
    previous_telemetry_packets = 0

    while running:

        time.sleep(STATS_INTERVAL)

        if not running:
            break

        with stats_lock:
            current = dict(stats)

        bytes_rate = current["bytes"] - previous_bytes
        audio_rate = (
            current["audio_packets"] -
            previous_audio_packets
        )
        telemetry_rate = (
            current["telemetry_packets"] -
            previous_telemetry_packets
        )

        print(
            "[STATS] "
            f"bytes={current['bytes']} "
            f"audio_packets={current['audio_packets']} "
            f"audio_bytes={current['audio_bytes']} "
            f"telemetry={current['telemetry_packets']} "
            f"unknown={current['unknown_packets']} "
            f"invalid={current['invalid_packets']} "
            f"bytes_last_{STATS_INTERVAL}s={bytes_rate} "
            f"audio_packets_last_{STATS_INTERVAL}s={audio_rate} "
            f"telemetry_last_{STATS_INTERVAL}s={telemetry_rate}"
        )

        previous_bytes = current["bytes"]
        previous_audio_packets = current["audio_packets"]
        previous_telemetry_packets = current["telemetry_packets"]


# ============================================================
# MAIN
# ============================================================

def main():

    global running
    global serial_port

    print("=" * 60)
    print("                 EdgeSense Voice Bridge")
    print("=" * 60)

    print(f"[SERIAL] Opening {SERIAL_PORT} at {SERIAL_BAUD} baud...")

    try:
        serial_port = serial.Serial(
            port=SERIAL_PORT,
            baudrate=SERIAL_BAUD,
            timeout=0.05,
            write_timeout=1
        )

    except serial.SerialException as exc:
        print(f"[ERROR] Could not open {SERIAL_PORT}: {exc}")
        print("Check the ESP32 connection and close Arduino Serial Monitor.")
        return

    # Allow ESP32 serial initialization to settle.
    time.sleep(1)

    # Clear only stale input bytes, not new packets after startup.
    with serial_lock:
        serial_port.reset_input_buffer()

    reader_thread = threading.Thread(
        target=serial_reader,
        daemon=True
    )

    stats_thread = threading.Thread(
        target=statistics_loop,
        daemon=True
    )
    telemetry_thread = threading.Thread(
        target=telemetry_publisher,
        daemon=True
    )
    command_thread = threading.Thread(
        target=hardware_command_poller,
        daemon=True
    )

    reader_thread.start()
    stats_thread.start()
    telemetry_thread.start()
    command_thread.start()

    try:
        voice_loop()

    except KeyboardInterrupt:
        print("\n[EDGESENSE] Stopping...")

    finally:
        running = False

        reader_thread.join(timeout=2)
        stats_thread.join(timeout=1)
        telemetry_thread.join(timeout=2)
        command_thread.join(timeout=2)

        if serial_port is not None:
            try:
                if serial_port.is_open:
                    serial_port.close()
            except (serial.SerialException, OSError):
                pass

        with stats_lock:
            final_stats = dict(stats)

        print()
        print("=" * 60)
        print("EdgeSense final statistics")
        print("=" * 60)
        print(f"Total serial bytes: {final_stats['bytes']}")
        print(f"Audio packets: {final_stats['audio_packets']}")
        print(f"Audio payload bytes: {final_stats['audio_bytes']}")
        print(f"Telemetry packets: {final_stats['telemetry_packets']}")
        print(f"Unknown packets: {final_stats['unknown_packets']}")
        print(f"Invalid packets: {final_stats['invalid_packets']}")
        print(f"Commands sent: {final_stats['commands_sent']}")
        print("[EDGESENSE] Stopped.")


if __name__ == "__main__":
    main()