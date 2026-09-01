import type { NotificationSocketMessage } from "@/types/notification";
import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";

/**
 * Hàm xác định URL kết nối WebSocket STOMP.
 * - Ưu tiên lấy biến môi trường `EXPO_PUBLIC_WS_URL` trong file .env
 * - Fallback mặc định: ws://192.168.10.170:8000/ws
 */
export function getWebSocketUrl(): string {
  return process.env.EXPO_PUBLIC_WS_URL || "ws://192.168.10.170:8000/ws";
}

// Kiểu dữ liệu cho callback nhận tin nhắn từ kênh STOMP
type MessageCallback<T = any> = (message: T) => void;

// Kiểu dữ liệu cho callback lắng nghe trạng thái kết nối mạng WebSocket
type ConnectionCallback = (connected: boolean) => void;

/**
 * Service quản lý kết nối WebSocket STOMP (Real-time) toàn cục cho ứng dụng Mobile.
 * 
 * Các tính năng chính:
 * 1. Tự động kết nối và xác thực qua JWT token.
 * 2. Cơ chế Heartbeat (10s) và Auto-reconnect (5s) khi mất mạng.
 * 3. Tự động phục hồi (Re-subscribe) các kênh đã đăng ký sau khi kết nối lại.
 * 4. Hỗ trợ nhận thông báo cá nhân, bản đồ thảm họa, và gửi tọa độ GPS thực địa.
 */
class WebSocketService {
  // Instance STOMP Client của thư viện @stomp/stompjs
  private client: Client | null = null;

  // Cờ trạng thái kết nối hiện tại
  private isClientConnected: boolean = false;

  // Quản lý các subscription đang active trên Broker: Key = destination, Value = StompSubscription
  private activeSubscriptions: Map<string, StompSubscription> = new Map();

  // Quản lý danh sách các kênh chờ: Key = destination, Value = Callback. Dùng để tự động re-subscribe khi reconnect
  private pendingSubscriptions: Map<string, MessageCallback> = new Map();

  // Danh sách các listener theo dõi sự thay đổi trạng thái kết nối (Connected / Disconnected)
  private connectionListeners: Set<ConnectionCallback> = new Set();

  // Lưu trữ JWT Access Token hiện tại để gửi kèm theo Header khi kết nối hoặc publish dữ liệu
  private currentToken?: string;

  /**
   * Khởi tạo và thiết lập kết nối đến WebSocket STOMP Server.
   * 
   * @param token JWT Access Token dùng để xác thực người dùng (nếu có)
   */
  public connect(token?: string): void {
    this.currentToken = token;

    // Nếu client đã tồn tại và đang kết nối ổn định thì không cần khởi tạo lại
    if (this.client && this.isClientConnected) {
      return;
    }

    const wsUrl = getWebSocketUrl();

    // Khởi tạo STOMP Client với các cấu hình kết nối mạng
    this.client = new Client({
      brokerURL: wsUrl,
      // Gắn Bearer Token vào header kết nối CONNECT frame của STOMP
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      // Nhịp tim kiểm tra liveness: nhận/gửi mỗi 10 giây
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // Thời gian chờ để tự động kết nối lại khi mất mạng (5 giây)
      reconnectDelay: 5000,
      // In log debug khi chạy ở môi trường phát triển (__DEV__)
      debug: (msg: string) => {
        if (__DEV__) {
          console.log("[STOMP WS Debug]:", msg);
        }
      },
      // Callback khi kết nối thành công đến STOMP Broker
      onConnect: () => {
        this.isClientConnected = true;
        this.notifyConnectionListeners(true);
        if (__DEV__) {
          console.log("[STOMP WS] Connected successfully to:", wsUrl);
        }

        // Tự động đăng ký lại toàn bộ các topic/queue đang chờ
        this.resubscribePending();
      },
      // Callback khi ngắt kết nối
      onDisconnect: () => {
        this.isClientConnected = false;
        this.notifyConnectionListeners(false);
        if (__DEV__) {
          console.log("[STOMP WS] Disconnected");
        }
      },
      // Callback khi server STOMP trả về lỗi (ví dụ: Sai quyền hạn, Token hết hạn)
      onStompError: (frame) => {
        console.error("[STOMP WS] Broker error:", frame.headers["message"], frame.body);
      },
      // Callback khi tầng Transport WebSocket xảy ra lỗi
      onWebSocketError: (event) => {
        console.warn("[STOMP WS] WebSocket error event:", event);
      },
      // Callback khi socket bị đóng
      onWebSocketClose: () => {
        this.isClientConnected = false;
        this.notifyConnectionListeners(false);
      },
    });

    // Kích hoạt tiến trình kết nối
    this.client.activate();
  }

  /**
   * Ngắt kết nối WebSocket và giải phóng tài nguyên.
   * Thường được gọi khi người dùng đăng xuất hoặc tắt app.
   */
  public disconnect(): void {
    if (this.client) {
      // Hủy toàn bộ subscriptions đang hoạt động trên server
      this.activeSubscriptions.forEach((sub) => sub.unsubscribe());
      this.activeSubscriptions.clear();
      this.pendingSubscriptions.clear();

      // Vô hiệu hóa client STOMP
      this.client.deactivate();
      this.client = null;
      this.isClientConnected = false;
      this.notifyConnectionListeners(false);
    }
  }

  /**
   * Đăng ký lắng nghe thông báo khẩn cấp / nhiệm vụ riêng của User.
   * Endpoint trên Broker: `/topic/notifications/{userId}`
   * 
   * @param userId UUID của user nhận thông báo
   * @param callback Hàm callback xử lý payload NotificationSocketMessage
   * @returns Hàm hủy đăng ký (unsubscribe)
   */
  public subscribeToUserNotifications(
    userId: string,
    callback: MessageCallback<NotificationSocketMessage>,
  ): () => void {
    const destination = `/topic/notifications/${userId}`;
    return this.subscribe<NotificationSocketMessage>(destination, callback);
  }

