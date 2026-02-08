'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NoMessages } from '@/components/ui/EmptyState';
import { SkeletonMessage, SkeletonList } from '@/components/ui/Skeleton';
import { Send, ArrowLeft, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import type { Message } from '@/lib/types';

// ---- Types ----

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

// ---- Helpers ----

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "a l'instant";
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---- Component ----

export default function MessagesPage() {
  const { user, loading: authLoading, isAuthenticated } = useRequireAuth('/login');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  // Pre-select conversation from URL ?consultant=xxx
  useEffect(() => {
    const param = searchParams.get('consultant');
    if (param) {
      setSelectedId(param);
      setMobileShowChat(true);
    }
  }, [searchParams]);

  // ---- Data fetching ----

  const getToken = useCallback(async (): Promise<string> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || '';
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch('/api/messages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur chargement');
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Erreur chargement conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [getToken]);

  const loadMessages = useCallback(
    async (consultantId: string) => {
      setLoadingMessages(true);
      try {
        const token = await getToken();
        const res = await fetch(`/api/consultants/${consultantId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Erreur chargement messages');
        const data = await res.json();
        setMessages(data.messages || []);

        // Reset unread count in conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.consultant_id === consultantId ? { ...c, unread_count: 0 } : c
          )
        );
      } catch (err) {
        console.error('Erreur chargement messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    },
    [getToken]
  );

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadConversations();
    }
  }, [authLoading, isAuthenticated, loadConversations]);

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
    }
  }, [selectedId, loadMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ---- Actions ----

  const handleSelectConversation = (consultantId: string) => {
    setSelectedId(consultantId);
    setMobileShowChat(true);
  };

  const handleBack = () => {
    setMobileShowChat(false);
  };

  const handleSend = async () => {
    if (!messageText.trim() || !selectedId || sending) return;

    setSending(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/consultants/${selectedId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: messageText.trim() }),
      });

      if (res.ok) {
        const newMessage = await res.json();
        setMessages((prev) => [...prev, newMessage]);
        setMessageText('');

        // Update last message in conversation list
        setConversations((prev) =>
          prev
            .map((c) =>
              c.consultant_id === selectedId
                ? {
                    ...c,
                    last_message: {
                      id: newMessage.id,
                      text: newMessage.text,
                      sender: newMessage.sender,
                      sent_at: newMessage.sent_at,
                      read_at: newMessage.read_at ?? null,
                    },
                  }
                : c
            )
            .sort(
              (a, b) =>
                new Date(b.last_message.sent_at).getTime() -
                new Date(a.last_message.sent_at).getTime()
            )
        );
      }
    } catch (err) {
      console.error('Erreur envoi message:', err);
    } finally {
      setSending(false);
    }
  };

  // ---- Derived state ----

  const filteredConversations = conversations.filter((c) =>
    c.consultant_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConversation = conversations.find(
    (c) => c.consultant_id === selectedId
  );

  // ---- Loading state ----

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-warmgray">Chargement...</div>
      </div>
    );
  }

  // ---- Render ----

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="glass-card overflow-hidden"
      style={{ height: 'calc(100vh - 64px - 3rem)' }}
    >
      <div className="flex h-full">
        {/* ---- Left column: conversation list ---- */}
        <div
          className={cn(
            'w-full md:w-[340px] lg:w-[360px] border-r border-teal/10 flex flex-col flex-shrink-0',
            mobileShowChat && 'hidden md:flex'
          )}
        >
          {/* Header + search */}
          <div className="p-4 border-b border-teal/10">
            <h2 className="text-lg font-semibold text-charcoal mb-3">
              Conversations
            </h2>
            <Input
              placeholder="Rechercher un consultant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="p-4">
                <SkeletonList items={4} />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6">
                <NoMessages />
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.consultant_id}
                  onClick={() => handleSelectConversation(conv.consultant_id)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-teal/5 transition-colors hover:bg-teal/5',
                    selectedId === conv.consultant_id && 'bg-teal/10'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={conv.consultant_name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-charcoal truncate">
                          {conv.consultant_name}
                        </span>
                        <span className="text-[11px] text-warmgray flex-shrink-0 ml-2">
                          {formatRelativeTime(conv.last_message.sent_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-warmgray truncate">
                          {conv.last_message.sender === 'praticien'
                            ? 'Vous : '
                            : ''}
                          {conv.last_message.text}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="ml-2 flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-teal text-[10px] font-bold text-white">
                            {conv.unread_count > 9
                              ? '9+'
                              : conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ---- Right column: chat ---- */}
        <div
          className={cn(
            'flex-1 flex flex-col min-w-0',
            !mobileShowChat && 'hidden md:flex'
          )}
        >
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-warmgray">
                <p className="text-base font-medium">
                  Selectionnez une conversation
                </p>
                <p className="text-sm mt-1">
                  Choisissez un consultant dans la liste pour voir ses messages
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-teal/10 flex items-center gap-3">
                <button
                  onClick={handleBack}
                  className="md:hidden p-1.5 rounded-lg text-charcoal hover:bg-teal/10 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Avatar
                  name={selectedConversation?.consultant_name || ''}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-charcoal truncate">
                    {selectedConversation?.consultant_name}
                  </p>
                  {selectedConversation?.consultant_email && (
                    <p className="text-xs text-warmgray truncate">
                      {selectedConversation.consultant_email}
                    </p>
                  )}
                </div>
                <Link
                  href={`/consultants/${selectedId}`}
                  className="flex items-center gap-1 text-xs text-teal hover:text-teal-dark transition-colors"
                >
                  Voir la fiche
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <SkeletonMessage />
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-warmgray">
                      <p className="text-sm">
                        Aucun message pour l&apos;instant.
                      </p>
                      <p className="text-xs mt-1">
                        Envoyez le premier message a votre consultant.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex',
                        msg.sender === 'praticien'
                          ? 'justify-end'
                          : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[78%] rounded-lg px-4 py-2 text-sm',
                          msg.sender === 'praticien'
                            ? 'bg-teal text-white'
                            : 'bg-sable/80 text-marine'
                        )}
                      >
                        <p className="break-words whitespace-pre-wrap">
                          {msg.text || '\u2014'}
                        </p>
                        <p
                          className={cn(
                            'mt-1 text-[11px]',
                            msg.sender === 'praticien'
                              ? 'text-white/60'
                              : 'text-warmgray'
                          )}
                        >
                          {formatMessageTime(msg.sent_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Send area */}
              <div className="border-t border-teal/10 p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ecrire un message..."
                    className="flex-1 rounded-sm border border-teal/20 bg-white/50 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-warmgray/80 transition duration-200 focus:border-teal focus:outline-none focus:ring-[3px] focus:ring-teal/10"
                  />
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleSend}
                    disabled={!messageText.trim() || sending}
                    loading={sending}
                    icon={<Send className="h-4 w-4" />}
                  >
                    <span className="hidden sm:inline">Envoyer</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
