'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, FileText, Contact2, Leaf, MailCheck, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import type { AccountStatus } from '@/lib/verification/types';

type State = {
  status: AccountStatus;
  firstName: string;
  email: string;
  emailConfirmed: boolean;
  motive: string | null;
  submittedAt: string | null;
};

export default function VerificationStatusPage() {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [noSession, setNoSession] = useState(false);
  const [reply, setReply] = useState('');
  const [training, setTraining] = useState<File | null>(null);
  const [identity, setIdentity] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tRef = useRef<HTMLInputElement>(null);
  const iRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setNoSession(true);
      setLoading(false);
      return;
    }
    const res = await fetch('/api/account/verification', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const s = (await res.json()) as State;
      if (s.status === 'validated') {
        router.replace('/dashboard');
        return;
      }
      setState(s);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendReply() {
    setError(null);
    if (!reply.trim() && !training && !identity) {
      setError('Ajoutez un message ou un document.');
      return;
    }
    setSending(true);
    try {
      const { data } = await supabase.auth.getSession();
      const fd = new FormData();
      fd.set('reply', reply.trim());
      if (training) fd.set('training', training);
      if (identity) fd.set('identity', identity);
      const res = await fetch('/api/account/verification', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` },
        body: fd,
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? 'L’envoi a échoué.');
        return;
      }
      setReply('');
      setTraining(null);
      setIdentity(null);
      await load();
    } finally {
      setSending(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream px-4 py-10 text-charcoal sm:px-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-light">
          <Leaf className="h-[22px] w-[22px] text-sage" aria-hidden="true" />
        </span>
        <span className="font-serif text-[22px] font-medium">Afeia</span>
        <span className="flex-1" />
        {state ? (
          <button type="button" onClick={logout} className="text-sm text-stone hover:text-charcoal">
            Se déconnecter
          </button>
        ) : null}
      </div>

      <div className="mx-auto mt-12 flex w-full max-w-[560px] flex-col gap-5">
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : noSession ? (
          <div className="flex flex-col gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sage-light text-sage">
              <MailCheck className="h-[26px] w-[26px]" aria-hidden="true" />
            </span>
            <h1 className="font-serif text-[32px] font-medium leading-tight">Adresse confirmée ?</h1>
            <p className="text-base leading-relaxed text-[#C9CFDA]">
              Connectez-vous pour suivre l&apos;état de votre demande d&apos;inscription.
            </p>
            <Link href="/login?from=/compte/verification" className="flex h-12 w-fit items-center rounded-[10px] bg-sage px-5 text-[15px] font-semibold text-ink">
              Se connecter
            </Link>
          </div>
        ) : !state ? (
          <p className="text-stone">
            Nous ne trouvons pas de demande d&apos;inscription pour ce compte.{' '}
            <Link href="/signup" className="text-sage">Créer un compte praticien</Link>
          </p>
        ) : state.status === 'pending_validation' ? (
          <div role="status" className="flex flex-col gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sage-light text-sage">
              <Clock className="h-[26px] w-[26px]" aria-hidden="true" />
            </span>
            <h1 className="font-serif text-[32px] font-medium leading-tight">Votre demande est en cours de vérification</h1>
            <p className="text-base leading-relaxed text-[#C9CFDA]">
              Merci {state.firstName}. L&apos;équipe Afeia vérifie votre SIRET et votre justificatif sous 48 h ouvrées. Vous recevrez un e-mail à{' '}
              <strong className="font-semibold text-charcoal">{state.email}</strong> dès que votre espace est ouvert.
            </p>
            {!state.emailConfirmed ? (
              <p className="rounded-xl border border-[#5A4636] bg-terracotta-light px-3.5 py-3 text-sm text-terracotta">
                Pensez à confirmer votre adresse e-mail avec le lien reçu à l&apos;inscription.
              </p>
            ) : null}
          </div>
        ) : state.status === 'info_requested' ? (
          <div className="flex flex-col gap-4">
            <h1 className="font-serif text-[32px] font-medium leading-tight">Il nous manque un élément</h1>
            <div className="rounded-xl border border-[#2F3A66] bg-[#1F2640] px-4 py-3.5">
              <span className="text-[13px] font-semibold uppercase tracking-wide text-[#A9B8EC]">Message de l&apos;équipe Afeia</span>
              <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-charcoal">{state.motive}</p>
            </div>
            <label htmlFor="reply" className="text-sm font-medium">Votre réponse</label>
            <textarea
              id="reply"
              rows={4}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className="rounded-xl border border-divider bg-surface px-3.5 py-3 text-[15px] outline-none focus:border-sage"
              placeholder="Précisez ce qui est utile à l’équipe."
            />
            <div className="flex flex-wrap gap-2.5">
              <button type="button" onClick={() => tRef.current?.click()} className="flex h-11 items-center gap-2 rounded-[10px] border border-divider px-3.5 text-sm hover:border-sage">
                <FileText className="h-4 w-4 text-sage" aria-hidden="true" />
                {training ? training.name : 'Nouveau justificatif de formation'}
              </button>
              <button type="button" onClick={() => iRef.current?.click()} className="flex h-11 items-center gap-2 rounded-[10px] border border-divider px-3.5 text-sm hover:border-sage">
                <Contact2 className="h-4 w-4 text-sage" aria-hidden="true" />
                {identity ? identity.name : 'Nouvelle pièce d’identité'}
              </button>
              <input ref={tRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.webp" className="sr-only" tabIndex={-1} aria-label="Nouveau justificatif de formation" onChange={(e) => setTraining(e.target.files?.[0] ?? null)} />
              <input ref={iRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.webp" className="sr-only" tabIndex={-1} aria-label="Nouvelle pièce d’identité" onChange={(e) => setIdentity(e.target.files?.[0] ?? null)} />
            </div>
            {error ? <p role="alert" className="text-sm text-[#F2A3A3]">{error}</p> : null}
            <button type="button" onClick={sendReply} disabled={sending} className="h-12 rounded-[10px] bg-sage text-[15px] font-semibold text-ink disabled:opacity-60">
              {sending ? 'Envoi…' : 'Envoyer à l’équipe Afeia'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3A2224] text-[#F2A3A3]">
              <XCircle className="h-[26px] w-[26px]" aria-hidden="true" />
            </span>
            <h1 className="font-serif text-[32px] font-medium leading-tight">Votre inscription n&apos;a pas été validée</h1>
            {state.motive ? (
              <p className="rounded-xl border border-divider bg-surface px-4 py-3.5 text-[15px] leading-relaxed">
                <span className="text-stone">Motif : </span>
                {state.motive}
              </p>
            ) : null}
            <p className="text-sm text-stone">
              Une erreur ? Écrivez-nous à <a href="mailto:contact@afeia.fr" className="text-sage">contact@afeia.fr</a>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
