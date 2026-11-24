export interface FeatureFlags {
  advancedMath: boolean;
  beaconGuardML: boolean;
  editGuardML: boolean;
  mediaPipeTasks: boolean;
  deepScanSpeech: boolean;
  hardenedSanitizer: boolean;
  workerPool: boolean;
}

export const FEATURES: FeatureFlags = {
  advancedMath: true,
  beaconGuardML: true,
  editGuardML: true,
  mediaPipeTasks: true,
  deepScanSpeech: false, // Explicit opt-in per prompt
  hardenedSanitizer: true,
  workerPool: true,
};

export function getFeatureFlag(key: keyof FeatureFlags): boolean {
  if (typeof window !== 'undefined' && (window as any).__ECHO_FLAGS__?.[key] !== undefined) {
    return Boolean((window as any).__ECHO_FLAGS__[key]);
  }
  return FEATURES[key];
}

export function setFeatureFlag(key: keyof FeatureFlags, value: boolean): void {
  if (typeof window !== 'undefined') {
    (window as any).__ECHO_FLAGS__ = {
      ...((window as any).__ECHO_FLAGS__ || {}),
      [key]: value,
    };
  }
}
