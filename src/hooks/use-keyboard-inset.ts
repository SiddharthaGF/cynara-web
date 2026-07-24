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
 * the keyboard is shown. Some engines also pan the visual viewport, so track
 * its scroll event as well. Fall back to plain `window.resize` for older APIs.
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
      // The keyboard inset equals the portion of the layout viewport below the
      // Visual viewport. Include offsetTop for browsers that pan the viewport.
      // Clamp to 0 — some desktops report a small negative delta when the
      // Visual viewport is taller than the layout viewport (DevTools).
      const delta = window.innerHeight - (vp.offsetTop + vp.height);
      setInset(delta > 0 ? Math.round(delta) : 0);
    }

    update();
    visualViewport.addEventListener('resize', update);
    visualViewport.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return (): void => {
      visualViewport.removeEventListener('resize', update);
      visualViewport.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return inset;
}
