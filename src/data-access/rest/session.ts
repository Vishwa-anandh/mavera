import axios from 'axios';
import { apiBaseUrl } from '../../app/config/environment';

/**
 * Asks the API whether a bearer token is accepted, without the shared client's
 * interceptors. Deliberately a bare axios call: on an expired subscription the
 * API answers 403, and the shared client would redirect to /subscription-expired
 * again, looping the page that is probing for the renewal.
 */
export function probeSession(token: string): Promise<void> {
  return axios
    .get(`${apiBaseUrl ?? ''}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
    .then(() => undefined);
}
