/** Soft two-tone chime when an AI reply finishes (no asset file). */
export function playNotificationSound(): void {
  playTones(
    [
      { frequency: 880, start: 0, duration: 0.12, type: 'sine' },
      { frequency: 1174.66, start: 0.1, duration: 0.18, type: 'sine' },
    ],
    0.08,
  );
}

/** Gentle descending alert reserved for failed AI replies. */
export function playErrorNotificationSound(): void {
  playTones(
    [
      { frequency: 440, start: 0, duration: 0.16, type: 'triangle' },
      { frequency: 329.63, start: 0.12, duration: 0.24, type: 'triangle' },
    ],
    0.07,
  );
}

interface NotificationTone {
  frequency: number;
  start: number;
  duration: number;
  type: OscillatorType;
}

function playTones(notes: readonly NotificationTone[], volume: number): void {
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
    master.gain.value = volume;
    master.connect(ctx.destination);

    const now = ctx.currentTime;
    let endsAt = 0;
    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteEndsAt = note.start + note.duration;
      endsAt = Math.max(endsAt, noteEndsAt);
      osc.type = note.type;
      osc.frequency.value = note.frequency;
      gain.gain.setValueAtTime(0, now + note.start);
      gain.gain.linearRampToValueAtTime(1, now + note.start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + noteEndsAt);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + note.start);
      osc.stop(now + noteEndsAt + 0.02);
    }

    window.setTimeout(
      () => {
        void ctx.close();
      },
      Math.ceil((endsAt + 0.1) * 1000),
    );
  } catch {
    // Autoplay / AudioContext failures are non-fatal.
  }
}
