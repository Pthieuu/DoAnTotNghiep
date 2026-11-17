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
    if (!voice) { setError("Giọng đã chọn không có trên thiết bị này. Hãy chọn một giọng tiếng Nhật khác."); return; }
    try {
      const next = new SpeechSynthesisUtterance("こんにちは。面接を始めましょう。自己紹介をお願いします。");
      next.lang = "ja-JP"; next.voice = voice; next.rate = rate;
      next.onend = () => { utterance.current = null; setSpeaking(false); };
      next.onerror = () => { utterance.current = null; setSpeaking(false); setError("Không thể phát giọng đọc. Hãy thử lại hoặc chọn giọng khác."); };
      utterance.current = next; setSpeaking(true); window.speechSynthesis.speak(next);
    } catch { stop(); setError("Không thể phát giọng đọc trên trình duyệt này."); }
  }
  return <div className="space-y-3">
    <label htmlFor="speech-voice" className="block text-sm font-semibold">Giọng đọc tiếng Nhật (Web Speech)</label>
    <select id="speech-voice" disabled={disabled || !supported || !voices.length} value={voiceUri} onChange={(event) => { stop(); onVoiceChange(event.target.value); }} className="w-full rounded-lg border border-slate-300 p-3 text-sm disabled:opacity-50">
      <option value="">Giọng tiếng Nhật tự động</option>
      {voiceUri && !voices.some((voice) => voice.voiceURI === voiceUri) && <option value={voiceUri}>Giọng đã lưu không có trên thiết bị này</option>}
      {voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}
    </select>
    {!supported ? <p role="status" className="text-sm text-amber-700">Trình duyệt không hỗ trợ Web Speech API.</p> : !voices.length && <p role="status" className="text-sm text-amber-700">Chưa có giọng tiếng Nhật. Hãy cài giọng tiếng Nhật trong hệ điều hành rồi mở lại trang.</p>}
    <p className="text-xs leading-5 text-slate-500">Giọng nghe thử phụ thuộc trình duyệt và hệ điều hành. Giọng Gemini Live được cấu hình riêng.</p>
    <button type="button" disabled={disabled || !supported || !voices.length} onClick={speaking ? stop : preview} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">{speaking ? <Square size={16} /> : <Play size={16} />}{speaking ? "Dừng nghe thử" : "Nghe thử tiếng Nhật"}</button>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
