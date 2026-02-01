import { setupRealtime } from '../realtime';

describe('realtime', () => {
  it('creates a websocket connection with token', () => {
    const urls: string[] = [];
    const OriginalWebSocket = global.WebSocket;

    (global as any).WebSocket = class {
      onopen: (() => void) | null = null;
      onmessage: ((event: any) => void) | null = null;
      onerror: (() => void) | null = null;
      onclose: (() => void) | null = null;
      readyState = 1;

      constructor(url: string) {
        urls.push(url);
        if (this.onopen) {
          this.onopen();
        }
      }

      close() {
        if (this.onclose) {
          this.onclose();
        }
      }
    } as any;

    process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:4000';
    process.env.NEXT_PUBLIC_WS_TOKEN = 'token';

    const cleanup = setupRealtime({ invalidateQueries: jest.fn() } as any);
    cleanup();

    expect(urls[0]).toContain('/ws');
    expect(urls[0]).toContain('token=');

    global.WebSocket = OriginalWebSocket;
  });
});
