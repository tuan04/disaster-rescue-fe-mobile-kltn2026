import { getAccessToken } from "@/helpers/secureStore";
import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";

export type MessageCallback<T = any> = (message: T) => void;
export type ConnectionCallback = (connected: boolean) => void;

interface SubscriptionEntry {
  id: number;
  destination: string;
  callback: MessageCallback;
  stompSub?: StompSubscription;
}

export class WebSocketClient {
  private client: Client | null = null;
  private isClientConnected: boolean = false;
  private subscriptions: Map<number, SubscriptionEntry> = new Map();
  private subIdCounter: number = 0;
  private connectionListeners: Set<ConnectionCallback> = new Set();
  private currentToken?: string;

  public async connect(token?: string): Promise<void> {
    if (this.client && this.isClientConnected) return;

    let resolvedToken = token;
    if (!resolvedToken) {
      try {
        resolvedToken = (await getAccessToken()) || undefined;
      } catch {
        resolvedToken = undefined;
      }
    }
    this.currentToken = resolvedToken;

    if (this.client) {
      try {
        this.client.deactivate();
      } catch {}
      this.client = null;
    }

    const wsUrl = process.env.EXPO_PUBLIC_WS_URL as string;

    this.client = new Client({
      brokerURL: wsUrl,
      connectHeaders: resolvedToken
        ? { Authorization: `Bearer ${resolvedToken}` }
        : {},
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      reconnectDelay: 5000,
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      debug: (msg: string) => {
        if (__DEV__) {
          console.log("[STOMP WS Debug]:", msg);
        }
      },
      onConnect: () => {
        this.isClientConnected = true;
        this.notifyListeners(true);
        if (__DEV__) {
          console.log("[STOMP WS] Connected to:", wsUrl);
        }
        this.resubscribeAll();
      },
      onDisconnect: () => {
        this.isClientConnected = false;
        this.notifyListeners(false);
        if (__DEV__) {
          console.log("[STOMP WS] Disconnected");
        }
      },
      onStompError: (frame) => {
        console.error(
          "[STOMP WS] Broker error:",
          frame.headers["message"],
          frame.body,
        );
      },
    });

    this.client.activate();
  }

  public async reconnect(token?: string): Promise<void> {
    this.disconnect();
    await this.connect(token);
  }

  public disconnect(): void {
    if (!this.client) return;

    this.subscriptions.forEach((entry) => {
      try {
        entry.stompSub?.unsubscribe();
      } catch {}
      entry.stompSub = undefined;
    });

    try {
      this.client.deactivate();
    } catch {}

    this.client = null;
    this.isClientConnected = false;
    this.notifyListeners(false);
  }

  public subscribe<T = any>(
    destination: string,
    callback: MessageCallback<T>,
  ): () => void {
    const id = ++this.subIdCounter;
    const entry: SubscriptionEntry = { id, destination, callback };
    this.subscriptions.set(id, entry);

    if (this.client && this.isClientConnected) {
      this.performSubscribe(entry);
    } else {
      this.connect().catch((err) => {
        console.error("[STOMP WS] Auto-connect error:", err);
      });
    }

    return () => {
      try {
        entry.stompSub?.unsubscribe();
      } catch {}
      this.subscriptions.delete(id);
    };
  }

  public send(destination: string, body: any): void {
    const payload = typeof body === "string" ? body : JSON.stringify(body);

    if (!this.client || !this.isClientConnected) {
      this.connect().then(() => {
        this.client?.publish({
          destination,
          body: payload,
          headers: this.currentToken
            ? { Authorization: `Bearer ${this.currentToken}` }
            : {},
        });
      });
      return;
    }

    this.client.publish({
      destination,
      body: payload,
      headers: this.currentToken
        ? { Authorization: `Bearer ${this.currentToken}` }
        : {},
    });
  }

  public onConnectionChange(listener: ConnectionCallback): () => void {
    this.connectionListeners.add(listener);
    listener(this.isClientConnected);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  public isConnected(): boolean {
    return this.isClientConnected;
  }

  private performSubscribe(entry: SubscriptionEntry): void {
    if (!this.client || !this.isClientConnected) return;

    try {
      entry.stompSub = this.client.subscribe(
        entry.destination,
        (message: IMessage) => {
          if (__DEV__) {
            console.log(`[STOMP WS] 📥 Message from ${entry.destination}`);
          }
          try {
            const parsed = JSON.parse(message.body);
            entry.callback(parsed);
          } catch (e) {
            console.error("[STOMP WS] JSON parse error:", e, message.body);
          }
        },
      );
    } catch (error) {
      console.error(
        `[STOMP WS] Subscribe error (${entry.destination}):`,
        error,
      );
    }
  }

  private resubscribeAll(): void {
    this.subscriptions.forEach((entry) => {
      this.performSubscribe(entry);
    });
  }

  private notifyListeners(connected: boolean): void {
    this.connectionListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (e) {
        console.error("[STOMP WS] Listener error:", e);
      }
    });
  }
}

export const websocketService = new WebSocketClient();

export const subscribe = <T = any>(
  destination: string,
  callback: MessageCallback<T>,
): (() => void) => websocketService.subscribe<T>(destination, callback);

export const send = (destination: string, body: any): void =>
  websocketService.send(destination, body);
