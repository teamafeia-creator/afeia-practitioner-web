import { supabase } from '../lib/supabase';
import type { Notification, NotificationType } from '../lib/types';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ============================================
// Notification CRUD Operations
// ============================================

/**
 * Get notifications for the current practitioner
 */
export async function getNotifications(params?: {
  unreadOnly?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (params?.unreadOnly) {
    query = query.eq('read', false);
  }

  if (params?.type) {
    query = query.eq('type', params.type);
  }

  if (params?.limit) {
    query = query.limit(params.limit);
  }

  if (params?.offset) {
    query = query.range(params.offset, params.offset + (params.limit ?? 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message ?? 'Impossible de charger les notifications.');
  }

  return (data ?? []) as Notification[];
}

/**
 * Get count of unread notifications
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('read', false);

  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) {
    throw new Error(error.message ?? 'Impossible de marquer la notification comme lue.');
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('read', false);

  if (error) {
    throw new Error(error.message ?? 'Impossible de marquer les notifications comme lues.');
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', notificationId);

  if (error) {
    throw new Error(error.message ?? 'Impossible de supprimer la notification.');
  }
}

/**
 * Delete all read notifications
 */
export async function deleteReadNotifications(): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('read', true);

  if (error) {
    throw new Error(error.message ?? 'Impossible de supprimer les notifications.');
  }
}

// ============================================
// Supabase Realtime Subscription
// ============================================

export type NotificationCallback = (notification: Notification) => void;

let realtimeChannel: RealtimeChannel | null = null;

/**
 * Subscribe to real-time notification updates
 * Returns an unsubscribe function
 */
export function subscribeToNotifications(
  practitionerId: string,
  onNewNotification: NotificationCallback,
  onError?: (error: Error) => void
): () => void {
  // Unsubscribe from existing channel if any
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  // Create new channel subscription
  realtimeChannel = supabase
    .channel(`notifications:${practitionerId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `practitioner_id=eq.${practitionerId}`
      },
      (payload: RealtimePostgresChangesPayload<Notification>) => {
        if (payload.new && 'id' in payload.new) {
          onNewNotification(payload.new as Notification);
        }
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to notifications realtime');
      }
      if (status === 'CHANNEL_ERROR' && onError) {
        onError(new Error(err?.message ?? 'Realtime subscription error'));
      }
    });

  // Return unsubscribe function
  return () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  };
}

/**
 * Unsubscribe from all notification channels
 */
export function unsubscribeFromNotifications(): void {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

// ============================================
// Notification Helpers
// ============================================

/**
 * Get human-readable label for notification type
 */
export function getNotificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case 'anamnesis_modified':
      return 'Anamnèse modifiée';
    case 'new_preliminary_questionnaire':
      return 'Nouveau questionnaire';
    case 'questionnaire_linked':
      return 'Questionnaire lié';
    case 'message':
      return 'Message';
    case 'appointment':
      return 'Rendez-vous';
    default:
      return 'Notification';
  }
}

/**
 * Get icon name for notification type (for use with icon libraries)
 */
export function getNotificationTypeIcon(type: NotificationType): string {
  switch (type) {
    case 'anamnesis_modified':
      return 'clipboard-edit';
    case 'new_preliminary_questionnaire':
      return 'file-text';
    case 'questionnaire_linked':
      return 'link';
    case 'message':
      return 'message-circle';
    case 'appointment':
      return 'calendar';
    default:
      return 'bell';
  }
}
