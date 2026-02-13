import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { createSupabaseAdminClient, createSupabaseAuthClient } from '@/lib/server/supabaseAdmin';
import { DrawingPdfDocument } from '@/lib/pdf/drawing-pdf-template';

/**
 * GET /api/consultants/[consultantId]/drawings/[drawingId]/pdf
 *
 * Génère et renvoie le PDF d'un schéma corporel.
 * Auth requise : le praticien doit être propriétaire du consultant.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ consultantId: string; drawingId: string }> }
) {
  try {
    const { consultantId, drawingId } = await params;

    // 1. Vérifier l'authentification
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    const supabaseAuth = createSupabaseAuthClient();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    const practitionerId = authData.user.id;
    const supabase = createSupabaseAdminClient();

    // 2. Récupérer le consultant et vérifier l'accès
    const { data: consultant, error: consultantError } = await supabase
      .from('consultants')
      .select('id, practitioner_id, name, full_name, first_name, last_name')
      .eq('id', consultantId)
      .single();

    if (consultantError || !consultant) {
      return NextResponse.json({ error: 'Consultant non trouvé.' }, { status: 404 });
    }

    if (consultant.practitioner_id !== practitionerId) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    // 3. Récupérer le dessin
    const { data: drawing, error: drawingError } = await supabase
      .from('consultant_drawings')
      .select('*')
      .eq('id', drawingId)
      .eq('consultant_id', consultantId)
      .single();

    if (drawingError || !drawing) {
      return NextResponse.json({ error: 'Schéma non trouvé.' }, { status: 404 });
    }

    // 4. Vérifier que le snapshot existe
    if (!drawing.snapshot_path) {
      return NextResponse.json(
        { error: 'Veuillez d\'abord sauvegarder le schéma pour générer un snapshot.' },
        { status: 400 }
      );
    }

    // 5. Télécharger le snapshot PNG depuis Storage
    const { data: snapshotData, error: snapshotError } = await supabase.storage
      .from('consultant-drawings')
      .download(drawing.snapshot_path);

    if (snapshotError || !snapshotData) {
      return NextResponse.json({ error: 'Impossible de charger le snapshot.' }, { status: 500 });
    }

    const snapshotBuffer = Buffer.from(await snapshotData.arrayBuffer());
    const snapshotBase64 = `data:image/png;base64,${snapshotBuffer.toString('base64')}`;

    // 6. Récupérer le nom du praticien
    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('full_name')
      .eq('id', practitionerId)
      .single();

    // 7. Construire les données du PDF
    const consultantName =
      consultant.full_name ||
      [consultant.first_name, consultant.last_name].filter(Boolean).join(' ') ||
      consultant.name ||
      'Consultant';

    const pdfData = {
      consultantName,
      practitionerName: practitioner?.full_name || 'Naturopathe',
      title: drawing.title,
      date: drawing.updated_at || drawing.created_at,
      snapshotBase64,
      notes: drawing.notes,
    };

    // 8. Générer le PDF
    const pdfElement = React.createElement(DrawingPdfDocument, { data: pdfData });
    const pdfBuffer = await renderToBuffer(pdfElement as Parameters<typeof renderToBuffer>[0]);

    // 9. Retourner le PDF
    const filename = `schema-${drawing.title.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçæœ\s-]/g, '').replace(/\s+/g, '-').toLowerCase()}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Exception PDF drawing generation:', err);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF.' },
      { status: 500 }
    );
  }
}
