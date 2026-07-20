import { useCallback, useEffect, useState } from 'react';

export type DesktopResolution = 'desktop' | 'laptop' | 'tablet';

export interface DesktopResolutionSpec {
  id: DesktopResolution;
  width: number;
  height: number;
  labelKey: string;
  shortKey: string;
}

export const DESKTOP_RESOLUTIONS: readonly DesktopResolutionSpec[] = [
  { id: 'laptop', width: 1440, height: 900, labelKey: 'formPreview.resolution.laptop', shortKey: 'formPreview.resolution.laptopShort' },
  { id: 'desktop', width: 1920, height: 1080, labelKey: 'formPreview.resolution.desktop', shortKey: 'formPreview.resolution.desktopShort' },
  { id: 'tablet', width: 1024, height: 768, labelKey: 'formPreview.resolution.tablet', shortKey: 'formPreview.resolution.tabletShort' },
];

export type MobileOrientation = 'portrait' | 'landscape';

export interface MobileOrientationSpec {
  id: MobileOrientation;
  /** Logical viewport width (pt) in the requested orientation. */
  width: number;
  height: number;
  labelKey: string;
  shortKey: string;
}

export const MOBILE_ORIENTATIONS: readonly MobileOrientationSpec[] = [
  { id: 'portrait', width: 390, height: 844, labelKey: 'formPreview.rotation.portrait', shortKey: 'formPreview.rotation.portraitShort' },
  { id: 'landscape', width: 844, height: 390, labelKey: 'formPreview.rotation.landscape', shortKey: 'formPreview.rotation.landscapeShort' },
];

interface PersistedSimulator {
  resolution: DesktopResolution;
  orientation: MobileOrientation;
}

const STORAGE_KEY = 'cynara.preview.simulator';

function readPersisted(): PersistedSimulator {
  if (typeof window === 'undefined') {
    return { resolution: 'laptop', orientation: 'portrait' };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { resolution: 'laptop', orientation: 'portrait' };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedSimulator>;
    return {
      resolution:
        parsed.resolution === 'desktop' ||
        parsed.resolution === 'tablet' ||
        parsed.resolution === 'laptop'
          ? parsed.resolution
          : 'laptop',
      orientation:
        parsed.orientation === 'landscape' || parsed.orientation === 'portrait'
          ? parsed.orientation
          : 'portrait',
    };
  } catch {
    return { resolution: 'laptop', orientation: 'portrait' };
  }
}

function writePersisted(value: PersistedSimulator): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* Ignore storage failures (private mode, quota) — simulator still works in-memory. */
  }
}

interface UseDeviceSimulatorReturn {
  resolution: DesktopResolution;
  orientation: MobileOrientation;
  setResolution: (resolution: DesktopResolution) => void;
  setOrientation: (orientation: MobileOrientation) => void;
  toggleOrientation: () => void;
}

export function useDeviceSimulator(): UseDeviceSimulatorReturn {
  const [state, setState] = useState<PersistedSimulator>(() => readPersisted());

  useEffect(() => {
    writePersisted(state);
  }, [state]);

  const setResolution = useCallback((resolution: DesktopResolution) => {
    setState((prev) => (prev.resolution === resolution ? prev : { ...prev, resolution }));
  }, []);

  const setOrientation = useCallback((orientation: MobileOrientation) => {
    setState((prev) => (prev.orientation === orientation ? prev : { ...prev, orientation }));
  }, []);

  const toggleOrientation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      orientation: prev.orientation === 'portrait' ? 'landscape' : 'portrait',
    }));
  }, []);

  return {
    resolution: state.resolution,
    orientation: state.orientation,
    setResolution,
    setOrientation,
    toggleOrientation,
  };
}

export function getDesktopResolution(id: DesktopResolution): DesktopResolutionSpec {
  return DESKTOP_RESOLUTIONS.find((spec) => spec.id === id) ?? DESKTOP_RESOLUTIONS[0];
}

export function getMobileOrientation(id: MobileOrientation): MobileOrientationSpec {
  return MOBILE_ORIENTATIONS.find((spec) => spec.id === id) ?? MOBILE_ORIENTATIONS[0];
}