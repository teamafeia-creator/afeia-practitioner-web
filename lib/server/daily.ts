import 'server-only';

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
      url: `https://${domain}/${data.name}`,
      name: data.name,
    };
  } catch (error) {
    console.error('Daily.co createRoom exception:', error);
    return null;
  }
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
