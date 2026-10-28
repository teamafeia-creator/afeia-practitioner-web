'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Clock, Eye, EyeOff, FileText, Contact2, Leaf, Lock } from 'lucide-react';
import { PASSWORD_RULES, formatSiret, passwordOk, siretDigits, siretValid, ACCEPTED_DOC_TYPES, MAX_DOC_BYTES } from '@/lib/verification/types';

type Step = 1 | 2 | 3;

const inputCls =
  'h-12 w-full rounded-[10px] border bg-surface px-3.5 text-[15px] text-charcoal outline-none placeholder:text-mist focus:border-sage';
const labelCls = 'text-sm font-medium';

const HOW = [
  { t: 'Vous créez votre compte', d: 'Identité, SIRET, justificatif de formation et pièce d’identité.' },
  { t: 'L’équipe Afeia vérifie', d: 'Sous 48 h ouvrées, nous contrôlons votre SIRET et votre justificatif.' },
  { t: 'Votre espace s’ouvre', d: 'Vous recevez un e-mail et pouvez inviter vos premiers consultants.' },
];

const fmtSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(b / 1024))} Ko`);

function FilePicker({
  label,
  hint,
  icon: Icon,
  file,
  onFile,
  error,
  id,
}: {
  label: string;
  hint: string;
  icon: React.ElementType;
  file: File | null;
  onFile: (f: File | null) => void;
  error?: string | null;
  id: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className={labelCls}>
        {label}
      </span>
      <div
        className="flex items-center gap-3 rounded-xl border bg-surface p-3.5"
        style={{ borderColor: error ? '#6B3438' : '#2A3140' }}
      >
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-sage-light text-sage">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{file ? file.name : 'Aucun fichier choisi'}</span>
          <span className="text-[13px] text-stone">{file ? `${fmtSize(file.size)} · PDF, JPG ou PNG` : hint}</span>
        </span>
        <button
          type="button"
          onClick={() => ref.current?.click()}
          aria-describedby={`${id}-label`}
          className="h-10 rounded-lg border border-divider px-3 text-[13px] text-charcoal hover:border-sage"
        >
          {file ? 'Remplacer' : 'Choisir'}
        </button>
        <input
          ref={ref}
          id={id}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.heic,.webp"
          className="sr-only"
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {error ? <span className="text-[13px] text-[#F2A3A3]">{error}</span> : null}
    </div>
  );
}

function docError(f: File | null): string | null {
  if (!f) return 'Ajoutez ce document.';
  if (f.size > MAX_DOC_BYTES) return 'Fichier trop lourd (10 Mo maximum).';
  if (f.type && !ACCEPTED_DOC_TYPES.includes(f.type)) return 'Format accepté : PDF, JPG ou PNG.';
  return null;
}

export default function SignUpPage() {
  const [step, setStep] = useState<Step>(1);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [tried1, setTried1] = useState(false);

  const [school, setSchool] = useState('');
  const [year, setYear] = useState('');
  const [siret, setSiret] = useState('');
  const [city, setCity] = useState('');
  const [training, setTraining] = useState<File | null>(null);
  const [identity, setIdentity] = useState<File | null>(null);
  const [charter, setCharter] = useState(false);
  const [tried2, setTried2] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailOk = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim());
  const strong = passwordOk(pwd);
  const match = pwd2.length > 0 && pwd === pwd2;
  const step1Ok = !!first.trim() && !!last.trim() && emailOk && strong && match;

  const thisYear = new Date().getFullYear();
  const yearN = Number(year);
  const yearOk = /^\d{4}$/.test(year) && yearN >= 1970 && yearN <= thisYear;
  const siretLen = siretDigits(siret).length;
  const siretOk = siretValid(siret);
  const step2Ok = !!school.trim() && yearOk && siretOk && !!city.trim() && !docError(training) && !docError(identity) && charter;

  const steps = ['Compte', 'Formation & SIRET', 'Validation Afeia'];
  const stage = step === 3 ? 2 : 1;

  function next() {
    setTried1(true);
    if (step1Ok) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function submit() {
    setTried2(true);
    setError(null);
    if (!step2Ok) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.set('firstName', first.trim());
      fd.set('lastName', last.trim());
      fd.set('email', email.trim().toLowerCase());
      fd.set('password', pwd);
      fd.set('school', school.trim());
      fd.set('year', year);
      fd.set('siret', siretDigits(siret));
      fd.set('city', city.trim());
      fd.set('charter', 'true');
      fd.set('training', training as File);
      fd.set('identity', identity as File);
      const res = await fetch('/api/signup', { method: 'POST', body: fd });
      const data = (await res.json().catch(() => ({}))) as { error?: string; field?: string };
      if (!res.ok) {
        setError(data.error ?? 'L’envoi a échoué. Réessayez dans un instant.');
        if (data.field === 'email' || data.field === 'password' || data.field === 'name') setStep(1);
        return;
      }
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('L’envoi a échoué. Vérifiez votre connexion et réessayez.');
    } finally {
      setSending(false);
    }
  }

  const border = (bad: boolean, good = false) => ({ borderColor: bad ? '#6B3438' : good ? '#2F5A50' : '#2A3140' });

  return (
    <div className="flex min-h-screen flex-wrap bg-cream text-charcoal">
      <main className="flex min-w-0 flex-[3_1_520px] flex-col gap-8 px-4 py-10 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-light">
            <Leaf className="h-[22px] w-[22px] text-sage" aria-hidden="true" />
          </span>
          <span className="font-serif text-[22px] font-medium">Afeia</span>
          <span className="flex-1" />
          <span className="text-sm text-stone">
            Déjà inscrit ?{' '}
            <Link href="/login" className="text-sage hover:text-[#A8E6CF]">
              Se connecter
            </Link>
          </span>
        </div>

        <div className="flex w-full max-w-[520px] flex-col gap-6 self-center">
          <ol aria-label="Étapes" className="grid grid-cols-3 gap-2">
            {steps.map((l, i) => (
              <li key={l} aria-current={i + 1 === step ? 'step' : undefined} className="flex flex-col gap-2">
                <span className="h-1 rounded-sm" style={{ background: i + 1 <= step ? '#6DD4B8' : '#2A3140' }} />
                <span className="text-[13px]" style={{ color: i + 1 <= step ? '#E8EDF4' : '#8B95A5' }}>
                  {i + 1}. {l}
                </span>
              </li>
            ))}
          </ol>

          {error ? (
            <div role="alert" className="rounded-xl border border-[#6B3438] bg-[#3A2224] px-3.5 py-3 text-sm text-[#F2A3A3]">
              {error}
            </div>
          ) : null}

          {step === 1 && (
            <form
              className="flex flex-col gap-[18px]"
              onSubmit={(e) => {
                e.preventDefault();
                next();
              }}
              noValidate
            >
              <div className="flex flex-col gap-1.5">
                <h1 className="font-serif text-[32px] font-medium leading-[1.15]">Créer votre espace praticien</h1>
                <p className="text-[15px] text-stone">Quelques informations pour commencer.</p>
              </div>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="prenom" className={labelCls}>Prénom</label>
                  <input id="prenom" autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)} className={inputCls} style={border(tried1 && !first.trim())} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="nom" className={labelCls}>Nom</label>
                  <input id="nom" autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)} className={inputCls} style={border(tried1 && !last.trim())} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="mail" className={labelCls}>E-mail</label>
                <input id="mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} style={border(tried1 && !emailOk)} aria-describedby="mail-msg" />
                {tried1 && !emailOk ? <span id="mail-msg" className="text-[13px] text-[#F2A3A3]">Saisissez une adresse e-mail valide.</span> : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pass" className={labelCls}>Mot de passe</label>
                <div className="flex h-12 items-center rounded-[10px] border bg-surface focus-within:border-sage" style={border(tried1 && !strong, !!pwd && strong)}>
                  <input
                    id="pass"
                    type={show1 ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    aria-describedby="pass-rules"
                    className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[15px] text-charcoal outline-none"
                  />
                  <button type="button" onClick={() => setShow1((v) => !v)} aria-label={show1 ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={show1} className="flex h-11 w-11 items-center justify-center text-stone hover:text-charcoal">
                    {show1 ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
                  </button>
                </div>
                <ul id="pass-rules" aria-live="polite" className="mt-1 grid grid-cols-1 gap-x-3.5 gap-y-1.5 sm:grid-cols-2">
                  {PASSWORD_RULES.map((r) => {
                    const ok = r.test(pwd);
                    return (
                      <li key={r.id} className="flex items-center gap-2 text-[13px]" style={{ color: ok ? '#6DD4B8' : '#8B95A5' }}>
                        <span aria-hidden="true" className="flex h-4 w-4 flex-none items-center justify-center rounded-full border text-[10px] font-bold text-ink" style={{ borderColor: ok ? '#6DD4B8' : '#5C6573', background: ok ? '#6DD4B8' : 'transparent' }}>
                          {ok ? '✓' : ''}
                        </span>
                        <span>
                          {r.label}
                          <span className="sr-only">{ok ? ' : respecté' : ' : manquant'}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pass2" className={labelCls}>Confirmer le mot de passe</label>
                <div className="flex h-12 items-center rounded-[10px] border bg-surface focus-within:border-sage" style={border(!!pwd2 && !match, match)}>
                  <input
                    id="pass2"
                    type={show2 ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={pwd2}
                    onChange={(e) => setPwd2(e.target.value)}
                    aria-describedby="pass2-msg"
                    className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[15px] text-charcoal outline-none"
                  />
                  <button type="button" onClick={() => setShow2((v) => !v)} aria-label={show2 ? 'Masquer la confirmation' : 'Afficher la confirmation'} aria-pressed={show2} className="flex h-11 w-11 items-center justify-center text-stone hover:text-charcoal">
                    {show2 ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
                  </button>
                </div>
                <span id="pass2-msg" aria-live="polite" className="text-[13px]" style={{ color: !pwd2 ? '#8B95A5' : match ? '#6DD4B8' : '#F2A3A3' }}>
                  {!pwd2 ? 'Saisissez à nouveau le mot de passe.' : match ? '✓ Les mots de passe correspondent' : 'Les mots de passe ne correspondent pas'}
                </span>
              </div>
              <button
                type="submit"
                aria-disabled={!step1Ok}
                className="h-[50px] rounded-[10px] text-[15px] font-semibold"
                style={{ background: step1Ok ? '#6DD4B8' : '#2A3140', color: step1Ok ? '#0A0E14' : '#8B95A5', cursor: step1Ok ? 'pointer' : 'not-allowed' }}
              >
                Continuer : formation et SIRET
              </button>
            </form>
          )}

          {step === 2 && (
            <form
              className="flex flex-col gap-[18px]"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
              noValidate
            >
              <div className="flex flex-col gap-1.5">
                <h1 className="font-serif text-[32px] font-medium leading-[1.15]">Formation et SIRET</h1>
                <p className="text-[15px] text-stone">Ces éléments permettent à notre équipe de vérifier votre inscription.</p>
              </div>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ecole" className={labelCls}>École ou certification</label>
                  <input id="ecole" value={school} onChange={(e) => setSchool(e.target.value)} className={inputCls} style={border(tried2 && !school.trim())} placeholder="Ex. École de naturopathie de Bordeaux" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="annee" className={labelCls}>Année d&apos;obtention</label>
                  <input id="annee" inputMode="numeric" maxLength={4} value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))} className={inputCls} style={border(tried2 && !yearOk)} placeholder={String(thisYear - 2)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="siret" className={labelCls}>SIRET</label>
                  <input
                    id="siret"
                    inputMode="numeric"
                    value={siret}
                    onChange={(e) => setSiret(formatSiret(e.target.value.slice(0, 20)))}
                    className={inputCls}
                    style={border((tried2 || siretLen === 14) && !siretOk, siretOk)}
                    placeholder="123 456 789 00012"
                    aria-describedby="siret-msg"
                  />
                  <span id="siret-msg" aria-live="polite" className="text-[13px]" style={{ color: siretOk ? '#6DD4B8' : (tried2 || siretLen === 14) ? '#F2A3A3' : '#8B95A5' }}>
                    {siretOk ? '✓ Numéro valide' : siretLen === 14 ? 'Ce numéro ne semble pas valide, vérifiez-le.' : `14 chiffres (${siretLen}/14)`}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ville" className={labelCls}>Ville du cabinet</label>
                  <input id="ville" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} style={border(tried2 && !city.trim())} />
                </div>
              </div>
              <FilePicker id="doc-formation" label="Justificatif de formation" hint="Certificat ou diplôme · PDF, JPG ou PNG" icon={FileText} file={training} onFile={setTraining} error={tried2 ? docError(training) : null} />
              <div className="flex flex-col gap-1.5">
                <FilePicker id="doc-identite" label="Pièce d'identité" hint="Carte d'identité ou passeport, recto et verso" icon={Contact2} file={identity} onFile={setIdentity} error={tried2 ? docError(identity) : null} />
                <span className="flex items-start gap-2 text-[13px] leading-normal text-stone">
                  <Lock className="mt-[3px] h-3.5 w-3.5 flex-none" aria-hidden="true" />
                  Vue uniquement par l&apos;équipe Afeia pour vérifier votre identité, puis supprimée une fois votre inscription traitée.
                </span>
              </div>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-normal text-[#C9CFDA]">
                <input type="checkbox" checked={charter} onChange={() => setCharter((v) => !v)} className="mt-0.5 h-[18px] w-[18px] flex-none accent-[#6DD4B8]" />
                <span>
                  J&apos;accepte les{' '}
                  <Link href="/charte#conditions" target="_blank" className="text-sage hover:text-[#A8E6CF]">conditions d&apos;utilisation</Link> et la{' '}
                  <Link href="/charte" target="_blank" className="text-sage hover:text-[#A8E6CF]">charte de pratique</Link> : je n&apos;établis pas de diagnostic et ne modifie pas un traitement médical.
                </span>
              </label>
              {tried2 && !charter ? <span className="-mt-3 text-[13px] text-[#F2A3A3]">Acceptez la charte pour envoyer votre demande.</span> : null}
              <div className="flex gap-2.5">
                <button type="button" onClick={() => setStep(1)} className="h-[50px] rounded-[10px] border border-divider px-[18px] text-[15px]">
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  aria-disabled={!step2Ok}
                  className="h-[50px] flex-1 rounded-[10px] text-[15px] font-semibold"
                  style={{ background: step2Ok ? '#6DD4B8' : '#2A3140', color: step2Ok ? '#0A0E14' : '#8B95A5', cursor: step2Ok && !sending ? 'pointer' : 'not-allowed' }}
                >
                  {sending ? 'Envoi en cours…' : 'Envoyer ma demande'}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div role="status" className="flex flex-col gap-[18px]">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sage-light text-sage">
                <Clock className="h-[26px] w-[26px]" aria-hidden="true" />
              </span>
              <h1 className="font-serif text-[32px] font-medium leading-[1.15]">Demande envoyée, merci {first.trim()}</h1>
              <p className="text-base leading-relaxed text-[#C9CFDA]">
                Confirmez d&apos;abord votre adresse avec le lien que nous venons d&apos;envoyer à{' '}
                <strong className="font-semibold text-charcoal">{email.trim().toLowerCase()}</strong>. Notre équipe vérifie ensuite votre inscription sous 48 h ouvrées : vous recevrez un e-mail dès que votre espace est ouvert.
              </p>
              <div className="flex flex-col gap-2.5 rounded-xl border border-divider bg-surface p-4">
                <span className="text-sm font-semibold">En attendant</span>
                <Link href="/decouvrir" className="text-sm text-sage hover:text-[#A8E6CF]">
                  Regarder la présentation d&apos;Afeia →
                </Link>
                <Link href="/compte/verification" className="text-sm text-sage hover:text-[#A8E6CF]">
                  Suivre l&apos;état de ma demande →
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <aside className="flex min-w-0 flex-[2_1_360px] flex-col justify-center gap-7 border-l border-divider bg-surface px-4 py-14 sm:px-10">
        <h2 className="font-serif text-[26px] font-medium leading-tight">Un espace réservé aux praticiens vérifiés</h2>
        <ol className="flex flex-col gap-5">
          {HOW.map((h, i) => {
            const done = i + 1 < stage;
            const cur = i + 1 === stage;
            return (
              <li key={h.t} className="flex gap-3.5">
                <span
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-full border text-sm font-semibold"
                  style={{ borderColor: done || cur ? '#6DD4B8' : '#2A3140', background: done ? '#6DD4B8' : cur ? '#23383B' : 'transparent', color: done ? '#0A0E14' : cur ? '#6DD4B8' : '#8B95A5' }}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-[15px] font-semibold">{h.t}</span>
                  <span className="text-sm leading-normal text-stone">{h.d}</span>
                </span>
              </li>
            );
          })}
        </ol>
        <p className="text-[13px] leading-normal text-stone">
          Vos consultants confient des informations personnelles : cette vérification les protège autant que vous.
        </p>
      </aside>
    </div>
  );
}
