import { createClient } from '@supabase/supabase-js';
import { authenticateStaff } from '../_lib/auth';
import { getEnv } from '../_lib/env';
import { ManagerPermissionKey } from '../../src/types';

export const MAX_MANAGERS_LIMIT = 4;

export const ALLOWED_MANAGER_PERMISSIONS: ManagerPermissionKey[] = [
  'dashboard',
  'students',
  'registrations',
  'attendance',
  'fees',
  'expenses',
  'courses',
  'payments',
  'enrollments',
  'quizzes',
  'certificates',
  'announcements',
  'faqs',
  'testimonials',
  'notices',
  'gallery',
  'offers',
  'reports',
  'ai_tools',
  'messages',
  'chatbot',
];

export const FORBIDDEN_MANAGER_PERMISSIONS: string[] = [
  'settings',
  'audit_log',
];

function validatePermissions(requested: unknown): { valid: boolean; permissions: ManagerPermissionKey[]; error?: string } {
  if (!Array.isArray(requested)) {
    return { valid: false, permissions: [], error: 'Permissions must be an array of strings.' };
  }

  const sanitized: ManagerPermissionKey[] = [];
  for (const item of requested) {
    if (typeof item !== 'string') {
      return { valid: false, permissions: [], error: 'Invalid permission format.' };
    }
    const key = item.trim() as ManagerPermissionKey;
    if (FORBIDDEN_MANAGER_PERMISSIONS.includes(key)) {
      return { valid: false, permissions: [], error: `Permission "${key}" is strictly reserved for Super Administrators.` };
    }
    if (!ALLOWED_MANAGER_PERMISSIONS.includes(key)) {
      return { valid: false, permissions: [], error: `Unrecognized manager permission: "${key}".` };
    }
    if (!sanitized.includes(key)) {
      sanitized.push(key);
    }
  }

  return { valid: true, permissions: sanitized };
}

