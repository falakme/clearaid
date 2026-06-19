"use client";

import { useEffect, useRef, useState } from "react";

const BAR_COUNT = 28;
const IDLE = new Array(BAR_COUNT).fill(0.08);

/**
 * Live microphone level meter for the voice visualizer.
 *
 * When `active`, requests mic access and drives a `BAR_COUNT`-length array of
 * normalized levels (0..1) from the Web Audio API's frequency data. If mic
 * access is denied or unavailable, it falls back to a smooth animated
 * waveform so the UI never looks frozen. All resources are torn down when
 * `active` flips off or the component unmounts.
 */
export function useAudioLevels(active: boolean): number[] {
  const [levels, setLevels] = useState<number[]>(IDLE);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    let cancelled = false;

    const startFallback = () => {
      let tick = 0;
      const loop = () => {
        tick += 0.16;
        setLevels(
          Array.from({ length: BAR_COUNT }, (_, i) =>
            Math.min(1, 0.18 + 0.55 * Math.abs(Math.sin(tick + i * 0.45)) * (0.6 + Math.random() * 0.4)),
          ),
        );
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    };

    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new Ctx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          analyser.getByteFrequencyData(data);
          const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
            const idx = Math.floor((i / BAR_COUNT) * (data.length * 0.7));
            return Math.max(0.08, data[idx] / 255);
          });
          setLevels(bars);
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      })
      .catch(() => {
        if (!cancelled) startFallback();
      });

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      setLevels(IDLE);
    };
  }, [active]);

  return levels;
}
