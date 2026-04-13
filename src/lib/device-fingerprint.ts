/**
 * Generates a device fingerprint from browser properties.
 * This is used to lock access tokens to a single device.
 * NOT cryptographically secure — just a reasonable fingerprint for device locking.
 */

export interface DeviceInfo {
  userAgent: string;
  language: string;
  languages: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  deviceMemory: number;
  hardwareConcurrency: number;
  timezone: string;
  touchSupport: boolean;
}

export function getDeviceInfo(): DeviceInfo {
  const nav = navigator as Record<string, unknown>;
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages?.join(',') || navigator.language,
    platform: navigator.platform || (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform || 'unknown',
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    colorDepth: window.screen.colorDepth,
    deviceMemory: (nav.deviceMemory as number) || 0,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
  };
}

export async function generateFingerprint(info: DeviceInfo): Promise<string> {
  const data = JSON.stringify(info);
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

/**
 * Get or create a stored device fingerprint.
 * Uses localStorage to persist across sessions.
 */
export async function getStoredFingerprint(): Promise<string> {
  const STORAGE_KEY = 'pstream_device_fp';
  const INFO_KEY = 'pstream_device_info';

  // Check if we already have a stored fingerprint
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  }

  // Generate new fingerprint
  const info = getDeviceInfo();
  const fingerprint = await generateFingerprint(info);

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, fingerprint);
    localStorage.setItem(INFO_KEY, JSON.stringify(info));
  }

  return fingerprint;
}

export function getStoredDeviceInfo(): DeviceInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('pstream_device_info');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
