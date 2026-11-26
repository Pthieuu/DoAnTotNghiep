"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

export default function MicTester() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const session = useRef<{ stop: () => void }>({ stop() {} });
  const generation = useRef(0);

  useEffect(() => {
    let alive = true;
    const lifecycle = generation;
    const media = navigator.mediaDevices;
    if (!media?.enumerateDevices || !media.getUserMedia || !window.AudioContext) return;
    const refresh = async () => {
      try {
        const list = await media.enumerateDevices();
        if (alive) setDevices(list.filter((device) => device.kind === "audioinput"));
      } catch { if (alive) setError("Unable to enumerate microphone devices. Check browser permissions."); }
    };
    void refresh();
    media.addEventListener("devicechange", refresh);
    return () => {
      alive = false; lifecycle.current++; session.current.stop();
      media.removeEventListener("devicechange", refresh);
    };
  }, []);

  function stop() {
    generation.current++; session.current.stop(); setStatus("idle");
  }

  async function start() {
    stop(); setError("");
    if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices.enumerateDevices || !window.AudioContext) {
      setError("Browser does not support microphone testing. Please use a modern browser over HTTPS or localhost."); return;
    }
    const token = ++generation.current;
    let stream: MediaStream | undefined;
    let context: AudioContext | undefined;
    let frame = 0;
    let source: MediaStreamAudioSourceNode | undefined;
    let analyser: AnalyserNode | undefined;
    const dispose = () => {
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => { track.onended = null; track.stop(); });
      source?.disconnect(); analyser?.disconnect();
      if (context && context.state !== "closed") void context.close().catch(() => {});
      const drawing = canvas.current?.getContext("2d");
      if (drawing && canvas.current) drawing.clearRect(0, 0, canvas.current.width, canvas.current.height);
    };
    session.current = { stop: dispose };
    setStatus("requesting");
    try {
      context = new AudioContext();
      const resumed = context.resume();
      void resumed.catch(() => {});
      stream = await navigator.mediaDevices.getUserMedia({ audio: selected ? { deviceId: { exact: selected } } : true });
      if (token !== generation.current) { dispose(); return; }
      await resumed;
      if (token !== generation.current) { dispose(); return; }
      source = context.createMediaStreamSource(stream);
      analyser = context.createAnalyser(); analyser.fftSize = 256;
      source.connect(analyser);
      stream.getAudioTracks().forEach((track) => { track.onended = () => { stop(); setError("Microphone disconnected. Please reconnect your device and try again."); }; });
      const samples = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        if (token !== generation.current || !analyser) return;
        analyser.getByteFrequencyData(samples);
        const target = canvas.current;
        const drawing = target?.getContext("2d");
        if (target && drawing) {
          drawing.clearRect(0, 0, target.width, target.height);
          drawing.fillStyle = "#0f766e";
          for (let i = 0; i < 32; i++) {
            const height = Math.max(2, samples[i * 4] / 255 * target.height);
            drawing.fillRect(i * target.width / 32, (target.height - height) / 2, target.width / 32 - 4, height);
          }
        }
        frame = requestAnimationFrame(draw);
      };
      setStatus("testing"); draw();
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        if (token === generation.current) setDevices(list.filter((device) => device.kind === "audioinput"));
      } catch { /* Testing remains available even if enumeration fails. */ }
    } catch (cause) {
      dispose();
      if (token !== generation.current) return;
      setStatus("idle");
      const name = cause && typeof cause === "object" && "name" in cause ? cause.name : "";
      setError(name === "NotAllowedError" || name === "SecurityError"
        ? "Microphone access denied. Please allow microphone permissions in your browser settings. Quyền micro bị từ chối."
        : name === "NotFoundError" || name === "OverconstrainedError"
          ? "Selected microphone not found. Please choose another device or system default."
          : "Unable to open microphone. The device may be in use by another application. Please try again.");
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-bold text-primary">Microphone Test</h2>
      <p className="mt-1 text-sm text-slate-500">Speak into your microphone to verify audio input levels. Audio is processed locally and never recorded or uploaded.</p>
      <label htmlFor="test-microphone" className="mt-5 block text-sm font-semibold">Input Device</label>
      <select id="test-microphone" value={selected} onChange={(event) => { stop(); setSelected(event.target.value); setError(""); }} className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm">
        <option value="">System Default Microphone</option>
        {selected && !devices.some((device) => device.deviceId === selected) && <option value={selected}>Disconnected Device</option>}
        {devices.filter((device) => device.deviceId).map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>)}
      </select>
      <p className="mt-2 text-xs text-slate-500">Device names appear after granting microphone permissions.</p>
      <canvas ref={canvas} width={640} height={80} role="img" aria-label="Microphone input level visualizer" className="my-4 h-20 w-full rounded-xl bg-slate-50" />
      <p role="status" className="mb-3 text-sm text-slate-600">
        {status === "testing" ? "Microphone active — speak to test input levels. Micro đang hoạt động" : status === "requesting" ? "Requesting microphone access…" : "Microphone idle."}
      </p>
      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
      <button type="button" onClick={status === "idle" ? start : stop} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">
        {status === "idle" ? <Mic size={16} /> : <Square size={16} />}
        {status === "idle" ? "Test Microphone" : "Stop Test"}
      </button>
    </section>
  );
}
