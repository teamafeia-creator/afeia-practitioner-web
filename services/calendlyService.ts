const CALENDLY_API_TOKEN = process.env.CALENDLY_API_TOKEN;
const CALENDLY_API_URL = process.env.CALENDLY_API_URL ?? 'https://api.calendly.com';

type CalendlyRequestOptions = {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
};

function getAuthHeaders() {
  if (!CALENDLY_API_TOKEN) {
    throw new Error('CALENDLY_API_TOKEN is not set');
  }

  return {
    Authorization: `Bearer ${CALENDLY_API_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

async function calendlyRequest<T>(endpoint: string, options: CalendlyRequestOptions = {}) {
  const response = await fetch(`${CALENDLY_API_URL}${endpoint}`, {
    method: options.method ?? 'GET',
    headers: getAuthHeaders(),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Calendly API error (${response.status}): ${errorBody}`);
  }

  return (await response.json()) as T;
}

function getEventUuid(eventUri: string) {
  try {
    const url = new URL(eventUri);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1];
  } catch {
    throw new Error('Invalid Calendly event URI');
  }
}

export async function getUserInfo<T = unknown>() {
  return calendlyRequest<T>('/users/me');
}

export async function getEventTypes<T = unknown>(userUri?: string) {
  const params = new URLSearchParams();
  if (userUri) {
    params.set('user', userUri);
  }

  const query = params.toString();
  return calendlyRequest<T>(`/event_types${query ? `?${query}` : ''}`);
}

type ScheduledEventsParams = {
  minStartTime?: string;
  maxStartTime?: string;
  status?: string;
};

export async function listScheduledEvents<T = unknown>(userUri: string, params: ScheduledEventsParams) {
  if (!userUri) {
    throw new Error('userUri is required to list scheduled events');
  }

  const searchParams = new URLSearchParams({ user: userUri });
  if (params.minStartTime) {
    searchParams.set('min_start_time', params.minStartTime);
  }
  if (params.maxStartTime) {
    searchParams.set('max_start_time', params.maxStartTime);
  }
  if (params.status) {
    searchParams.set('status', params.status);
  }

  return calendlyRequest<T>(`/scheduled_events?${searchParams.toString()}`);
}

export async function getEventInvitees<T = unknown>(eventUri: string) {
  const eventUuid = getEventUuid(eventUri);
  return calendlyRequest<T>(`/scheduled_events/${eventUuid}/invitees`);
}

export async function cancelEvent<T = unknown>(eventUri: string, reason?: string) {
  const eventUuid = getEventUuid(eventUri);
  return calendlyRequest<T>(`/scheduled_events/${eventUuid}/cancellation`, {
    method: 'POST',
    body: reason ? { reason } : {},
  });
}
