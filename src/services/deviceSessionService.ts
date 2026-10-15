import { supabase, isSupabaseConfigured } from '../lib/supabase';

const DEVICE_KEY = 'iba_device_id';
const TOKEN_KEY = 'iba_session_token';

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked */
  }
}
function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage blocked */
  }
}

export function getDeviceId(): string {
  let id = safeGet(DEVICE_KEY);
  if (!id) {
    id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random();
    safeSet(DEVICE_KEY, id);
  }
  return id;
}

export const DeviceSessionService = {
  hasToken(): boolean {
    return !!safeGet(TOKEN_KEY);
  },

  clear() {
    safeRemove(TOKEN_KEY);
  },

  /** This device becomes the only valid one for the student. Staff get no token. */
  async register(): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data, error } = await supabase.rpc('register_student_session', {
        p_device_id: getDeviceId(),
        p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      });
      if (error) return; // never block login because of this
      if (data) safeSet(TOKEN_KEY, String(data));
      else safeRemove(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },

  /** Returns false only when the server explicitly says this device was replaced or reset. */
  async isStillValid(): Promise<{ valid: boolean; reason?: string }> {
    if (!isSupabaseConfigured || !supabase) return { valid: true };
    const token = safeGet(TOKEN_KEY);
    try {
      const { data, error } = await supabase.rpc('check_student_session', { p_token: token });
      if (error || !data) return { valid: true }; // network/db problem: do not log out
      return { valid: data.valid !== false, reason: data.reason };
    } catch {
      return { valid: true };
    }
  },
};
