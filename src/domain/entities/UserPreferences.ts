import { NotificationType, NotificationChannel } from './Notification';

export interface ChannelPreferences {
  inApp: boolean;
  push: boolean;
  websocket: boolean;
}

export interface NotificationTypePreferences {
  [NotificationType.INFO]: ChannelPreferences;
  [NotificationType.SUCCESS]: ChannelPreferences;
  [NotificationType.WARNING]: ChannelPreferences;
  [NotificationType.ERROR]: ChannelPreferences;
  [NotificationType.SYSTEM]: ChannelPreferences;
}

export interface QuietHours {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  timezone: string;
}

export class UserPreferences {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public preferences: NotificationTypePreferences = UserPreferences.getDefaultPreferences(),
    public quietHours: QuietHours = UserPreferences.getDefaultQuietHours(),
    public language: string = 'es',
    public soundEnabled: boolean = true,
    public vibrationEnabled: boolean = true,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  static getDefaultPreferences(): NotificationTypePreferences {
    const defaultChannel: ChannelPreferences = {
      inApp: true,
      push: true,
      websocket: true
    };

    return {
      [NotificationType.INFO]: { ...defaultChannel },
      [NotificationType.SUCCESS]: { ...defaultChannel },
      [NotificationType.WARNING]: { ...defaultChannel },
      [NotificationType.ERROR]: { ...defaultChannel },
      [NotificationType.SYSTEM]: { ...defaultChannel }
    };
  }

  static getDefaultQuietHours(): QuietHours {
    return {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
      timezone: 'America/Mexico_City'
    };
  }

  updatePreference(
    type: NotificationType,
    channel: keyof ChannelPreferences,
    enabled: boolean
  ): void {
    this.preferences[type][channel] = enabled;
    this.updatedAt = new Date();
  }

  updateQuietHours(quietHours: Partial<QuietHours>): void {
    this.quietHours = { ...this.quietHours, ...quietHours };
    this.updatedAt = new Date();
  }

  isQuietHours(): boolean {
    if (!this.quietHours.enabled) return false;

    const now = new Date();
    const [startHour, startMinute] = this.quietHours.startTime.split(':').map(Number);
    const [endHour, endMinute] = this.quietHours.endTime.split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Quiet hours span midnight
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }

  shouldReceiveNotification(
    type: NotificationType,
    channel: NotificationChannel
  ): boolean {
    // Check quiet hours (except for URGENT priority - handled in domain service)
    if (this.isQuietHours()) return false;

    // Check preferences
    const typePrefs = this.preferences[type];
    if (!typePrefs) return false;

    switch (channel) {
      case NotificationChannel.IN_APP:
        return typePrefs.inApp;
      case NotificationChannel.PUSH:
        return typePrefs.push;
      case NotificationChannel.WEBSOCKET:
        return typePrefs.websocket;
      case NotificationChannel.ALL:
        return typePrefs.inApp || typePrefs.push || typePrefs.websocket;
      default:
        return false;
    }
  }

  getEnabledChannels(type: NotificationType): NotificationChannel[] {
    const channels: NotificationChannel[] = [];
    const typePrefs = this.preferences[type];

    if (typePrefs.inApp) channels.push(NotificationChannel.IN_APP);
    if (typePrefs.push) channels.push(NotificationChannel.PUSH);
    if (typePrefs.websocket) channels.push(NotificationChannel.WEBSOCKET);

    return channels;
  }
}
