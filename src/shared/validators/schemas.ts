import { z } from 'zod';
import { NotificationType, NotificationChannel, NotificationPriority } from '@domain/entities/Notification';
import { DeviceType } from '@domain/entities/PushSubscription';

// Notification schemas
export const createNotificationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(500, 'Message too long'),
  channels: z.array(z.nativeEnum(NotificationChannel)).optional(),
  priority: z.nativeEnum(NotificationPriority).optional(),
  metadata: z.record(z.any()).optional(),
  actions: z.array(z.object({
    label: z.string(),
    url: z.string().optional(),
    action: z.string().optional(),
    data: z.any().optional()
  })).max(3, 'Maximum 3 actions allowed').optional(),
  expiresAt: z.string().datetime().optional(),
  imageUrl: z.string().url().optional(),
  iconUrl: z.string().url().optional()
});

export const bulkNotificationSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, 'At least one user ID is required'),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  channels: z.array(z.nativeEnum(NotificationChannel)).optional(),
  priority: z.nativeEnum(NotificationPriority).optional(),
  metadata: z.record(z.any()).optional(),
  actions: z.array(z.object({
    label: z.string(),
    url: z.string().optional(),
    action: z.string().optional(),
    data: z.any().optional()
  })).max(3).optional(),
  expiresAt: z.string().datetime().optional(),
  imageUrl: z.string().url().optional(),
  iconUrl: z.string().url().optional()
});

export const queryNotificationsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  type: z.nativeEnum(NotificationType).optional(),
  isRead: z.boolean().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  priority: z.nativeEnum(NotificationPriority).optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional()
});

// Subscription schemas
export const subscriptionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  deviceType: z.nativeEnum(DeviceType),
  endpoint: z.string().optional(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  }).optional(),
  fcmToken: z.string().optional(),
  deviceInfo: z.object({
    userAgent: z.string().optional(),
    platform: z.string().optional(),
    deviceName: z.string().optional()
  }).optional()
}).refine(
  (data) => {
    if (data.deviceType === DeviceType.WEB) {
      return !!data.endpoint && !!data.keys;
    }
    return !!data.fcmToken;
  },
  {
    message: 'Web Push requires endpoint and keys, Mobile requires fcmToken'
  }
);

// Preferences schemas
export const preferencesSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  preferences: z.object({
    INFO: z.object({
      inApp: z.boolean().optional(),
      push: z.boolean().optional(),
      websocket: z.boolean().optional()
    }).optional(),
    SUCCESS: z.object({
      inApp: z.boolean().optional(),
      push: z.boolean().optional(),
      websocket: z.boolean().optional()
    }).optional(),
    WARNING: z.object({
      inApp: z.boolean().optional(),
      push: z.boolean().optional(),
      websocket: z.boolean().optional()
    }).optional(),
    ERROR: z.object({
      inApp: z.boolean().optional(),
      push: z.boolean().optional(),
      websocket: z.boolean().optional()
    }).optional(),
    SYSTEM: z.object({
      inApp: z.boolean().optional(),
      push: z.boolean().optional(),
      websocket: z.boolean().optional()
    }).optional()
  }).optional(),
  quietHours: z.object({
    enabled: z.boolean().optional(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format').optional(),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format').optional(),
    timezone: z.string().optional()
  }).optional(),
  language: z.string().optional(),
  soundEnabled: z.boolean().optional(),
  vibrationEnabled: z.boolean().optional()
});

// Validation helper
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
