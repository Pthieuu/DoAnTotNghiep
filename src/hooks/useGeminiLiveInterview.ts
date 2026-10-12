import { useCallback, useEffect, useRef, useState } from "react";

type LiveState = "idle" | "connecting" | "listening" | "speaking" | "error";
type GeminiLiveServerMessage = {
  setupComplete?: unknown;
  serverContent?: {
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    modelTurn?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
    turnComplete?: boolean;
  };
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function downsampleTo16k(input: Float32Array, inputRate: number) {
  if (inputRate === 16000) return input;
  const ratio = inputRate / 16000;
  const output = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < output.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), input.length);
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    output[i] = sum / Math.max(end - start, 1);
  }
  return output;
}

function pcm16Base64(samples: Float32Array) {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true);
  }
  return bytesToBase64(new Uint8Array(buffer));
}

async function websocketFrameToText(data: string | Blob | ArrayBuffer) {
  if (typeof data === "string") return data;
  if (data instanceof Blob) return data.text();
  return new TextDecoder().decode(data);
}

export function useGeminiLiveInterview(sessionId: string | undefined) {
  const [state, setState] = useState<LiveState>("idle");
  const [candidateTranscript, setCandidateTranscript] = useState("");
  const [interviewerTranscript, setInterviewerTranscript] = useState("");
  const [error, setError] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const transcriptRef = useRef("");
  const activeRef = useRef(false);

  const stop = useCallback(() => {
    activeRef.current = false;
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    socketRef.current?.close();
    void contextRef.current?.close();
    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    socketRef.current = null;
    contextRef.current = null;
    setState("idle");
  }, []);

  const start = useCallback(async () => {
    if (!sessionId || activeRef.current) return;
    setError("");
    setCandidateTranscript("");
    setInterviewerTranscript("");
    transcriptRef.current = "";
    setState("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const tokenResponse = await fetch(`/api/interviews/${sessionId}/live-token`, { method: "POST" });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) throw new Error(tokenData.error || "Không thể kết nối Gemini Live.");

      const audioContext = new AudioContext();
      contextRef.current = audioContext;
      await audioContext.resume();
      const socket = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(tokenData.token)}`);
      socket.binaryType = "arraybuffer";
      socketRef.current = socket;
      activeRef.current = true;

      socket.onopen = () => {
        socket.send(JSON.stringify({ setup: { model: tokenData.model } }));
      };
      socket.onmessage = async (event) => {
        let message: GeminiLiveServerMessage;
        try {
          message = JSON.parse(await websocketFrameToText(event.data)) as GeminiLiveServerMessage;
        } catch (cause) {
          console.error("Could not decode Gemini Live WebSocket frame", cause);
          setError("Gemini Live gửi phản hồi không đọc được. Hãy thử kết nối lại.");
          setState("error");
          return;
        }
        if (!activeRef.current) return;
        if (message.setupComplete) {
          const input = audioContext.createMediaStreamSource(stream);
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          sourceRef.current = input;
          processorRef.current = processor;
          processor.onaudioprocess = (audioEvent) => {
            audioEvent.outputBuffer.getChannelData(0).fill(0);
            if (!activeRef.current || socket.readyState !== WebSocket.OPEN) return;
            const samples = downsampleTo16k(audioEvent.inputBuffer.getChannelData(0), audioContext.sampleRate);
            socket.send(JSON.stringify({ realtimeInput: { audio: { data: pcm16Base64(samples), mimeType: "audio/pcm;rate=16000" } } }));
          };
          input.connect(processor);
          processor.connect(audioContext.destination);
          socket.send(JSON.stringify({ realtimeInput: { text: "Begin the interview now by greeting me and asking the first planned question." } }));
          setState("listening");
        }

        const serverContent = message.serverContent;
        if (serverContent?.inputTranscription?.text) {
          const next = `${transcriptRef.current}${serverContent.inputTranscription.text}`;
          transcriptRef.current = next;
          setCandidateTranscript(next);
        }
        if (serverContent?.outputTranscription?.text) {
          setInterviewerTranscript((previous) => previous + serverContent.outputTranscription.text);
        }
        const parts = serverContent?.modelTurn?.parts || [];
        for (const part of parts) {
          if (!part.inlineData?.data || !part.inlineData.mimeType?.startsWith("audio/pcm")) continue;
          const raw = atob(part.inlineData.data);
          const samples = new Float32Array(Math.floor(raw.length / 2));
          const view = new DataView(Uint8Array.from(raw, (character) => character.charCodeAt(0)).buffer);
          for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
          const buffer = audioContext.createBuffer(1, samples.length, 24000);
          buffer.copyToChannel(samples, 0);
          const source = audioContext.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContext.destination);
          const startAt = Math.max(audioContext.currentTime, nextPlayTimeRef.current);
          source.start(startAt);
          nextPlayTimeRef.current = startAt + buffer.duration;
          setState("speaking");
          source.onended = () => { if (activeRef.current && audioContext.currentTime >= nextPlayTimeRef.current) setState("listening"); };
        }
        if (serverContent?.turnComplete && activeRef.current && !parts.some((part: { inlineData?: { data?: string } }) => part.inlineData?.data)) setState("listening");
      };
      socket.onerror = () => {
        setError("Kết nối Gemini Live bị lỗi. Hãy thử lại.");
        setState("error");
      };
      socket.onclose = () => {
        if (activeRef.current) {
          setError("Gemini Live đã ngắt kết nối.");
          setState("error");
        }
      };
    } catch (cause) {
      stop();
      const message = cause instanceof Error ? cause.message : "Không thể bắt đầu hội thoại giọng nói.";
      setError(message);
      setState("error");
    }
  }, [sessionId, stop]);

  useEffect(() => stop, [stop]);

  return { state, candidateTranscript, interviewerTranscript, error, start, stop };
}
