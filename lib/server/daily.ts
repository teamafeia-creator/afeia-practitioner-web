import 'server-only';

import { randomBytes } from 'crypto';
import { createAdminClient } from '../supabase/admin';
import { appUrl } from './booking';

const DAILY_API_BASE = 'https://api.daily.co/v1';

function getDailyApiKey(): string {
  const key = process.env.DAILY_API_KEY;
  if (!key) {
    throw new Error('DAILY_API_KEY is not configured');
  }
  return key;
}

function getDailyDomain(): string {
  return process.env.DAILY_DOMAIN || 'afeia.daily.co';
}

export function generateRoomName(appointmentId: string): string {
  return `afeia-${appointmentId.replace(/[^a-zA-Z0-9-]/g, '-')}`;
}

export async function createDailyRoom({
  name,
  expiresAt,
  maxParticipants = 2,
}: {
  name: string;
  expiresAt: Date;
  maxParticipants?: number;
}): Promise<{ url: string; name: string } | null> {
  try {
    const apiKey = getDailyApiKey();
    const domain = getDailyDomain();

    const response = await fetch(`${DAILY_API_BASE}/rooms`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        // Salle privée : entrée avec un jeton de réunion, ou sur demande acceptée par l'hôte.
        // Champ de premier niveau de l'API Daily, pas une propriété de salle.
        privacy: 'private',
        properties: {
          exp: Math.floor(expiresAt.getTime() / 1000),
          max_participants: maxParticipants,
          enable_chat: true,
          enable_screenshare: true,
          enable_knocking: true,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('Daily.co createRoom error:', response.status, body);
      return null;
    }

    const data = await response.json();
    return {
      url: typeof data.url === 'string' && data.url ? data.url : `https://${domain}/${data.name}`,
      name: data.name,
    };
  } catch (error) {
    console.error('Daily.co createRoom exception:', error);
    return null;
  }
}

/** Rend privée une salle existante (salles créées avant le passage en salles privées). */
export async function privatizeDailyRoom(roomName: string): Promise<boolean> {
  try {
    const apiKey = getDailyApiKey();

    const response = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ privacy: 'private' }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('Daily.co privatizeRoom error:', response.status, body);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Daily.co privatizeRoom exception:', error);
    return false;
  }
}

/** Secret du lien consultant (`?token=`), propre à chaque séance. */
function generateJoinToken(): string {
  return randomBytes(24).toString('base64url');
}

/** Lien de la page de consultation AFEIA pour le consultant (salle d'attente, contrôle horaire). */
export function consultantJoinUrl(appointmentId: string, joinToken: string): string {
  return `${appUrl()}/consultation/video/${appointmentId}?token=${joinToken}`;
}

/**
 * Salle Daily d'une séance, créée au besoin, avec le secret du lien consultant.
 * Idempotent : une séance qui a déjà sa salle et son secret est renvoyée telle quelle.
 * Renvoie null si Daily.co échoue (la séance reste valable, sans salle).
 */
export async function ensureVideoRoom(
  appointmentId: string
): Promise<{ roomName: string; joinToken: string } | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('appointments')
    .select('id, ends_at, video_room_name, video_join_token')
    .eq('id', appointmentId)
    .maybeSingle();

  if (error || !data) {
    console.error('ensureVideoRoom: appointment not found', appointmentId, error);
    return null;
  }

  const appointment = data as { id: string; ends_at: string; video_room_name: string | null; video_join_token: string | null };

  if (appointment.video_room_name && appointment.video_join_token) {
    return { roomName: appointment.video_room_name, joinToken: appointment.video_join_token };
  }

  // Le secret est conservé s'il existe déjà (salle supprimée puis recréée) : le lien envoyé reste valable
  const joinToken = appointment.video_join_token || generateJoinToken();

  // Salle créée avant les salles privées, sans secret : on la garde et on la rend privée
  if (appointment.video_room_name) {
    await privatizeDailyRoom(appointment.video_room_name);
    await supabase
      .from('appointments')
      .update({ video_join_token: joinToken, updated_at: new Date().toISOString() })
      .eq('id', appointmentId);
    return { roomName: appointment.video_room_name, joinToken };
  }

  const expiresAt = new Date(new Date(appointment.ends_at).getTime() + 30 * 60 * 1000); // +30 min
  const room = await createDailyRoom({ name: generateRoomName(appointmentId), expiresAt });
  if (!room) return null;

  const { error: updateError } = await supabase
    .from('appointments')
    .update({
      video_room_name: room.name,
      video_join_token: joinToken,
      video_link: room.url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId);

  if (updateError) {
    console.error('ensureVideoRoom: update failed', appointmentId, updateError);
    return null;
  }

  return { roomName: room.name, joinToken };
}

export async function deleteDailyRoom(roomName: string): Promise<boolean> {
  try {
    const apiKey = getDailyApiKey();

    const response = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('Daily.co deleteRoom error:', response.status, body);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Daily.co deleteRoom exception:', error);
    return false;
  }
}

export async function createMeetingToken({
  roomName,
  userName,
  isOwner,
  expiresAt,
}: {
  roomName: string;
  userName: string;
  isOwner: boolean;
  expiresAt?: Date;
}): Promise<{ token: string } | null> {
  try {
    const apiKey = getDailyApiKey();

    const properties: Record<string, unknown> = {
      room_name: roomName,
      user_name: userName,
      is_owner: isOwner,
    };

    if (expiresAt) {
      properties.exp = Math.floor(expiresAt.getTime() / 1000);
    }

    const response = await fetch(`${DAILY_API_BASE}/meeting-tokens`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('Daily.co createMeetingToken error:', response.status, body);
      return null;
    }

    const data = await response.json();
    return { token: data.token };
  } catch (error) {
    console.error('Daily.co createMeetingToken exception:', error);
    return null;
  }
}
