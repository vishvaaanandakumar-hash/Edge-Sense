import time
import serial

PORT = "COM9"
BAUD = 921600
DURATION_SECONDS = 5

with serial.Serial(PORT, BAUD, timeout=0.2) as ser:
    ser.reset_input_buffer()

    data = bytearray()
    deadline = time.monotonic() + DURATION_SECONDS

    while time.monotonic() < deadline:
        chunk = ser.read(4096)
        if chunk:
            data.extend(chunk)

    print(f"Bytes received: {len(data)}")
    print(f"First 64 bytes: {data[:64].hex(' ')}")
    print(f"AA 55 occurrences: {data.count(bytes([0xAA, 0x55]))}")
    print(f"Audio headers: {data.count(bytes([0xAA, 0x55, 0x01]))}")
    print(f"Telemetry headers: {data.count(bytes([0xAA, 0x55, 0x02]))}")