/** Soft two-tone chime when an AI reply finishes (no asset file). */
export function playNotificationSound(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  try {
    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0.08;
    master.connect(ctx.destination);

    const now = ctx.currentTime;
    const notes = [
      { freq: 880, start: 0, dur: 0.12 },
      { freq: 1174.66, start: 0.1, dur: 0.18 },
    ] as const;

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = note.freq;
      gain.gain.setValueAtTime(0, now + note.start);
      gain.gain.linearRampToValueAtTime(1, now + note.start + 0.015);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + note.start + note.dur,
      );
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + note.start);
      osc.stop(now + note.start + note.dur + 0.02);
    }

    window.setTimeout(() => {
      void ctx.close();
    }, 400);
  } catch {
    // Autoplay / AudioContext failures are non-fatal.
  }
}
