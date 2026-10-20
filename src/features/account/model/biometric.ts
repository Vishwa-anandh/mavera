import { useEffect, useState } from 'react';

const KEY_PREFIX = 'mavera.biometric.';

type PlatformCredential = { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> };
const credentialApi = (): PlatformCredential | undefined =>
  typeof window === 'undefined' ? undefined : (window as { PublicKeyCredential?: PlatformCredential }).PublicKeyCredential;

/** True when the browser exposes WebAuthn at all (the cheap, synchronous check). */
export function biometricSupported(): boolean {
  return credentialApi() !== undefined;
}

export function readBiometricPreference(userKey: string): boolean {
  try {
    return localStorage.getItem(`${KEY_PREFIX}${userKey}`) === 'on';
  } catch {
    return false;
  }
}

export function writeBiometricPreference(userKey: string, enabled: boolean): void {
  try {
    localStorage.setItem(`${KEY_PREFIX}${userKey}`, enabled ? 'on' : 'off');
  } catch {
    // Not remembered; the switch still reflects this visit.
  }
}

/**
 * Whether this device can do platform biometrics. Starts from the synchronous WebAuthn check, then
 * asks the browser whether a built-in authenticator (Face ID, fingerprint, Windows Hello) exists.
 * This is only a capability probe: no credential is created anywhere in this prototype.
 */
export function useBiometricAvailability(): boolean {
  const [available, setAvailable] = useState(biometricSupported);
  useEffect(() => {
    const probe = credentialApi()?.isUserVerifyingPlatformAuthenticatorAvailable;
    if (!probe) return;
    let cancelled = false;
    probe
      .call(credentialApi())
      .then((ok) => {
        if (!cancelled) setAvailable(Boolean(ok));
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return available;
}
