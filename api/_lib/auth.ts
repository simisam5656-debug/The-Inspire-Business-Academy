import { createClient } from '@supabase/supabase-js';
import { getEnv } from './env';

export interface StaffAuthResult {
  authorized: boolean;
  actorId?: string;
  actorRole?: 'super_admin' | 'manager';
  statusCode?: number;
  error?: string;
  profile?: any;
}

/**
 * Server-side staff authentication and authorization guard.
 * Validates Supabase JWT, checks profile role, and checks manager granular permissions.
 */
export async function authenticateStaff(
  req: any,
  requiredPermission?: string,
  dbClient?: any
): Promise<StaffAuthResult> {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return {
      authorized: false,
      statusCode: 401,
      error: 'Unauthorized: Bearer authentication token is required.',
    };
  }

  const supabaseUrl = getEnv(req, 'SUPABASE_URL') || getEnv(req, 'VITE_SUPABASE_URL');
  const serviceKey = getEnv(req, 'SUPABASE_SERVICE_ROLE_KEY');

  if (!dbClient && (!supabaseUrl || !serviceKey)) {
    return {
      authorized: false,
      statusCode: 500,
      error: 'Server error: Database credentials not configured.',
    };
  }

  try {
    const supabase = dbClient || createClient(supabaseUrl!, serviceKey!, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return {
        authorized: false,
        statusCode: 401,
        error: 'Unauthorized: Invalid or expired session token.',
      };
    }

    const userId = userData.user.id;

    // Fetch user profile
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id, role, is_active, full_name, email')
      .eq('id', userId)
      .maybeSingle();

    if (pErr || !profile) {
      return {
        authorized: false,
        statusCode: 403,
        error: 'Forbidden: User profile not found in system.',
      };
    }

    if (profile.is_active === false) {
      return {
        authorized: false,
        statusCode: 403,
        error: 'Forbidden: Account has been deactivated by administrator.',
      };
    }

    if (profile.role !== 'super_admin' && profile.role !== 'manager') {
      return {
        authorized: false,
        statusCode: 403,
        error: 'Forbidden: Administrator or manager privileges required.',
      };
    }

    // If manager, check granular permissions if required
    if (profile.role === 'manager' && requiredPermission) {
      const { data: perm, error: permErr } = await supabase
        .from('manager_permissions')
        .select('permission_key')
        .eq('profile_id', userId)
        .eq('permission_key', requiredPermission)
        .maybeSingle();

      if (permErr || !perm) {
        return {
          authorized: false,
          statusCode: 403,
          error: `Forbidden: Manager account lacks permission for "${requiredPermission}".`,
        };
      }
    }

    return {
      authorized: true,
      actorId: profile.id,
      actorRole: profile.role,
      profile,
    };
  } catch (err: any) {
    console.error('authenticateStaff exception:', err?.name || 'AuthException');
    return {
      authorized: false,
      statusCode: 500,
      error: 'Internal authorization error.',
    };
  }
}

export interface StudentAuthResult {
  authorized: boolean;
  userId?: string;
  statusCode?: number;
  error?: string;
  supabase?: any;
}

/**
 * Validates the Supabase JWT of a logged-in (active) user. Returns a service-role client
 * so the handler can read answer keys that RLS hides from students.
 */
export async function authenticateStudent(req: any, dbClient?: any): Promise<StudentAuthResult> {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { authorized: false, statusCode: 401, error: 'Unauthorized: login required.' };

  const supabaseUrl = getEnv(req, 'SUPABASE_URL') || getEnv(req, 'VITE_SUPABASE_URL');
  const serviceKey = getEnv(req, 'SUPABASE_SERVICE_ROLE_KEY');
  if (!dbClient && (!supabaseUrl || !serviceKey)) {
    return { authorized: false, statusCode: 500, error: 'Server error: Database credentials not configured.' };
  }
  try {
    const supabase = dbClient || createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } });
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return { authorized: false, statusCode: 401, error: 'Unauthorized: Invalid or expired session token.' };
    }
    const { data: profile } = await supabase.from('profiles').select('id, is_active').eq('id', userData.user.id).maybeSingle();
    if (!profile || profile.is_active === false) {
      return { authorized: false, statusCode: 403, error: 'Forbidden: account not active.' };
    }
    return { authorized: true, userId: userData.user.id, supabase };
  } catch {
    return { authorized: false, statusCode: 500, error: 'Internal authorization error.' };
  }
}
