import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationMetadata,
  NotificationAction
} from '@domain/entities/Notification';

export interface CreateNotificationDTO {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  metadata?: NotificationMetadata;
  actions?: NotificationAction[];
  expiresAt?: Date;
  imageUrl?: string;
  iconUrl?: string;
}

export interface BulkNotificationDTO {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  metadata?: NotificationMetadata;
  actions?: NotificationAction[];
  expiresAt?: Date;
  imageUrl?: string;
  iconUrl?: string;
}

export interface NotificationResponseDTO {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  metadata?: NotificationMetadata;
  actions?: NotificationAction[];
  expiresAt?: Date;
  imageUrl?: string;
  iconUrl?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  deliveredAt?: Date;
}

export interface QueryNotificationsDTO {
  userId: string;
  type?: NotificationType;
  isRead?: boolean;
  fromDate?: Date;
  toDate?: Date;
  priority?: NotificationPriority;
  limit?: number;
  skip?: number;
}

export interface SubscriptionDTO {
  userId: string;
  deviceType: 'WEB' | 'ANDROID' | 'IOS';
  endpoint?: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
  fcmToken?: string;
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    deviceName?: string;
  };
}

export interface PreferencesDTO {
  userId: string;
  preferences?: {
    INFO?: { inApp?: boolean; push?: boolean; websocket?: boolean };
    SUCCESS?: { inApp?: boolean; push?: boolean; websocket?: boolean };
    WARNING?: { inApp?: boolean; push?: boolean; websocket?: boolean };
    ERROR?: { inApp?: boolean; push?: boolean; websocket?: boolean };
    SYSTEM?: { inApp?: boolean; push?: boolean; websocket?: boolean };
  };
  quietHours?: {
    enabled?: boolean;
    startTime?: string;
    endTime?: string;
    timezone?: string;
  };
  language?: string;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
}
