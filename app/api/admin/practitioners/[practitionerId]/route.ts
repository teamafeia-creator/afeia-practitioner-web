import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/server/adminGuard';

/**
 * GET /api/admin/practitioners/[practitionerId]
 * Récupérer les détails d'un praticien
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ practitionerId: string }> }
) {
  const guard = await requireAdmin(request);
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
      return NextResponse.json({ error: 'Praticien non trouvé.' }, { status: 404 });
    }

    return NextResponse.json({ practitioner });
  } catch (err) {
    console.error('Exception GET practitioner:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/practitioners/[practitionerId]
 * Mettre à jour un praticien (admin seulement)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ practitionerId: string }> }
) {
  const guard = await requireAdmin(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const { practitionerId } = await params;

    const updates = {
      email: payload.email,
      full_name: payload.full_name,
      status: payload.status,
      calendly_url: payload.calendly_url,
      subscription_status: payload.subscription_status,
      updated_at: new Date().toISOString()
    };

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('practitioners_public')
      .update(updates)
      .eq('id', practitionerId)
      .select('*')
      .single();

    if (error) {
      console.error('Erreur update practitioner:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 });
    }

    return NextResponse.json({ practitioner: data });
  } catch (err) {
    console.error('Exception PATCH practitioner:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/practitioners/[practitionerId]
 * Supprimer un praticien (admin seulement)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ practitionerId: string }> }
) {
  const guard = await requireAdmin(request);
  if ('response' in guard) {
    return guard.response;
  }

  try {
    const { practitionerId } = await params;
    const supabase = createAdminClient();

    // 1. Vérifier que le praticien existe
    const { data: practitioner, error: practError } = await supabase
      .from('practitioners_public')
      .select('id, email, full_name')
      .eq('id', practitionerId)
      .single();

    if (practError || !practitioner) {
      return NextResponse.json({ error: 'Praticien non trouvé.' }, { status: 404 });
    }

    // 2. Supprimer le praticien dans Supabase Auth
    // Ceci déclenchera CASCADE pour supprimer dans la table practitioners
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

    console.log(
      `✅ Praticien ${practitioner.full_name} (${practitionerId}) supprimé par admin ${guard.user.email}`
    );

    return NextResponse.json({
      success: true,
      message: 'Praticien supprimé avec succès.',
      practitionerId
    });
  } catch (err) {
    console.error('Exception DELETE practitioner:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
