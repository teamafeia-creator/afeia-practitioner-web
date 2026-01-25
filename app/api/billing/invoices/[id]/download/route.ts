// app/api/billing/invoices/[id]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { getStripeInvoicePdf } from '@/lib/stripe/server';
import { verifyApiJwt, getBearerToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;

    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    const token = getBearerToken(authHeader);
    if (!token) {
      return NextResponse.json(
        { message: 'Non authentifié' },
        { status: 401 }
      );
    }

    const payload = await verifyApiJwt(token);
    if (!payload) {
      return NextResponse.json(
        { message: 'Token invalide' },
        { status: 401 }
      );
    }

    const userId = payload.sub as string;

    // Récupérer la facture et vérifier qu'elle appartient à l'utilisateur
    const supabase = createSupabaseAdminClient();
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('practitioner_id', userId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { message: 'Facture non trouvée' },
        { status: 404 }
      );
    }

    // Si on a un PDF Stripe, rediriger vers celui-ci
    if (invoice.stripe_invoice_pdf) {
      return NextResponse.redirect(invoice.stripe_invoice_pdf);
    }

    // Sinon, essayer de le récupérer via l'API Stripe
    if (invoice.stripe_invoice_id) {
      const pdfUrl = await getStripeInvoicePdf(invoice.stripe_invoice_id);
      if (pdfUrl) {
        // Mettre à jour l'URL dans la base de données pour le futur
        await supabase
          .from('invoices')
          .update({ stripe_invoice_pdf: pdfUrl })
          .eq('id', invoiceId);

        return NextResponse.redirect(pdfUrl);
      }
    }

    // Si pas de PDF Stripe disponible, générer un PDF basique
    // Pour l'instant, on retourne une erreur
    // TODO: Implémenter la génération de PDF avec une librairie comme @react-pdf/renderer
    return NextResponse.json(
      { message: 'PDF non disponible pour cette facture' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error downloading invoice:', error);
    return NextResponse.json(
      { message: 'Erreur lors du téléchargement de la facture' },
      { status: 500 }
    );
  }
}
