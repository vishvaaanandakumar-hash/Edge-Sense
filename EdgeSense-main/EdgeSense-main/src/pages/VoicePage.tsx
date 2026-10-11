import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Mic, MicOff, Radio, Thermometer, Volume2, WifiOff, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNotificationStore, useSensorStore, useSystemStore } from '@/store';
import api from '@/utils/api';
import type { VoiceCommand } from '@/types';

interface SpeechRecognitionEventLike extends Event {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}

type ParsedCommand = { label: string; deviceId?: string; command?: string; speed?: number; query?: 'temperature' | 'humidity' | 'presence' };

const parseCommand = (transcript: string): ParsedCommand | null => {
  const text = transcript.toLowerCase().trim();
  if (/turn on (the )?(room )?light|light on/.test(text)) return { label: 'Turn on room light', deviceId: 'light-1', command: 'on' };
  if (/turn off (the )?(room )?light|light off/.test(text)) return { label: 'Turn off room light', deviceId: 'light-1', command: 'off' };
  if (/set (the )?fan speed to ([1-5])/.test(text)) {
    const speed = Number(text.match(/to ([1-5])/)?.[1] || 1);
    return { label: `Set fan speed to ${speed}`, deviceId: 'fan-1', command: 'on', speed };
  }
  if (/turn off (the )?fan|fan off/.test(text)) return { label: 'Turn off fan', deviceId: 'fan-1', command: 'off', speed: 0 };
  if (/temperature/.test(text)) return { label: 'Read room temperature', query: 'temperature' };
  if (/humidity/.test(text)) return { label: 'Read room humidity', query: 'humidity' };
  if (/anyone|presence|in the room/.test(text)) return { label: 'Check room presence', query: 'presence' };
  return null;
};

