"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";

export default function SpeechPreview({ voiceUri, rate, onVoiceChange, disabled }: {
  voiceUri: string; rate: number; onVoiceChange: (uri: string) => void; disabled: boolean;
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [supported, setSupported] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      queueMicrotask(() => setSupported(false)); return;
    }
    const synth = window.speechSynthesis;
    let active = true;
    const refresh = () => { if (active) setVoices(synth.getVoices().filter((voice) => /^ja(?:[-_]|$)/i.test(voice.lang))); };
    queueMicrotask(refresh);
    synth.addEventListener("voiceschanged", refresh);
    return () => {
      active = false; synth.removeEventListener("voiceschanged", refresh);
      if (utterance.current) {
        utterance.current.onend = null; utterance.current.onerror = null;
        synth.cancel(); utterance.current = null;
      }
    };
  }, []);

  function stop() {
    if (utterance.current) {
      utterance.current.onend = null; utterance.current.onerror = null;
      window.speechSynthesis.cancel(); utterance.current = null;
    }
    setSpeaking(false);
  }
  function preview() {
    stop(); setError("");
    const voice = voiceUri ? voices.find((item) => item.voiceURI === voiceUri) : voices[0];
    if (!voice) { setError("Selected voice is not available on this device. Please select another Japanese voice."); return; }
    try {
      const next = new SpeechSynthesisUtterance("こんにちは。面接を始めましょう。自己紹介をお願いします。");
      next.lang = "ja-JP"; next.voice = voice; next.rate = rate;
      next.onend = () => { utterance.current = null; setSpeaking(false); };
      next.onerror = () => { utterance.current = null; setSpeaking(false); setError("Unable to play voice preview. Please try again or select another voice."); };
      utterance.current = next; setSpeaking(true); window.speechSynthesis.speak(next);
    } catch { stop(); setError("Unable to play voice preview on this browser."); }
  }
  return (
    <div className="space-y-3">
      <label htmlFor="speech-voice" className="block text-sm font-semibold">Japanese Voice Synthesis (Web Speech)</label>
      <select id="speech-voice" disabled={disabled || !supported || !voices.length} value={voiceUri} onChange={(event) => { stop(); onVoiceChange(event.target.value); }} className="w-full rounded-lg border border-slate-300 p-3 text-sm disabled:opacity-50">
        <option value="">System Default Japanese Voice</option>
        {voiceUri && !voices.some((voice) => voice.voiceURI === voiceUri) && <option value={voiceUri}>Saved voice is not available on this device</option>}
        {voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}
      </select>
      {!supported ? <p role="status" className="text-sm text-amber-700">Browser does not support the Web Speech API.</p> : !voices.length && <p role="status" className="text-sm text-amber-700">No Japanese voices found. Please install a Japanese voice pack in your OS settings and reload the page.</p>}
      <p className="text-xs leading-5 text-slate-500">Preview voice depends on browser and OS speech engines. Gemini Live uses dedicated cloud AI voices.</p>
      <button type="button" disabled={disabled || !supported || !voices.length} onClick={speaking ? stop : preview} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">
        {speaking ? <Square size={16} /> : <Play size={16} />}
        {speaking ? "Stop Preview" : "Preview Japanese Voice"}
      </button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
