import * as React from 'react';

/**
 * Track the soft-keyboard height on devices that expose `visualViewport`.
 *
 * Returns the inset in CSS pixels that should be reserved at the bottom of
 * fixed bottom-sheets to keep content above the keyboard. Returns `0` on
 * environments without `visualViewport`, during SSR, or when the keyboard
 * isn't open.
 *
 * Mobile Safari and Android Chrome both fire `visualViewport.resize` while
 * the keyboard is shown, so listening to that event is enough. We also
 * fall back to plain `window.resize` for browsers that ship the older API.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = React.useState(0);

  React.useEffect(() => {
    const { visualViewport } = window;
    if (!visualViewport) {
      return undefined;
    }

    function update(): void {
      const vp = window.visualViewport;
      if (!vp) {
        setInset(0);
        return;
      }
      // The keyboard inset equals the difference between the layout viewport
      // (full window height) and the visual viewport (window minus overlays).
      // Clamp to 0 — some desktops report a small negative delta when the
      // Visual viewport is taller than the layout viewport (DevTools).
      const delta = window.innerHeight - vp.height;
      setInset(delta > 0 ? Math.round(delta) : 0);
    }

    update();
    visualViewport.addEventListener('resize', update);
    window.addEventListener('resize', update);
    return (): void => {
      visualViewport.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return inset;
}
