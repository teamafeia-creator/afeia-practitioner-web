'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Info, Search } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { SkeletonList, SkeletonMessage } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { showToast, Toaster } from '@/components/ui/Toaster';
import { mentionsMedication } from '@/lib/messages/medication';
import { FACE_COLORS, initialsOf } from '@/lib/morning-review/queue';
import type { Message } from '@/lib/types';

interface Conversation {
  consultant_id: string;
  consultant_name: string;
  consultant_email: string | null;
  last_message: {
    id: string;
    text: string;
    sender: 'praticien' | 'consultant';
    sent_at: string;
    read_at: string | null;
  };
  unread_count: number;
}

const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const shortFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });
const longFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

function listDate(iso: string) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? timeFmt.format(d) : shortFmt.format(d);
}

function bubbleDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return `Aujourd’hui, ${timeFmt.format(d)}`;
  if (d.toDateString() === yesterday.toDateString()) return `Hier, ${timeFmt.format(d)}`;
  return `${longFmt.format(d)}, ${timeFmt.format(d)}`;
}

/** Couleur stable par consultant. */
function colorOf(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FACE_COLORS[h % FACE_COLORS.length];
}

function MessagesInner() {
  const { loading: authLoading, isAuthenticated } = useRequireAuth('/login');
  const searchParams = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const param = searchParams.get('consultant');
    if (param) {
      setSelectedId(param);
      setMobileShowChat(true);
    }
  }, [searchParams]);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || '';
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messages', { headers: { Authorization: `Bearer ${await getToken()}` } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const list: Conversation[] = data.conversations || [];
      setConversations(list);
      setSelectedId((cur) => cur ?? (window.innerWidth >= 768 ? list[0]?.consultant_id ?? null : null));
    } catch {
      showToast.error('Les conversations n’ont pas pu être chargées.');
    } finally {
      setLoadingConversations(false);
    }
  }, [getToken]);

  const loadMessages = useCallback(
    async (consultantId: string) => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`/api/consultants/${consultantId}/messages`, { headers: { Authorization: `Bearer ${await getToken()}` } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setMessages(data.messages || []);
        setConversations((prev) => prev.map((c) => (c.consultant_id === consultantId ? { ...c, unread_count: 0 } : c)));
      } catch {
        showToast.error('Les messages n’ont pas pu être chargés.');
      } finally {
        setLoadingMessages(false);
      }
    },
    [getToken]
  );

  useEffect(() => {
    if (!authLoading && isAuthenticated) void loadConversations();
  }, [authLoading, isAuthenticated, loadConversations]);

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/consultants/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error();
      const m = await res.json();
      setMessages((prev) => [...prev, m]);
      setDraft('');
      setConversations((prev) =>
        prev
          .map((c) =>
            c.consultant_id === selectedId
              ? { ...c, last_message: { id: m.id, text: m.text, sender: m.sender, sent_at: m.sent_at, read_at: m.read_at ?? null } }
              : c
          )
          .sort((a, b) => new Date(b.last_message.sent_at).getTime() - new Date(a.last_message.sent_at).getTime())
      );
    } catch {
      showToast.error('Le message n’a pas pu être envoyé.');
    } finally {
      setSending(false);
    }
  };

  const filtered = conversations.filter((c) => c.consultant_name.toLowerCase().includes(query.toLowerCase()));
  const current = conversations.find((c) => c.consultant_id === selectedId);
  const currentName = current?.consultant_name ?? '';
  const first = currentName.split(' ')[0] || 'votre consultant';

  // Bandeau médicament : derniers messages du consultant restés sans réponse
  const showNudge = useMemo(() => {
    const unanswered: Message[] = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'praticien') break;
      unanswered.push(messages[i]);
    }
    return unanswered.some((m) => mentionsMedication(m.text));
  }, [messages]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="flex max-w-[1180px] overflow-hidden rounded-2xl border border-divider bg-surface" style={{ height: 'calc(100vh - 64px - 3.5rem)', minHeight: 560 }}>
      <Toaster />
      <aside
        aria-label="Conversations"
        className={cn('flex w-full min-w-0 flex-col border-r border-divider md:w-[320px] md:flex-none lg:w-[340px]', mobileShowChat && 'hidden md:flex')}
      >
        <div className="flex flex-col gap-3 px-4 pb-3 pt-[18px]">
          <h1 className="font-serif text-2xl font-medium text-charcoal">Messages</h1>
          <label className="flex h-10 items-center gap-2 rounded-[10px] border border-divider bg-cream px-3 text-stone focus-within:border-sage">
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Rechercher une conversation</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher"
              className="min-w-0 flex-1 bg-transparent text-sm text-charcoal outline-none"
            />
          </label>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="p-4"><SkeletonList items={5} /></div>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-stone">{query ? 'Aucune conversation ne correspond.' : 'Aucune conversation pour l’instant.'}</p>
          ) : (
            filtered.map((c) => {
              const on = c.consultant_id === selectedId;
              const unread = c.unread_count > 0;
              const preview = `${c.last_message.sender === 'praticien' ? 'Vous : ' : ''}${c.last_message.text}`;
              return (
                <button
                  key={c.consultant_id}
                  type="button"
                  aria-current={on ? 'true' : undefined}
                  onClick={() => {
                    setSelectedId(c.consultant_id);
                    setDraft('');
                    setMobileShowChat(true);
                  }}
                  className="flex w-full items-center gap-3 border-l-[3px] px-4 py-3 text-left text-charcoal"
                  style={{ borderLeftColor: on ? '#6DD4B8' : 'transparent', background: on ? '#1C2230' : 'transparent' }}
                >
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-[13px] font-semibold text-ink" style={{ background: colorOf(c.consultant_id) }}>
                    {initialsOf(c.consultant_name)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="flex justify-between gap-2">
                      <span className={cn('truncate text-sm', unread ? 'font-semibold' : 'font-medium')}>{c.consultant_name}</span>
                      <span className="flex-none text-xs text-stone">{listDate(c.last_message.sent_at)}</span>
                    </span>
                    <span className={cn('truncate text-[13px]', unread ? 'text-charcoal' : 'text-stone')}>{preview}</span>
                  </span>
                  {unread && <span aria-label="Non lu" className="h-2.5 w-2.5 flex-none rounded-full bg-terracotta" />}
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section aria-label="Conversation" className={cn('flex min-w-0 flex-1 flex-col', !mobileShowChat && 'hidden md:flex')}>
        {!selectedId ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-stone">
            <div>
              <p className="text-base font-medium text-charcoal">Choisissez une conversation</p>
              <p className="mt-1 text-sm">Les messages de vos consultants apparaissent ici.</p>
            </div>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-divider px-[22px] py-4">
              <button type="button" onClick={() => setMobileShowChat(false)} aria-label="Retour aux conversations" className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-charcoal md:hidden">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-[13px] font-semibold text-ink" style={{ background: colorOf(selectedId) }}>
                {initialsOf(currentName || '?')}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-base font-semibold text-charcoal">{currentName}</span>
                {current?.consultant_email && <span className="truncate text-[13px] text-stone">{current.consultant_email}</span>}
              </div>
              <Link href={`/consultants/${selectedId}`} className="inline-flex h-10 items-center rounded-[10px] border border-divider px-3.5 text-sm text-charcoal hover:border-sage">
                Ouvrir le dossier
              </Link>
            </header>

            <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-[22px]">
              {loadingMessages ? (
                <SkeletonMessage />
              ) : messages.length === 0 ? (
                <p className="m-auto text-center text-sm text-stone">Aucun message pour l’instant. Écrivez le premier message à {first}.</p>
              ) : (
                messages.map((m) => {
                  const me = m.sender === 'praticien';
                  return (
                    <div key={m.id} className={cn('flex flex-col gap-1', me ? 'items-end' : 'items-start')}>
                      <div
                        className="max-w-[min(62ch,85%)] whitespace-pre-wrap break-words border px-4 py-3 text-[15px] leading-[1.55] text-charcoal"
                        style={{
                          background: me ? '#23383B' : '#1C2230',
                          borderColor: me ? '#2F5A50' : '#2A3140',
                          borderRadius: me ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        }}
                      >
                        {m.text || '—'}
                      </div>
                      <span className="text-xs text-stone">{bubbleDate(m.sent_at)}</span>
                    </div>
                  );
                })
              )}

              {showNudge && (
                <div role="note" className="flex flex-wrap gap-3 rounded-xl border border-[#2E3A60] bg-[#1F2640] px-4 py-3.5">
                  <Info className="mt-0.5 h-[18px] w-[18px] flex-none text-[#A9B8EC]" aria-hidden="true" />
                  <div className="flex flex-[1_1_280px] flex-col gap-1">
                    <span className="text-sm font-semibold text-[#D4DCF6]">Question sur un médicament</span>
                    <span className="text-sm leading-normal text-[#B9C4EA]">
                      Ce point relève du médecin ou du pharmacien. C’est au médecin de juger de la compatibilité entre un traitement et vos recommandations : ne donnez pas d’avis sur ce médicament.
                    </span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <footer className="flex flex-col gap-2.5 border-t border-divider px-[22px] pb-[18px] pt-3.5">
              <label htmlFor="composer" className="sr-only">Votre message</label>
              <textarea
                id="composer"
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder={`Écrire à ${first}…`}
                className="w-full resize-y rounded-xl border border-divider bg-cream px-3.5 py-3 text-[15px] leading-normal text-charcoal outline-none focus:border-sage"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/bibliotheque?envoyer=${selectedId}`}
                  className="inline-flex h-10 items-center rounded-[10px] border border-divider px-3 text-sm text-charcoal hover:border-sage"
                >
                  Joindre une fiche
                </Link>
                <span className="hidden text-xs text-mist sm:inline">Ctrl + Entrée pour envoyer</span>
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={!draft.trim() || sending}
                  className="flex h-11 items-center gap-2 rounded-[10px] bg-sage px-5 text-sm font-semibold text-ink hover:bg-sage-deep disabled:bg-divider disabled:text-stone"
                >
                  {sending && <Spinner size="sm" />}
                  Envoyer
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesInner />
    </Suspense>
  );
}