  /**
   * Đăng ký nhận message từ một kênh STOMP bất kỳ (`/topic/...`, `/queue/...`).
   * 
   * @param destination Kênh đích STOMP cần lắng nghe
   * @param callback Hàm callback xử lý dữ liệu nhận được
   * @returns Hàm hủy đăng ký (unsubscribe) tương ứng
   */
  public subscribe<T = any>(
    destination: string,
    callback: MessageCallback<T>,
  ): () => void {
    // 1. Lưu callback vào danh sách chờ để có thể tự động subscribe lại nếu bị mất kết nối (reconnect)
    this.pendingSubscriptions.set(destination, callback);

    // 2. Nếu socket đang kết nối sẵn, thực hiện subscribe lên STOMP broker ngay
    if (this.client && this.isClientConnected) {
      this.performSubscription(destination, callback);
    }

    // 3. Trả về hàm cleanup hủy đăng ký cho component sử dụng (ví dụ trong useEffect)
    return () => {
      this.unsubscribe(destination);
    };
  }

  /**
   * Hủy đăng ký một kênh STOMP và xóa khỏi danh sách theo dõi.
   * 
   * @param destination Kênh đích cần hủy
   */
  public unsubscribe(destination: string): void {
    const existingSub = this.activeSubscriptions.get(destination);
    if (existingSub) {
      existingSub.unsubscribe();
      this.activeSubscriptions.delete(destination);
    }
    this.pendingSubscriptions.delete(destination);
  }

  /**
   * Gửi message từ Mobile lên Server qua STOMP (Tương ứng với `@MessageMapping` trên Spring Boot).
   * 
   * @param destination Kênh đích tiếp nhận (VD: `/app/location-log`)
   * @param body Dữ liệu payload (Object hoặc Chuỗi)
   */
  public send(destination: string, body: any): void {
    if (this.client && this.isClientConnected) {
      this.client.publish({
        destination,
        body: typeof body === "string" ? body : JSON.stringify(body),
        headers: this.currentToken
          ? { Authorization: `Bearer ${this.currentToken}` }
          : {},
      });
    } else {
      console.warn("[STOMP WS] Cannot send message, client is not connected");
    }
  }

  /**
   * Đăng ký lắng nghe sự kiện thay đổi trạng thái kết nối (Connected / Disconnected).
   * 
   * @param listener Callback nhận boolean trạng thái mạng
   * @returns Hàm hủy listener
   */
  public onConnectionChange(listener: ConnectionCallback): () => void {
    this.connectionListeners.add(listener);
    // Gọi ngay lập tức với trạng thái hiện tại để UI đồng bộ kịp thời
    listener(this.isClientConnected);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  /**
   * Kiểm tra xem WebSocket hiện tại có đang trong trạng thái kết nối hay không.
   */
  public isConnected(): boolean {
    return this.isClientConnected;
  }

  /**
   * [Private] Hàm thực thi việc đăng ký kênh với STOMP Broker và parse JSON dữ liệu nhận về.
   * 
   * @param destination Kênh đích STOMP
   * @param callback Callback xử lý dữ liệu sau khi parse JSON thành công
   */
  private performSubscription<T = any>(
    destination: string,
    callback: MessageCallback<T>,
  ): void {
    if (!this.client || !this.isClientConnected) return;

    // Nếu kênh này đã từng có subscription cũ, tiến hành hủy trước khi tạo mới để tránh trùng lặp tin nhắn
    const oldSub = this.activeSubscriptions.get(destination);
    if (oldSub) {
      oldSub.unsubscribe();
    }

    try {
      // Gọi subscribe thông qua STOMP Client
      const subscription = this.client.subscribe(
        destination,
        (message: IMessage) => {
          if (__DEV__) {
            console.log(`[STOMP WS] 📥 Nhận gói tin từ: ${destination}`);
          }
          try {
            // Tự động chuyển đổi chuỗi JSON từ message.body thành Object kiểu T
            const parsed = JSON.parse(message.body) as T;
            callback(parsed);
          } catch (e) {
            console.error("[STOMP WS] Parse message JSON error:", e, message.body);
          }
        },
      );

      // Lưu lại subscription để quản lý vòng đời
      this.activeSubscriptions.set(destination, subscription);
      if (__DEV__) {
        console.log(`[STOMP WS] Subscribed to: ${destination}`);
      }
    } catch (error) {
      console.error(`[STOMP WS] Error subscribing to ${destination}:`, error);
    }
  }

  /**
   * [Private] Tự động đăng ký lại tất cả các kênh đang lưu trong pendingSubscriptions.
   * Hàm này được kích hoạt tự động trong sự kiện onConnect (khi vừa kết nối hoặc sau khi reconnect).
   */
  private resubscribePending(): void {
    this.pendingSubscriptions.forEach((callback, destination) => {
      this.performSubscription(destination, callback);
    });
  }

  /**
   * [Private] Thông báo trạng thái kết nối tới tất cả các listener đã đăng ký.
   * 
   * @param connected Trạng thái kết nối (true: Đã kết nối, false: Mất kết nối)
   */
  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (e) {
        console.error("[STOMP WS] Connection listener error:", e);
      }
    });
  }
  
}

// Xuất ra một instance duy nhất (Singleton Pattern) để dùng xuyên suốt ứng dụng
export const websocketService = new WebSocketService();

