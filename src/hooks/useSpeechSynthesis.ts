import { useState, useEffect, useCallback } from "react";

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const updateVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback((text: string, language: string = "vi-VN") => {
    if (!window.speechSynthesis) {
      console.warn("Speech Synthesis API not supported.");
      return;
    }

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose appropriate voice
    const availableVoices = window.speechSynthesis.getVoices();
    const targetLang = language.toLowerCase().includes("ja") ? "ja-JP" : "vi-VN";
    const voice = availableVoices.find(v => v.lang.includes(targetLang)) || 
                  availableVoices.find(v => v.lang.startsWith(targetLang.split('-')[0])) ||
                  availableVoices[0];
    
    if (voice) {
      utterance.voice = voice;
    }
    utterance.lang = targetLang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error("Speech synthesis error", e);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const cancel = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return { speak, cancel, isSpeaking, voices };
}