const VoicePage: React.FC = () => {
  const { sensors } = useSensorStore();
  const { demoMode } = useSystemStore();
  const { addNotification } = useNotificationStore();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<VoiceCommand[]>([]);

  useEffect(() => {
    api.getVoiceHistory().then((response) => setHistory(response.data || [])).catch(() => {});
    const speechWindow = window as SpeechRecognitionWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setSupported(false);
      return;
    }
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const nextTranscript = event.results[0][0].transcript;
      setTranscript(nextTranscript);
      void executeCommand(nextTranscript);
    };
    recognition.onerror = () => {
      setError('Microphone recognition failed. Check browser permission and try again.');
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, []);

  const executeCommand = async (spokenText: string) => {
    const parsed = parseCommand(spokenText);
    const base: VoiceCommand = {
      id: Date.now(), transcript: spokenText, matched_command: parsed?.label || 'Unrecognised command',
      confidence: parsed ? 0.92 : 0.2, executed: false, result: '', timestamp: new Date().toISOString(),
    };
    if (!parsed) {
      setHistory((current) => [ { ...base, result: 'No safe command matched.' }, ...current ]);
      addNotification({ title: 'Voice command not recognized', message: 'No safe device or sensor intent matched that phrase.', type: 'warning' });
      return;
    }
    if (parsed.query) {
      const reading = sensors[parsed.query];
      const result = reading
        ? parsed.query === 'presence' ? (reading.value > 0 ? 'Someone is in the room.' : 'The room is clear.') : `${reading.value} ${reading.unit}`
        : 'No current sensor reading is available.';
      setHistory((current) => [{ ...base, executed: true, result }, ...current]);
      addNotification({ title: parsed.label, message: result, type: 'info' });
      return;
    }
    try {
      const response = await api.controlDevice(parsed.deviceId || '', parsed.command || 'off', parsed.speed === undefined ? undefined : { speed: parsed.speed });
      const state = response.data?.state || parsed.command;
      setHistory((current) => [{ ...base, executed: true, result: `${parsed.label} acknowledged (${state}).` }, ...current]);
      addNotification({ title: 'Device command acknowledged', message: `${parsed.label} completed locally.`, type: 'success' });
    } catch {
      setHistory((current) => [{ ...base, result: 'Device command failed because the backend is unavailable.' }, ...current]);
      addNotification({ title: 'Device command failed', message: 'The local backend did not acknowledge the command.', type: 'error' });
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    setError('');
    if (isListening) recognitionRef.current.stop();
    else {
      setTranscript('');
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  return (
    <div className="es-page">
      <div className="es-page-header">
        <div className="es-badge es-badge-orange"><Radio size={14} /> Local command engine</div>
        <h1 className="es-page-title">Offline Voice Assistant</h1>
        <p className="es-page-subtitle">Use cautious local voice commands to inspect the room or control supported devices.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.8fr) minmax(320px, 1.2fr)', gap: '1rem' }}>
        <section className="es-card" id="voice-control-panel" style={{ textAlign: 'center', minHeight: 360 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            <span>{supported ? 'Browser speech input' : 'Speech input unavailable'}</span>
            <span>{demoMode ? 'SIMULATED DEVICES' : 'HARDWARE MODE'}</span>
          </div>
          <motion.div animate={isListening ? { scale: [1, 1.08, 1] } : { scale: 1 }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ width: 112, height: 112, margin: '3rem auto 1rem', borderRadius: '50%', background: isListening ? 'var(--es-orange-glow-strong)' : 'var(--bg-hover)', border: `1px solid ${isListening ? 'var(--es-orange)' : 'var(--border-primary)'}`, display: 'grid', placeItems: 'center', color: isListening ? 'var(--es-orange)' : 'var(--text-tertiary)' }}>
            {isListening ? <Mic size={42} /> : <MicOff size={42} />}
          </motion.div>
          <h3>{isListening ? 'Listening...' : 'Ready for a command'}</h3>
          <p style={{ color: 'var(--text-secondary)', minHeight: 28 }}>{transcript || 'Try “turn on room light” or “what is the temperature?”'}</p>
          <button id="voice-listen-toggle" className="es-btn es-btn-primary" onClick={toggleListening} disabled={!supported}>
            {isListening ? <><MicOff size={16} /> Stop listening</> : <><Mic size={16} /> Start listening</>}
          </button>
          {error && <div className="es-badge es-badge-error" style={{ marginTop: '1rem' }}><XCircle size={14} /> {error}</div>}
        </section>
        <section className="es-card" id="voice-status-panel">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}><Volume2 size={18} color="var(--es-orange)" /> Supported commands</h3>
          <div className="es-grid-2" style={{ gap: '0.5rem' }}>
            {['Turn on/off room light', 'Set fan speed to 3', 'Turn off fan', 'Read temperature', 'Read humidity', 'Check presence'].map((item) => <div key={item} style={{ padding: '0.7rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{item}</div>)}
          </div>
          <div style={{ marginTop: '1.5rem', padding: '0.9rem', background: 'var(--es-info-glow)', color: 'var(--es-info)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem' }}><WifiOff size={14} /> Recognition stays in the browser when supported. Commands are only sent to the local backend after a safe intent match.</div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}><span><Thermometer size={14} /> {sensors.temperature ? `${sensors.temperature.value} °C` : 'No temperature'}</span><span>{sensors.presence?.value ? 'Occupied' : 'Clear'}</span></div>
        </section>
      </div>
      <section className="es-card" id="voice-command-history" style={{ marginTop: '1rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Command history</h3>
        {history.length === 0 ? <p style={{ color: 'var(--text-tertiary)' }}>No commands recorded yet.</p> : history.slice(0, 10).map((item) => <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', padding: '0.7rem 0', borderBottom: '1px solid var(--border-subtle)' }}><div><strong>{item.transcript}</strong><div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{item.result}</div></div><span className={`es-badge ${item.executed ? 'es-badge-success' : 'es-badge-error'}`}>{item.executed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}{item.executed ? 'Executed' : 'Not executed'}</span></div>)}
      </section>
    </div>
  );
};

export default VoicePage;