// src/components/BarcodeScanner.jsx
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";

export default function BarcodeScanner({ onResult, facingMode = "environment" }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const readerRef = useRef(null);

  const [err, setErr] = useState("");

  const lastCodeRef = useRef("");
  const consecutiveRef = useRef(0);
  const firingRef = useRef(false);
  const REQUIRED_HITS = 2;

  useEffect(() => {
    let cancelled = false;
    let escalated = false;
    let zoomTimer = null;
    let robustTimer = null;

    (async () => {
      setErr("");

      try {
        const warm = await navigator.mediaDevices.getUserMedia({ video: true });
        warm.getTracks().forEach(t => t.stop());
      } catch {}

      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = (all || []).filter(d => d.kind === "videoinput");
      if (!cams.length) return setErr("No hay cámaras disponibles");

      const pick = facingMode === "environment"
        ? cams.find(d => (d.label || "").toLowerCase().includes("back")) || cams[0]
        : cams.find(d => (d.label || "").toLowerCase().includes("front")) || cams[0];
      const deviceId = pick?.deviceId;

      try {
        stopStreamOnly();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 60 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        setErr("No se pudo abrir la cámara: " + (e?.message || e));
        return;
      }
      if (cancelled) return;

      await startReader({ fast: true });

      zoomTimer = setInterval(async () => {
        if (cancelled) return;
        try {
          const track = streamRef.current?.getVideoTracks?.()[0];
          const caps = track?.getCapabilities?.();
          if (!caps?.zoom) return;
          const settings = track.getSettings?.() || {};
          const { min = 1, max = 1, step = 0.2 } = caps.zoom;
          let next = (settings.zoom ?? min) + (step || 0.2);
          if (next > max) next = max;
          await track.applyConstraints({ advanced: [{ zoom: next }] });
        } catch {}
      }, 700);

      robustTimer = setTimeout(async () => {
        if (cancelled || escalated) return;
        escalated = true;

        try {
          const track = streamRef.current?.getVideoTracks?.[0];
          await track?.applyConstraints({
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
            advanced: [{ focusMode: "continuous" }],
          });
        } catch {}
        await startReader({ fast: false });
      }, 900);
    })();

    return () => {
      if (zoomTimer) clearInterval(zoomTimer);
      if (robustTimer) clearTimeout(robustTimer);
      cleanupAll();
    };

    async function startReader({ fast }) {
      try {
        readerRef.current?.reset?.();
        readerRef.current = null;

        const hints = new Map();
        const formats = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E];
        const slow = [BarcodeFormat.CODE_128, BarcodeFormat.ITF];
        hints.set(DecodeHintType.POSSIBLE_FORMATS, fast ? formats : [...formats, ...slow]);
        if (!fast) {
          hints.set(DecodeHintType.TRY_HARDER, true);
          hints.set(DecodeHintType.ALSO_INVERTED, true);
        }

        readerRef.current = new BrowserMultiFormatReader(hints, fast ? 20 : 40);

        const useContinuous = typeof readerRef.current.decodeFromVideoElementContinuously === "function";
        if (useContinuous) {
          await readerRef.current.decodeFromVideoElementContinuously(
            videoRef.current,
            (result) => handleResult(result),
            hints
          );
        } else {
          const devId = streamRef.current?.getVideoTracks?.()[0]?.getSettings?.().deviceId;
          await readerRef.current.decodeFromVideoDevice(
            devId || undefined,
            videoRef.current,
            (result) => handleResult(result)
          );
        }
      } catch (e) {
        setErr("No se pudo iniciar el lector: " + (e?.message || e));
      }
    }

    function handleResult(result) {
        if (!result) return;
        const text = result.getText();

        if (text === lastCodeRef.current) {
            consecutiveRef.current++;
        } else {
            lastCodeRef.current = text;
            consecutiveRef.current = 1;
        }

        if (consecutiveRef.current >= REQUIRED_HITS && !firingRef.current) {
            firingRef.current = true;
            onResult?.(text);

            // 🔒 detiene el lector completamente después de detectar
            try { readerRef.current?.reset?.(); } catch {}
            readerRef.current = null;
            stopStreamOnly();
        }
        }


    function stopStreamOnly() {
      try { streamRef.current?.getTracks?.().forEach(t => t.stop()); } catch {}
      streamRef.current = null;
    }
    function cleanupAll() {
      try { readerRef.current?.reset?.(); } catch {}
      readerRef.current = null;
      stopStreamOnly();
    }
  }, [facingMode, onResult]);

  return (
    <div>
      {err && <div className="msg-error" style={{ marginBottom: 8 }}>{err}</div>}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: "100%",
          maxHeight: 420,
          background: "#000",
          borderRadius: 8,
          border: "1px solid var(--border)",
          objectFit: "cover",
        }}
      />

    </div>
  );
}
