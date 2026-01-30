'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { supabase } from '@/lib/supabase';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToNotifications,
  getNotificationTypeLabel
} from '@/services/notifications';
import type { Notification } from '@/lib/types';

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [practitionerId, setPractitionerId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get practitioner ID on mount
  useEffect(() => {
    async function getPractitionerId() {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.id) {
        setPractitionerId(data.session.user.id);
      }
    }
    getPractitionerId();
  }, []);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      const [notifs, count] = await Promise.all([
        getNotifications({ limit: 10 }),
        getUnreadNotificationCount()
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!practitionerId) return;

    const unsubscribe = subscribeToNotifications(
      practitionerId,
      (newNotification) => {
        // Add to top of list
        setNotifications((prev) => [newNotification, ...prev.slice(0, 9)]);
        setUnreadCount((prev) => prev + 1);
      },
      (error) => {
        console.error('Notification subscription error:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [practitionerId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.read) return;

    try {
      await markNotificationAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const getNotificationLink = (notification: Notification): string => {
    switch (notification.type) {
      case 'new_preliminary_questionnaire':
        if (notification.metadata?.questionnaire_id) {
          return `/questionnaires/${notification.metadata.questionnaire_id}`;
        }
        return '/questionnaires';
      case 'questionnaire_linked':
      case 'anamnesis_modified':
        if (notification.patient_id) {
          return `/patients/${notification.patient_id}`;
        }
        return '/patients';
      case 'message':
        if (notification.patient_id) {
          return `/patients/${notification.patient_id}?tab=messages`;
        }
        return '/patients';
      default:
        return '/dashboard';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-sable/50 transition"
        aria-label="Notifications"
      >
        <svg
          className="w-6 h-6 text-marine"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-aubergine text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-lg ring-1 ring-black/5 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
            <h3 className="font-semibold text-charcoal">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-teal hover:underline"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-warmgray text-sm">Chargement...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal/10 mx-auto mb-3">
                  <svg className="w-6 h-6 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-sm text-warmgray">Aucune notification</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={getNotificationLink(notification)}
                  onClick={() => {
                    handleMarkAsRead(notification);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'block px-4 py-3 hover:bg-sable/30 transition border-b border-black/5 last:border-0',
                    !notification.read && 'bg-teal/5'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Status indicator */}
                    <div
                      className={cn(
                        'mt-1.5 w-2 h-2 rounded-full shrink-0',
                        notification.read ? 'bg-warmgray/30' : 'bg-teal'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-warmgray">
                          {getNotificationTypeLabel(notification.type ?? 'general')}
                        </span>
                        {notification.level === 'attention' && (
                          <span className="text-xs px-1.5 py-0.5 bg-gold/20 text-gold rounded">
                            Important
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-charcoal truncate">
                        {notification.title}
                      </p>
                      {notification.description && (
                        <p className="text-xs text-warmgray mt-0.5 line-clamp-2">
                          {notification.description}
                        </p>
                      )}
                      <p className="text-xs text-warmgray/70 mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-black/5">
              <Link
                href="/notifications"
                className="text-xs text-teal hover:underline"
                onClick={() => setIsOpen(false)}
              >
                Voir toutes les notifications →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
