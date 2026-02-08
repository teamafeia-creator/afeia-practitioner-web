import { createAdminClient } from '@/lib/supabase/admin';

type LogAdminActionParams = {
  adminUserId?: string;
  adminEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
};

export async function logAdminAction(params: LogAdminActionParams): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('admin_audit_log').insert({
      admin_user_id: params.adminUserId ?? null,
      admin_email: params.adminEmail,
      action: params.action,
      target_type: params.targetType ?? null,
      target_id: params.targetId ?? null,
      details: params.details ?? null,
      ip_address: params.ipAddress ?? null,
    });

    if (error) {
      console.error('[audit-log] insert error:', error);
    }
  } catch (err) {
    console.error('[audit-log] exception:', err);
  }
}

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') ?? null;
}
