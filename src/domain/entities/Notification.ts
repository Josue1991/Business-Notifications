export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SYSTEM = 'SYSTEM'
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
  WEBSOCKET = 'WEBSOCKET',
  ALL = 'ALL'
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface NotificationMetadata {
  [key: string]: any;
}

export interface NotificationAction {
  label: string;
  url?: string;
  action?: string;
  data?: any;
}

export class Notification {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly type: NotificationType,
    public readonly title: string,
    public readonly message: string,
    public readonly channels: NotificationChannel[],
    public readonly priority: NotificationPriority = NotificationPriority.NORMAL,
    public readonly metadata?: NotificationMetadata,
    public readonly actions?: NotificationAction[],
    public readonly expiresAt?: Date,
    public readonly imageUrl?: string,
    public readonly iconUrl?: string,
    public isRead: boolean = false,
    public readAt?: Date,
    public readonly createdAt: Date = new Date(),
    public deliveredAt?: Date,
    public failedAt?: Date,
    public errorMessage?: string
  ) {}

  markAsRead(): void {
    if (!this.isRead) {
      this.isRead = true;
      this.readAt = new Date();
    }
  }

  markAsDelivered(): void {
    this.deliveredAt = new Date();
  }

  markAsFailed(error: string): void {
    this.failedAt = new Date();
    this.errorMessage = error;
  }

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  shouldSendPush(): boolean {
    return (
      this.channels.includes(NotificationChannel.PUSH) ||
      this.channels.includes(NotificationChannel.ALL)
    );
  }

  shouldSendWebSocket(): boolean {
    return (
      this.channels.includes(NotificationChannel.WEBSOCKET) ||
      this.channels.includes(NotificationChannel.IN_APP) ||
      this.channels.includes(NotificationChannel.ALL)
    );
  }

  shouldStoreInDatabase(): boolean {
    return (
      this.channels.includes(NotificationChannel.IN_APP) ||
      this.channels.includes(NotificationChannel.ALL)
    );
  }

  getPriorityWeight(): number {
    const weights = {
      [NotificationPriority.LOW]: 1,
      [NotificationPriority.NORMAL]: 2,
      [NotificationPriority.HIGH]: 3,
      [NotificationPriority.URGENT]: 4
    };
    return weights[this.priority];
  }
}
