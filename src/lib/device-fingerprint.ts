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
  // Enhanced fields
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  deviceType: string;
  connectionType: string;
  effectiveType: string;
  cores: number;
  screenDpr: number;
  vendor: string;
  isOnline: boolean;
  cookieEnabled: boolean;
  doNotTrack: string | null;
}

/**
 * Parse a user agent string into structured browser/OS info.
 */
function parseUA(ua: string): { browserName: string; browserVersion: string; osName: string; osVersion: string } {
  let browserName = 'Unknown';
  let browserVersion = '';
  let osName = 'Unknown';
  let osVersion = '';

  if (!ua) return { browserName, browserVersion, osName, osVersion };

  // Browser detection
  if (ua.includes('Firefox/')) {
    browserName = 'Firefox';
    browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || '';
  } else if (ua.includes('Edg/')) {
    browserName = 'Edge';
    browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] || '';
  } else if (ua.includes('OPR/') || ua.includes('Opera/')) {
    browserName = 'Opera';
    browserVersion = ua.match(/(?:OPR|Opera)\/([\d.]+)/)?.[1] || '';
  } else if (ua.includes('Chrome/')) {
    browserName = 'Chrome';
    browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || '';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browserName = 'Safari';
    browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || '';
  } else if (ua.includes('UCBrowser/')) {
    browserName = 'UC Browser';
    browserVersion = ua.match(/UCBrowser\/([\d.]+)/)?.[1] || '';
  } else if (ua.includes('SamsungBrowser/')) {
    browserName = 'Samsung Internet';
    browserVersion = ua.match(/SamsungBrowser\/([\d.]+)/)?.[1] || '';
  } else if (ua.includes('MiuiBrowser/')) {
    browserName = 'MIUI Browser';
    browserVersion = ua.match(/MiuiBrowser\/([\d.]+)/)?.[1] || '';
  }

  // OS detection
  if (ua.includes('Windows NT 10')) {
    osName = 'Windows';
    osVersion = '10/11';
  } else if (ua.includes('Windows NT 6.3')) {
    osName = 'Windows';
    osVersion = '8.1';
  } else if (ua.includes('Windows NT 6.1')) {
    osName = 'Windows';
    osVersion = '7';
  } else if (ua.includes('Windows')) {
    osName = 'Windows';
    osVersion = '';
  } else if (ua.includes('Mac OS X')) {
    osName = 'macOS';
    osVersion = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') || '';
  } else if (ua.includes('Android')) {
    osName = 'Android';
    osVersion = ua.match(/Android ([\d.]+)/)?.[1] || '';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    osName = ua.includes('iPad') ? 'iPadOS' : 'iOS';
    osVersion = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') || '';
  } else if (ua.includes('Linux')) {
    osName = 'Linux';
    osVersion = '';
  } else if (ua.includes('CrOS')) {
    osName = 'Chrome OS';
    osVersion = '';
  }

  return { browserName, browserVersion, osName, osVersion };
}

/**
 * Determine the device type from screen size + user agent hints.
 */
function detectDeviceType(ua: string, screenWidth: number, touchSupport: boolean): string {
  if (/iPad|tablet/i.test(ua) || (touchSupport && screenWidth >= 768 && screenWidth <= 1366)) {
    return 'Tablet';
  }
  if (/Mobile|Android(?!.*(?:Tab|TV))|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return 'Mobile';
  }
  if (screenWidth <= 768 && touchSupport) {
    return 'Mobile';
  }
  return 'Desktop';
}

export function getDeviceInfo(): DeviceInfo {
  const nav = navigator as Record<string, unknown>;
  const ua = navigator.userAgent;
  const parsed = parseUA(ua);
  const conn = (nav.connection || nav.mozConnection || nav.webkitConnection) as {
    effectiveType?: string;
    type?: string;
  } | undefined;

  return {
    userAgent: ua,
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
    // Enhanced fields
    browserName: parsed.browserName,
    browserVersion: parsed.browserVersion,
    osName: parsed.osName,
    osVersion: parsed.osVersion,
    deviceType: detectDeviceType(ua, window.screen.width, 'ontouchstart' in window || navigator.maxTouchPoints > 0),
    connectionType: conn?.type || 'unknown',
    effectiveType: conn?.effectiveType || 'unknown',
    cores: navigator.hardwareConcurrency || 0,
    screenDpr: window.devicePixelRatio || 1,
    vendor: (nav.vendor as string) || 'unknown',
    isOnline: navigator.onLine,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
  };
}

/**
 * Generate a stable fingerprint hash from the *core* device info fields only.
 * This ensures the fingerprint doesn't change when non-essential fields shift
 * (e.g. online status, battery), while still being unique per device.
 */
export async function generateFingerprint(info: DeviceInfo): Promise<string> {
  // Only use stable fields for the hash — skip volatile ones
  const stableFields = {
    userAgent: info.userAgent,
    language: info.language,
    platform: info.platform,
    screenWidth: info.screenWidth,
    screenHeight: info.screenHeight,
    colorDepth: info.colorDepth,
    deviceMemory: info.deviceMemory,
    hardwareConcurrency: info.hardwareConcurrency,
    timezone: info.timezone,
    touchSupport: info.touchSupport,
  };
  const data = JSON.stringify(stableFields);
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
