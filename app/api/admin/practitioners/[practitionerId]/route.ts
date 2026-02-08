import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminAuth } from '@/lib/admin/auth';
import { logAdminAction, getClientIp } from '@/lib/admin/audit-log';
import { computeHealthScore } from '@/lib/admin/health-score';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ practitionerId: string }> }
) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const { practitionerId } = await params;
    const supabase = createAdminClient();

    const { data: practitioner, error } = await supabase
      .from('practitioners_public')
      .select('*')
      .eq('id', practitionerId)
      .single();

    if (error || !practitioner) {
      return NextResponse.json({ error: 'Praticien non trouve.' }, { status: 404 });
    }

    // Fetch enriched data in parallel
    const [
      consultantsResult,
      subscriptionResult,
      activityResult,
    ] = await Promise.all([
      supabase
        .from('consultants_identity')
        .select('id, full_name, email, status, is_premium, created_at')
        .eq('practitioner_id', practitionerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('stripe_subscriptions')
        .select('id, status, price_id, current_period_end, payment_failed, customer_id')
        .eq('practitioner_id', practitionerId)
        .maybeSingle(),
      supabase
        .from('practitioner_activity_log')
        .select('event_type, created_at')
        .eq('practitioner_id', practitionerId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false }),
    ]);

    const consultants = consultantsResult.data ?? [];
    const subscription = subscriptionResult.data;
    const recentActivity = activityResult.data ?? [];

    // Compute feature usage this month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const monthActivity = recentActivity.filter((a) => a.created_at >= startOfMonth);
    const featuresUsed = new Set(monthActivity.map((a) => a.event_type)).size;
    const TOTAL_FEATURES = 5; // conseillanciers, questionnaires, journal, circular, app mobile

    // Determine payment status
    let paymentStatus: 'ok' | 'late_short' | 'late_long' | 'free' = 'free';
    if (subscription) {
      if (subscription.payment_failed) {
        const daysSincePeriodEnd = subscription.current_period_end
          ? Math.floor((Date.now() - new Date(subscription.current_period_end).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        paymentStatus = daysSincePeriodEnd > 7 ? 'late_long' : 'late_short';
      } else if (subscription.status === 'active') {
        paymentStatus = 'ok';
      }
    }

    const healthScore = computeHealthScore({
      lastLoginAt: practitioner.last_login_at,
      consultantsCount: consultants.length,
      featuresUsedThisMonth: featuresUsed,
      totalFeatures: TOTAL_FEATURES,
      paymentStatus,
      createdAt: practitioner.created_at,
    });

    // Count logins this month
    const loginsThisMonth = monthActivity.filter((a) => a.event_type === 'login').length;

    // Count active features
    const circularEnabled = consultants.filter((c) => c.status === 'premium').length;

    return NextResponse.json({
      practitioner,
      consultants,
      subscription,
      healthScore,
      usage: {
        lastLoginAt: practitioner.last_login_at,
        loginsThisMonth,
        totalConsultants: consultants.length,
        featuresUsedThisMonth: featuresUsed,
        circularConsultants: circularEnabled,
      },
    });
  } catch (err) {
    console.error('Exception GET practitioner:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ practitionerId: string }> }
) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const { practitionerId } = await params;

    // Fetch current data for audit diff
    const supabase = createAdminClient();
    const { data: current } = await supabase
      .from('practitioners_public')
      .select('email, full_name, status, subscription_status')
      .eq('id', practitionerId)
      .single();

    const updates = {
      email: payload.email,
      full_name: payload.full_name,
      status: payload.status,
      subscription_status: payload.subscription_status,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('practitioners_public')
      .update(updates)
      .eq('id', practitionerId)
      .select('*')
      .single();

    if (error) {
      console.error('Erreur update practitioner:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise a jour.' }, { status: 500 });
    }

    // Determine specific action for audit log
    const action = current?.status !== payload.status
      ? (payload.status === 'suspended' ? 'practitioner.suspend' : 'practitioner.unsuspend')
      : 'practitioner.update';

    await logAdminAction({
      adminUserId: guard.user.id || undefined,
      adminEmail: guard.user.email,
      action,
      targetType: 'practitioner',
      targetId: practitionerId,
      details: {
        previous: current,
        updated: { email: payload.email, full_name: payload.full_name, status: payload.status, subscription_status: payload.subscription_status },
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ practitioner: data });
  } catch (err) {
    console.error('Exception PATCH practitioner:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ practitionerId: string }> }
) {
  const guard = await requireAdminAuth(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const { practitionerId } = await params;
    const supabase = createAdminClient();

    const { data: practitioner, error: practError } = await supabase
      .from('practitioners_public')
      .select('id, email, full_name')
      .eq('id', practitionerId)
      .single();

    if (practError || !practitioner) {
      return NextResponse.json({ error: 'Praticien non trouve.' }, { status: 404 });
    }

    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(practitionerId);

    if (authDeleteError) {
      console.error('Erreur suppression auth user:', authDeleteError);
      return NextResponse.json({ error: 'Erreur lors de la suppression du compte.' }, { status: 500 });
    }

    const { count: remainingCount, error: remainingError } = await supabase
      .from('practitioners_public')
      .select('id', { count: 'exact', head: true })
      .eq('id', practitionerId);

    if (remainingError) {
      console.error('Erreur verification suppression praticien:', remainingError);
      return NextResponse.json(
        { error: 'Erreur lors de la verification de suppression.' },
        { status: 500 }
      );
    }

    if ((remainingCount ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Le praticien est toujours present apres suppression.' },
        { status: 500 }
      );
    }

    await logAdminAction({
      adminUserId: guard.user.id || undefined,
      adminEmail: guard.user.email,
      action: 'practitioner.delete',
      targetType: 'practitioner',
      targetId: practitionerId,
      details: { email: practitioner.email, full_name: practitioner.full_name },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      message: 'Praticien supprime avec succes.',
      practitionerId,
    });
  } catch (err) {
    console.error('Exception DELETE practitioner:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