export default async function handler(req: any, res: any, dbClient?: any) {
  const method = req.method?.toUpperCase();

  // 1. Strict Staff Authentication
  const authResult = await authenticateStaff(req, undefined, dbClient);
  if (!authResult.authorized) {
    return res.status(authResult.statusCode || 401).json({
      ok: false,
      error: authResult.error || 'Unauthorized staff access.',
    });
  }

  // 2. Strict Super Admin Authorization
  if (authResult.actorRole !== 'super_admin') {
    return res.status(403).json({
      ok: false,
      error: 'Forbidden: Only Super Administrators have authority to manage manager accounts and permissions.',
    });
  }

  const supabaseUrl = getEnv(req, 'SUPABASE_URL') || getEnv(req, 'VITE_SUPABASE_URL');
  const serviceKey = getEnv(req, 'SUPABASE_SERVICE_ROLE_KEY');

  if (!dbClient && (!supabaseUrl || !serviceKey)) {
    return res.status(500).json({
      ok: false,
      error: 'Server is not configured: add SUPABASE_SERVICE_ROLE_KEY in the hosting environment',
    });
  }

  const supabase = dbClient || createClient(supabaseUrl!, serviceKey!, {
    auth: { persistSession: false },
  });

  // =========================================================================
  // GET: List all administrative staff accounts and permissions
  // =========================================================================
  if (method === 'GET') {
    try {
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, role, is_active, created_at')
        .in('role', ['super_admin', 'manager'])
        .order('role', { ascending: false });

      if (pErr) {
        return res.status(500).json({ ok: false, error: 'Failed to retrieve manager accounts.' });
      }

      const { data: perms, error: permErr } = await supabase
        .from('manager_permissions')
        .select('profile_id, permission_key');

      if (permErr) {
        return res.status(500).json({ ok: false, error: 'Failed to retrieve manager permissions.' });
      }

      const list = (profiles || []).map((p: any) => {
        const userPerms = (perms || [])
          .filter((pm: any) => pm.profile_id === p.id)
          .map((pm: any) => pm.permission_key as ManagerPermissionKey);

        return {
          id: p.id,
          email: p.email,
          fullName: p.full_name,
          phone: p.phone,
          role: p.role,
          isActive: p.is_active,
          permissions: p.role === 'super_admin' ? (['settings', 'audit_log', 'reports'] as ManagerPermissionKey[]) : userPerms,
          createdAt: p.created_at,
        };
      });

      return res.status(200).json({ ok: true, managers: list });
    } catch (err: any) {
      console.error('[Admin Managers GET Error]', err?.name || 'Exception');
      return res.status(500).json({ ok: false, error: 'Failed to retrieve manager accounts.' });
    }
  }

  // =========================================================================
  // POST: Secure Manager Provisioning
  // =========================================================================
  if (method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { email, fullName, phone, password, permissions: rawPermissions } = body;

      // 1. Validate inputs
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ ok: false, error: 'Valid email address is required.' });
      }
      if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
        return res.status(400).json({ ok: false, error: 'Full name must be at least 2 characters.' });
      }
      if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ ok: false, error: 'Initial password is required and must be at least 8 characters.' });
      }

      const permValidation = validatePermissions(rawPermissions || []);
      if (!permValidation.valid) {
        return res.status(400).json({ ok: false, error: permValidation.error });
      }
      const permissions = permValidation.permissions;

      // 2. Pre-check 4-manager limit
      const { count: currentManagerCount, error: countErr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'manager');

      if (countErr) {
        return res.status(500).json({ ok: false, error: 'Failed to verify manager capacity.' });
      }

      if ((currentManagerCount || 0) >= MAX_MANAGERS_LIMIT) {
        return res.status(400).json({
          ok: false,
          error: `Maximum ${MAX_MANAGERS_LIMIT} Operations Managers allowed under academy governance policy.`,
        });
      }

      // 3. Create real Supabase Auth user via administrative API
      let newUserId: string | null = null;
      try {
        const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
          email: email.trim().toLowerCase(),
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName.trim(),
            phone: phone ? phone.trim() : null,
          },
        });

        if (authErr || !authUser?.user) {
          const rawMsg = authErr?.message || '';
          const isConflict =
            rawMsg.toLowerCase().includes('already') ||
            rawMsg.toLowerCase().includes('duplicate') ||
            rawMsg.toLowerCase().includes('exists');
          const statusCode = isConflict ? 409 : 400;
          const errMsg = isConflict
            ? 'An account with this email address already exists.'
            : 'Failed to create administrative user account. Please check the provided details.';
          return res.status(statusCode).json({ ok: false, error: errMsg });
        }

        newUserId = authUser.user.id;
      } catch (authEx: any) {
        console.error('[Admin Managers Auth Creation Exception]', authEx?.name || 'Error');
        return res.status(500).json({ ok: false, error: 'Internal authentication service error during account creation.' });
      }

      if (!newUserId) {
        return res.status(500).json({ ok: false, error: 'Auth user creation failed to return a valid identifier.' });
      }

      const createdUserId = newUserId;

      // Safe compensating cleanup helper (never logs passwords or secrets)
      const executeCompensatingCleanup = async (
        userId: string,
        hasPermissions: boolean = false
      ): Promise<{ cleaned: boolean; failedSteps: string[]; detail?: string; referenceId: string }> => {
        let permissionsClean = true;
        if (hasPermissions) {
          try {
            const { error: permDelErr } = await supabase
              .from('manager_permissions')
              .delete()
              .eq('profile_id', userId);
            if (permDelErr) {
              permissionsClean = false;
            }
          } catch (_) {
            permissionsClean = false;
          }

          // Follow-up verification for permissions: check if row was already absent or now absent
          try {
            const { data: remainingPerms, error: checkPermErr } = await supabase
              .from('manager_permissions')
              .select('id')
              .eq('profile_id', userId);
            if (checkPermErr) {
              permissionsClean = false;
            } else if (!remainingPerms || remainingPerms.length === 0) {
              permissionsClean = true;
            } else {
              permissionsClean = false;
            }
          } catch (_) {
            permissionsClean = false;
          }
        }

        let profileClean = true;
        try {
          const { error: profDelErr } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);
          if (profDelErr) {
            profileClean = false;
          }
        } catch (_) {
          profileClean = false;
        }

        // Follow-up verification for profile: check if already absent
        try {
          const { data: profCheck, error: profCheckErr } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();
          if (profCheckErr) {
            profileClean = false;
          } else if (!profCheck) {
            profileClean = true;
          } else {
            profileClean = false;
          }
        } catch (_) {
          profileClean = false;
        }

        let authClean = true;
        try {
          const delRes = await supabase.auth.admin.deleteUser(userId);
          if (delRes?.error) {
            authClean = false;
          }
        } catch (_) {
          authClean = false;
        }

        // Follow-up verification for Auth user final state
        if (typeof supabase.auth?.admin?.getUserById === 'function') {
          try {
            const { data: authCheck, error: authCheckErr } = await supabase.auth.admin.getUserById(userId);
            if (authCheckErr) {
              const msg = (authCheckErr.message || '').toLowerCase();
              const status = (authCheckErr as any).status;
              if (status === 404 || msg.includes('not found')) {
                authClean = true;
              } else {
                authClean = false;
              }
            } else if (authCheck?.user) {
              authClean = false;
            } else {
              authClean = true;
            }
          } catch (_) {
            authClean = false;
          }
        }

        // If auth user deletion succeeded, check if profile was cleaned via ON DELETE CASCADE
        if (authClean && !profileClean) {
          try {
            const { data: cascadedCheck, error: cascadedCheckErr } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', userId)
              .maybeSingle();
            if (!cascadedCheckErr && !cascadedCheck) {
              profileClean = true;
            }
          } catch (_) {
            // Unverified
          }
        }

        const failedSteps: string[] = [];
        if (!permissionsClean) failedSteps.push('permissions');
        if (!profileClean) failedSteps.push('profile');
        if (!authClean) failedSteps.push('auth_user');

        const isClean = failedSteps.length === 0;

        if (!isClean) {
          // Operational log containing ONLY opaque identifier and failed step names
          console.error(`[Compensating Cleanup Alert] userId=${userId} failedSteps=${failedSteps.join(',')}`);
        }

        return {
          cleaned: isClean,
          failedSteps,
          detail: isClean ? undefined : `Failed cleanup steps: ${failedSteps.join(', ')}`,
          referenceId: userId,
        };
      };

      try {
        // 4. Verify whether a profile row was automatically created by the schema trigger
        const { data: initialProfile, error: initialProfileErr } = await supabase
          .from('profiles')
          .select('id, role, is_active')
          .eq('id', createdUserId)
          .maybeSingle();

        if (initialProfileErr || !initialProfile) {
          const cleanup = await executeCompensatingCleanup(createdUserId, false);
          const errorMsg = cleanup.cleaned
            ? 'Manager profile was not automatically created. Auth account safely rolled back.'
            : `Manager profile was not created and cleanup could not be fully completed for user ID: ${createdUserId}. Manual review required.`;
          return res.status(500).json({
            ok: false,
            error: errorMsg,
            referenceId: createdUserId,
            cleanupStatus: cleanup.cleaned ? 'complete' : 'manual_review_required',
          });
        }

        // 5. Update the expected profile row and request the updated row via supported PostgREST .select() interface
        const { data: updatedProfiles, error: profileErr } = await supabase
          .from('profiles')
          .update({
            role: 'manager',
            full_name: fullName.trim(),
            phone: phone ? phone.trim() : null,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', createdUserId)
          .select('id, email, full_name, phone, role, is_active');

        if (profileErr) {
          const cleanup = await executeCompensatingCleanup(createdUserId, false);
          const errorMsg = cleanup.cleaned
            ? 'Failed to update manager profile role. Auth account rolled back.'
            : `Failed to update manager profile role and cleanup encountered an issue for user ID: ${createdUserId}. Manual review required.`;
          return res.status(500).json({
            ok: false,
            error: errorMsg,
            referenceId: createdUserId,
            cleanupStatus: cleanup.cleaned ? 'complete' : 'manual_review_required',
          });
        }

        // Verify exactly one row was updated (Do not assume zero-row PostgREST updates return an error)
        if (!Array.isArray(updatedProfiles) || updatedProfiles.length !== 1) {
          const cleanup = await executeCompensatingCleanup(createdUserId, false);
          const errorMsg = cleanup.cleaned
            ? 'Failed to verify manager profile update (0 rows affected). Auth account rolled back.'
            : `Failed to verify manager profile update and cleanup could not be completed for user ID: ${createdUserId}. Manual review required.`;
          return res.status(500).json({
            ok: false,
            error: errorMsg,
            referenceId: createdUserId,
            cleanupStatus: cleanup.cleaned ? 'complete' : 'manual_review_required',
          });
        }

        const verifiedProfile = updatedProfiles[0];

        // Verify that exactly the expected profile exists with id, role = 'manager', and active state
        if (
          !verifiedProfile ||
          verifiedProfile.id !== createdUserId ||
          verifiedProfile.role !== 'manager' ||
          verifiedProfile.is_active !== true
        ) {
          const cleanup = await executeCompensatingCleanup(createdUserId, false);
          const errorMsg = cleanup.cleaned
            ? 'Manager profile verification failed (unexpected role or state). Account rolled back.'
            : `Manager profile verification failed and cleanup could not be completed for user ID: ${createdUserId}. Manual review required.`;
          return res.status(500).json({
            ok: false,
            error: errorMsg,
            referenceId: createdUserId,
            cleanupStatus: cleanup.cleaned ? 'complete' : 'manual_review_required',
          });
        }

        // 6. Insert explicit manager permissions
        if (permissions.length > 0) {
          const permRows = permissions.map((p) => ({
            profile_id: createdUserId,
            permission_key: p,
            granted_by: authResult.actorId,
          }));

          const { error: permErr } = await supabase
            .from('manager_permissions')
            .insert(permRows);

          if (permErr) {
            const cleanup = await executeCompensatingCleanup(createdUserId, true);
            const errorMsg = cleanup.cleaned
              ? 'Failed to assign manager permissions. Account rolled back.'
              : `Failed to assign manager permissions and cleanup encountered an issue for user ID: ${createdUserId}. Manual review required.`;
            return res.status(500).json({
              ok: false,
              error: errorMsg,
              referenceId: createdUserId,
              cleanupStatus: cleanup.cleaned ? 'complete' : 'manual_review_required',
            });
          }
        }

        // 7. Concurrency Guard: Re-verify total managers count does not exceed limit
        const { count: verifiedCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'manager');

        if ((verifiedCount || 0) > MAX_MANAGERS_LIMIT) {
          const cleanup = await executeCompensatingCleanup(createdUserId, permissions.length > 0);
          const errorMsg = cleanup.cleaned
            ? `Concurrent creation limit exceeded: Maximum ${MAX_MANAGERS_LIMIT} managers allowed. Account rolled back.`
            : `Concurrent creation limit exceeded: Maximum ${MAX_MANAGERS_LIMIT} managers allowed and cleanup encountered an issue for user ID: ${createdUserId}. Manual review required.`;
          return res.status(409).json({
            ok: false,
            error: errorMsg,
            referenceId: createdUserId,
            cleanupStatus: cleanup.cleaned ? 'complete' : 'manual_review_required',
          });
        }

        // 8. Record immutable audit log (NEVER logging credentials)
        const { error: auditErr } = await supabase.from('audit_logs').insert({
          actor_id: authResult.actorId,
          actor_role: 'super_admin',
          action: 'CREATE_MANAGER_ACCOUNT',
          entity: 'profiles',
          entity_id: createdUserId,
          details: {
            email: email.trim().toLowerCase(),
            fullName: fullName.trim(),
            permissionsCount: permissions.length,
            assignedPermissions: permissions,
          },
        });

        if (auditErr) {
          const cleanup = await executeCompensatingCleanup(createdUserId, permissions.length > 0);
          const errorMsg = cleanup.cleaned
            ? 'Failed to record audit log for manager creation. Account safely rolled back.'
            : `Failed to record audit log for manager creation and cleanup encountered an issue for user ID: ${createdUserId}. Manual review required.`;
          return res.status(500).json({
            ok: false,
            error: errorMsg,
            referenceId: createdUserId,
            cleanupStatus: cleanup.cleaned ? 'complete' : 'manual_review_required',
          });
        }

        // 9. Return successful response WITHOUT password or secrets
        return res.status(201).json({
          ok: true,
          manager: {
            id: createdUserId,
            email: email.trim().toLowerCase(),
            fullName: fullName.trim(),
            phone: phone ? phone.trim() : undefined,
            role: 'manager',
            isActive: true,
            permissions,
            createdAt: new Date().toISOString(),
          },
        });
      } catch (innerErr: any) {
        // Compensating cleanup on unexpected exception
        let cleanup = { cleaned: false, failedSteps: ['unknown'] };
        try {
          cleanup = await executeCompensatingCleanup(createdUserId, permissions.length > 0);
        } catch (_) {
          // Best effort compensation
        }
        const errorMsg = cleanup.cleaned
          ? 'Internal failure during manager provisioning. Account rolled back.'
          : `Internal failure during manager provisioning and cleanup could not be completed for user ID: ${createdUserId}. Manual review required.`;
        return res.status(500).json({
          ok: false,
          error: errorMsg,
          referenceId: createdUserId,
          cleanupStatus: cleanup.cleaned ? 'complete' : 'manual_review_required',
        });
      }
    } catch (err: any) {
      console.error('[Admin Managers POST Error]', err?.name || 'Exception');
      return res.status(500).json({ ok: false, error: 'Failed to process manager creation request.' });
    }
  }

  // =========================================================================
  // PATCH: Update Manager Permissions or Active Status
  // =========================================================================
  if (method === 'PATCH') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action, managerId, permissions: rawPermissions, isActive } = body;

      if (!managerId || typeof managerId !== 'string') {
        return res.status(400).json({ ok: false, error: 'managerId is required.' });
      }

      // Verify target manager profile
      const { data: targetProfile, error: targetErr } = await supabase
        .from('profiles')
        .select('id, role, email, full_name, is_active')
        .eq('id', managerId)
        .maybeSingle();

      if (targetErr || !targetProfile) {
        return res.status(404).json({ ok: false, error: 'Target manager account not found.' });
      }

      if (action === 'update_permissions') {
        const permValidation = validatePermissions(rawPermissions || []);
        if (!permValidation.valid) {
          return res.status(400).json({ ok: false, error: permValidation.error });
        }
        const permissions = permValidation.permissions;

        // Delete existing permissions and reinsert
        const { error: delPermErr } = await supabase.from('manager_permissions').delete().eq('profile_id', managerId);
        if (delPermErr) {
          return res.status(500).json({ ok: false, error: 'Failed to clear previous manager permissions.' });
        }

        if (permissions.length > 0) {
          const permRows = permissions.map((p) => ({
            profile_id: managerId,
            permission_key: p,
            granted_by: authResult.actorId,
          }));
          const { error: insertErr } = await supabase.from('manager_permissions').insert(permRows);
          if (insertErr) {
            return res.status(500).json({ ok: false, error: 'Failed to update manager permissions.' });
          }
        }

        const { error: auditErr } = await supabase.from('audit_logs').insert({
          actor_id: authResult.actorId,
          actor_role: 'super_admin',
          action: 'UPDATE_MANAGER_PERMISSIONS',
          entity: 'manager_permissions',
          entity_id: managerId,
          details: { permissionsCount: permissions.length, permissions },
        });

        if (auditErr) {
          return res.status(500).json({ ok: false, error: 'Failed to record permission update in audit log.' });
        }

        return res.status(200).json({ ok: true, permissions });
      }

      if (action === 'toggle_active') {
        if (targetProfile.role === 'super_admin') {
          return res.status(400).json({ ok: false, error: 'Super Admin account cannot be deactivated.' });
        }

        const newActiveState = Boolean(isActive);
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ is_active: newActiveState, updated_at: new Date().toISOString() })
          .eq('id', managerId);

        if (updateErr) {
          return res.status(500).json({ ok: false, error: 'Failed to update account status.' });
        }

        const { error: auditErr } = await supabase.from('audit_logs').insert({
          actor_id: authResult.actorId,
          actor_role: 'super_admin',
          action: newActiveState ? 'ACTIVATE_MANAGER' : 'DEACTIVATE_MANAGER',
          entity: 'profiles',
          entity_id: managerId,
        });

        if (auditErr) {
          return res.status(500).json({ ok: false, error: 'Failed to record account status update in audit log.' });
        }

        return res.status(200).json({ ok: true, isActive: newActiveState });
      }

      if (action === 'reset_password') {
        const { newPassword } = body;
        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
          return res.status(400).json({ ok: false, error: 'New password must be at least 8 characters long.' });
        }

        const { error: resetErr } = await supabase.auth.admin.updateUserById(managerId, {
          password: newPassword,
        });

        if (resetErr) {
          return res.status(500).json({ ok: false, error: 'Failed to reset manager password: ' + resetErr.message });
        }

        const { error: auditErr } = await supabase.from('audit_logs').insert({
          actor_id: authResult.actorId,
          actor_role: 'super_admin',
          action: 'RESET_MANAGER_PASSWORD',
          entity: 'profiles',
          entity_id: managerId,
          details: { email: targetProfile.email },
        });

        if (auditErr) {
          console.warn('[Admin Managers Audit Warning] Failed to log password reset');
        }

        return res.status(200).json({ ok: true, message: 'Password reset successfully.' });
      }

      return res.status(400).json({ ok: false, error: 'Invalid action for PATCH /api/admin/managers.' });
    } catch (err: any) {
      console.error('[Admin Managers PATCH Error]', err?.name || 'Exception');
      return res.status(500).json({ ok: false, error: 'Failed to update manager.' });
    }
  }

  res.setHeader('Allow', 'GET, POST, PATCH');
  return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
}
