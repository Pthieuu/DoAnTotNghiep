import { useState, useEffect, useCallback, useRef } from "react";

export function useSpeechRecognition(language: string = "vi-VN") {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói. Hãy dùng Chrome hoặc Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language.toLowerCase().includes("ja") ? "ja-JP" : "vi-VN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(prev => prev + (prev && !prev.endsWith(" ") ? " " : "") + currentTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error !== "no-speech") {
        setError(`Lỗi mic: ${event.error}`);
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        setTranscript("");
        setError(null);
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Cannot start recognition", e);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (e) {
        console.error("Cannot stop recognition", e);
      }
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return {
    transcript,
    setTranscript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    error,
    isSupported: !!recognitionRef.current
  };
}
