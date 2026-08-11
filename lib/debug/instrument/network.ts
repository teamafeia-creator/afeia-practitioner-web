/**
 * Capture de TOUTES les requêtes réseau (succès comme échecs) via wrappers
 * `fetch` et `XMLHttpRequest`.
 *
 * Chaque requête est publiée avec : méthode, URL, statut, durée, payload de
 * requête et corps de réponse tronqué à 1000 caractères. URL, en-têtes et corps
 * sont masqués. Les wrappers sont idempotents et restaurables (démontage).
 */
import { publish } from '../bus';
import { redactHeaders, redactString, redactToString, redactUrl } from '../redact';

const RESPONSE_TRUNCATE = 1000;

/** Payload d'un événement réseau. */
export interface NetworkPayload {
  method: string;
  url: string; // masquée
  rawUrl: string; // masquée aussi, mais conservée pour le rejeu
  status: number | string;
  ok: boolean;
  durationMs: number;
  requestBody?: string;
  requestHeaders?: Record<string, string>;
  responseBody?: string;
  error?: string;
}

function headersToObject(headers?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      out[key] = value;
    });
  } else if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      out[key] = value;
    });
  } else {
    Object.assign(out, headers);
  }
  return out;
}

async function bodyToString(body: BodyInit | null | undefined): Promise<string | undefined> {
  if (body == null) return undefined;
  if (typeof body === 'string') return redactToString(body);
  if (body instanceof URLSearchParams) return redactToString(body.toString());
  if (body instanceof FormData) {
    const entries: Record<string, string> = {};
    body.forEach((value, key) => {
      entries[key] = typeof value === 'string' ? value : '[fichier]';
    });
    return redactToString(entries);
  }
  return '[corps binaire]';
}

/** Wrappe `fetch`. */
function installFetch(): () => void {
  const originalFetch = window.fetch;
  if ((originalFetch as { __afeiaWrapped?: boolean }).__afeiaWrapped) return () => {};

  const wrapped = async function (
    this: unknown,
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const started = Date.now();
    const request = input instanceof Request ? input : undefined;
    const url = request ? request.url : String(input);
    const method = (init?.method || request?.method || 'GET').toUpperCase();
    const requestHeaders = redactHeaders(headersToObject(init?.headers || request?.headers));
    const requestBody = await bodyToString(init?.body ?? null);

    try {
      const response = await originalFetch.call(this as never, input as never, init);
      const durationMs = Date.now() - started;
      let responseBody: string | undefined;
      try {
        const clone = response.clone();
        const text = await clone.text();
        responseBody = redactString(text).slice(0, RESPONSE_TRUNCATE);
        if (text.length > RESPONSE_TRUNCATE) responseBody += `… [tronqué, ${text.length} car.]`;
      } catch {
        responseBody = '[réponse illisible]';
      }
      publish<NetworkPayload>('network', {
        method,
        url: redactUrl(url),
        rawUrl: redactUrl(url),
        status: response.status,
        ok: response.ok,
        durationMs,
        requestBody,
        requestHeaders,
        responseBody,
      });
      return response;
    } catch (error) {
      const durationMs = Date.now() - started;
      publish<NetworkPayload>('network', {
        method,
        url: redactUrl(url),
        rawUrl: redactUrl(url),
        status: 'ÉCHEC',
        ok: false,
        durationMs,
        requestBody,
        requestHeaders,
        error: redactString(error instanceof Error ? error.message : String(error)),
      });
      throw error;
    }
  } as typeof window.fetch;

  (wrapped as { __afeiaWrapped?: boolean }).__afeiaWrapped = true;
  window.fetch = wrapped;
  return () => {
    window.fetch = originalFetch;
  };
}

interface TrackedXHR extends XMLHttpRequest {
  __afeia?: { method: string; url: string; started: number; body?: string };
}

/** Wrappe `XMLHttpRequest`. */
function installXHR(): () => void {
  const proto = XMLHttpRequest.prototype;
  const originalOpen = proto.open;
  const originalSend = proto.send;
  if ((originalOpen as { __afeiaWrapped?: boolean }).__afeiaWrapped) return () => {};

  const open = function (
    this: TrackedXHR,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    this.__afeia = { method: method.toUpperCase(), url: String(url), started: 0 };
    // @ts-expect-error signature d'origine variadique
    return originalOpen.call(this, method, url, ...rest);
  };
  (open as { __afeiaWrapped?: boolean }).__afeiaWrapped = true;

  const send = function (this: TrackedXHR, body?: Document | XMLHttpRequestBodyInit | null) {
    const meta = this.__afeia;
    if (meta) {
      meta.started = Date.now();
      meta.body = typeof body === 'string' ? redactToString(body) : body ? '[corps]' : undefined;
      this.addEventListener('loadend', () => {
        const durationMs = Date.now() - meta.started;
        let responseBody: string | undefined;
        try {
          const text = typeof this.responseText === 'string' ? this.responseText : '';
          responseBody = redactString(text).slice(0, RESPONSE_TRUNCATE);
          if (text.length > RESPONSE_TRUNCATE) responseBody += `… [tronqué, ${text.length} car.]`;
        } catch {
          responseBody = '[réponse illisible]';
        }
        publish<NetworkPayload>('network', {
          method: meta.method,
          url: redactUrl(meta.url),
          rawUrl: redactUrl(meta.url),
          status: this.status || 'ÉCHEC',
          ok: this.status >= 200 && this.status < 400,
          durationMs,
          requestBody: meta.body,
          responseBody,
        });
      });
    }
    return originalSend.call(this, body as XMLHttpRequestBodyInit);
  };

  proto.open = open as typeof proto.open;
  proto.send = send as typeof proto.send;

  return () => {
    proto.open = originalOpen;
    proto.send = originalSend;
  };
}

/** Installe les captures fetch + XHR. Renvoie une fonction de démontage. */
export function installNetworkCapture(): () => void {
  if (typeof window === 'undefined') return () => {};
  const teardownFetch = installFetch();
  const teardownXHR = installXHR();
  return () => {
    teardownFetch();
    teardownXHR();
  };
}
