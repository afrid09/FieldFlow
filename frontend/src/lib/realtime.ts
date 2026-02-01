// Purpose: Realtime WebSocket bridge.
import { QueryClient } from '@tanstack/react-query';

const getWebSocketUrl = () => {
  const baseUrl =
    process.env.NEXT_PUBLIC_WS_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3000';

  const normalizedBase = baseUrl.replace(/\/$/, '');
  const wsBase = normalizedBase.replace(/^http/, 'ws');
  const wsUrl = new URL(`${wsBase}/ws`);
  const token = process.env.NEXT_PUBLIC_WS_TOKEN;
  if (token) {
    wsUrl.searchParams.set('token', token);
  }
  return wsUrl.toString();
};

const invalidateForEvent = (queryClient: QueryClient, eventType?: string) => {
  switch (eventType) {
    case 'FIELD_CREATED':
    case 'FIELD_UPDATED':
    case 'FIELD_DELETED':
      queryClient.invalidateQueries({ queryKey: ['fields'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
      break;
    case 'NOTIFICATIONS_UPDATED':
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      break;
    default:
      queryClient.invalidateQueries({ queryKey: ['fields'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      break;
  }
};

export const setupRealtime = (queryClient: QueryClient) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  let socket: WebSocket | null = null;
  let closed = false;
  let retryCount = 0;

  const connect = () => {
    const wsUrl = getWebSocketUrl();
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      retryCount = 0;
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string);
        invalidateForEvent(queryClient, message?.type);
      } catch {
        invalidateForEvent(queryClient);
      }
    };

    socket.onerror = () => {
      if (closed) {
        return;
      }
      socket?.close();
    };

    socket.onclose = () => {
      if (closed) {
        return;
      }
      retryCount += 1;
      const delay = Math.min(10000, 1000 * 2 ** retryCount);
      window.setTimeout(connect, delay);
    };
  };

  connect();

  return () => {
    closed = true;
    socket?.close();
  };
};
