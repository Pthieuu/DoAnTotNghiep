import { useCallback, useEffect, useRef, useState } from "react";

type LiveState = "idle" | "connecting" | "listening" | "speaking" | "error";
type GeminiLiveServerMessage = {
  setupComplete?: unknown;
  error?: { message?: string; code?: number; status?: string };
  serverContent?: {
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    modelTurn?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
    turnComplete?: boolean;
    interrupted?: boolean;
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

export function useGeminiLiveInterview(sessionId: string | undefined, questionIndex: number, questionText: string | undefined) {
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
  const generationRef = useRef(0);
  const tokenAbortRef = useRef<AbortController | null>(null);
  const playbackRef = useRef(new Set<AudioBufferSourceNode>());

  const clearPlayback = useCallback(() => {
    for (const source of playbackRef.current) {
      source.onended = null;
      source.stop();
      source.disconnect();
    }
    playbackRef.current.clear();
    nextPlayTimeRef.current = 0;
  }, []);

  const stop = useCallback(() => {
    activeRef.current = false;
    generationRef.current += 1;
    tokenAbortRef.current?.abort();
    tokenAbortRef.current = null;
    clearPlayback();
    if (processorRef.current) processorRef.current.onaudioprocess = null;
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (socketRef.current) {
      socketRef.current.onopen = null;
      socketRef.current.onmessage = null;
      socketRef.current.onerror = null;
      socketRef.current.onclose = null;
      socketRef.current.close();
    }
    void contextRef.current?.close().catch(() => {});
    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    socketRef.current = null;
    contextRef.current = null;
    setState("idle");
  }, [clearPlayback]);

  const start = useCallback(async () => {
    if (!sessionId || !questionText || activeRef.current) return;
    // Reserve the connection before the first await, including permission/token waits.
    activeRef.current = true;
    const generation = ++generationRef.current;
    const isCurrent = () => activeRef.current && generationRef.current === generation;
    const abort = new AbortController();
    tokenAbortRef.current = abort;
    const fail = (message: string) => {
      if (!isCurrent()) return;
      stop();
      setError(message);
      setState("error");
    };
    setError("");
    setCandidateTranscript("");
    setInterviewerTranscript("");
    transcriptRef.current = "";
    setState("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      if (!isCurrent()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const tokenResponse = await fetch(`/api/interviews/${sessionId}/live-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIndex, questionText }),
        signal: abort.signal,
      });
      const tokenData = await tokenResponse.json();
      if (!isCurrent()) return;
      if (!tokenResponse.ok) throw new Error(tokenData.error || "Không thể kết nối Gemini Live.");

      if (tokenData.questionIndex !== questionIndex || tokenData.questionText !== questionText) {
        throw new Error("Câu hỏi không còn đồng bộ. Hãy tải lại trang để tiếp tục.");
      }

      const audioContext = new AudioContext();
      contextRef.current = audioContext;
      await audioContext.resume();
      if (!isCurrent()) return;
      const socket = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(tokenData.token)}`);
      socket.binaryType = "arraybuffer";
      socketRef.current = socket;

      socket.onopen = () => {
        if (!isCurrent()) return;
        socket.send(JSON.stringify({ setup: { model: tokenData.model } }));
      };
      let setupReceived = false;
      let modelTurnActive = true;
      let micReadyAt = Infinity;
      const finishPlayback = () => {
        if (!isCurrent() || modelTurnActive || playbackRef.current.size) return;
        // Leave a short tail so room/speaker echo is not captured as a new answer.
        micReadyAt = audioContext.currentTime + 0.25;
        setState("listening");
      };
      const beginMicInput = () => {
        const input = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        sourceRef.current = input;
        processorRef.current = processor;
        processor.onaudioprocess = (audioEvent) => {
          audioEvent.outputBuffer.getChannelData(0).fill(0);
          if (!isCurrent() || socket.readyState !== WebSocket.OPEN) return;
          const samples = downsampleTo16k(audioEvent.inputBuffer.getChannelData(0), audioContext.sampleRate);
          // Keep the input clock/VAD running with silence while the interviewer speaks.
          if (modelTurnActive || playbackRef.current.size || audioContext.currentTime < micReadyAt) samples.fill(0);
          socket.send(JSON.stringify({ realtimeInput: { audio: { data: pcm16Base64(samples), mimeType: "audio/pcm;rate=16000" } } }));
        };
        input.connect(processor);
        processor.connect(audioContext.destination);
      };

      socket.onmessage = async (event) => {
        let message: GeminiLiveServerMessage;
        try {
          message = JSON.parse(await websocketFrameToText(event.data)) as GeminiLiveServerMessage;
        } catch (cause) {
          console.error("Could not decode Gemini Live WebSocket frame", cause);
          fail("Gemini Live gửi phản hồi không đọc được. Hãy thử kết nối lại.");
          return;
        }
        if (!isCurrent()) return;
        if (message.error) {
          const detail = message.error.message || message.error.status || "Lỗi từ Gemini Live.";
          console.error("Gemini Live server error", { code: message.error.code, detail });
          fail(`Gemini Live: ${detail}`);
          return;
        }
        if (message.setupComplete && !setupReceived) {
          setupReceived = true;
          beginMicInput();
          socket.send(JSON.stringify({
            clientContent: {
              turns: [{ role: "user", parts: [{ text: `Read this current interview question verbatim, without adding any other question or introduction, then wait for my answer: ${JSON.stringify(tokenData.questionText)}` }] }],
              turnComplete: true,
            },
          }));
        }

        const serverContent = message.serverContent;
        if (serverContent?.interrupted) {
          clearPlayback();
          modelTurnActive = false;
          finishPlayback();
        }
        if (serverContent?.modelTurn && !serverContent.interrupted) {
          modelTurnActive = true;
          micReadyAt = Infinity;
        }
        if (serverContent?.inputTranscription?.text) {
          const next = `${transcriptRef.current}${serverContent.inputTranscription.text}`;
          transcriptRef.current = next;
          setCandidateTranscript(next);
        }
        const outputText = serverContent?.outputTranscription?.text;
        if (outputText) {
          setInterviewerTranscript((previous) => previous + outputText);
        }
        const parts = serverContent?.interrupted ? [] : serverContent?.modelTurn?.parts || [];
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
          playbackRef.current.add(source);
          source.start(startAt);
          nextPlayTimeRef.current = startAt + buffer.duration;
          setState("speaking");
          source.onended = () => {
            source.disconnect();
            if (!isCurrent()) return;
            playbackRef.current.delete(source);
            finishPlayback();
          };
        }
        if (serverContent?.turnComplete) {
          modelTurnActive = false;
          finishPlayback();
        }
      };
      socket.onerror = () => fail("Kết nối Gemini Live bị lỗi. Hãy thử lại.");
      socket.onclose = () => fail("Gemini Live đã ngắt kết nối.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Không thể bắt đầu hội thoại giọng nói.";
      fail(message);
    }
  }, [sessionId, questionIndex, questionText, stop, clearPlayback]);

  useEffect(() => stop, [sessionId, questionIndex, questionText, stop]);

  return { state, candidateTranscript, interviewerTranscript, error, start, stop };
}
