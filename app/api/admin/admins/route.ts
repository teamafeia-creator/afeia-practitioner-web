import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminAuth } from '@/lib/admin/auth';
import { logAdminAction, getClientIp } from '@/lib/admin/audit-log';

export async function GET(request: NextRequest) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('admin_allowlist')
      .select('email, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[admin] allowlist fetch error:', error);
      return NextResponse.json({ error: 'Impossible de charger la liste des admins.' }, { status: 500 });
    }

    return NextResponse.json({ admins: data ?? [] });
  } catch (error) {
    console.error('[admin] allowlist fetch exception:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const payload = (await request.json()) as { email?: string };
    const email = payload.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: 'Email manquant.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('admin_allowlist').insert({ email });

    if (error) {
      console.error('[admin] allowlist insert error:', error);
      return NextResponse.json({ error: "Erreur lors de l'ajout de l'admin." }, { status: 500 });
    }

    await logAdminAction({
      adminUserId: guard.user.id || undefined,
      adminEmail: guard.user.email,
      action: 'admin.create',
      targetType: 'admin',
      targetId: email,
      details: { email },
      ipAddress: getClientIp(request) ?? undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin] allowlist insert exception:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const payload = (await request.json()) as { email?: string };
    const email = payload.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: 'Email manquant.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('admin_allowlist').delete().eq('email', email);

    if (error) {
      console.error('[admin] allowlist delete error:', error);
      return NextResponse.json({ error: "Erreur lors de la suppression de l'admin." }, { status: 500 });
    }

    await logAdminAction({
      adminUserId: guard.user.id || undefined,
      adminEmail: guard.user.email,
      action: 'admin.delete',
      targetType: 'admin',
      targetId: email,
      details: { email },
      ipAddress: getClientIp(request) ?? undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin] allowlist delete exception:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
