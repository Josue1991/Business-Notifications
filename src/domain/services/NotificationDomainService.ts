import {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationPriority
} from '../entities/Notification';
import { UserPreferences } from '../entities/UserPreferences';

export class NotificationDomainService {
  validateNotification(notification: Notification): void {
    if (!notification.userId || notification.userId.trim() === '') {
      throw new Error('User ID is required');
    }

    if (!notification.title || notification.title.trim() === '') {
      throw new Error('Notification title is required');
    }

    if (!notification.message || notification.message.trim() === '') {
      throw new Error('Notification message is required');
    }

    if (notification.title.length > 100) {
      throw new Error('Notification title cannot exceed 100 characters');
    }

    if (notification.message.length > 500) {
      throw new Error('Notification message cannot exceed 500 characters');
    }

    if (notification.channels.length === 0) {
      throw new Error('At least one notification channel is required');
    }

    if (notification.expiresAt && notification.expiresAt <= new Date()) {
      throw new Error('Expiration date must be in the future');
    }

    if (notification.actions && notification.actions.length > 3) {
      throw new Error('Maximum 3 actions allowed per notification');
    }
  }

  shouldSendToUser(
    notification: Notification,
    preferences: UserPreferences,
    channel: NotificationChannel
  ): boolean {
    // URGENT notifications bypass quiet hours
    if (notification.priority === NotificationPriority.URGENT) {
      return preferences.shouldReceiveNotification(notification.type, channel);
    }

    // Check quiet hours and preferences
    if (preferences.isQuietHours()) {
      return false;
    }

    return preferences.shouldReceiveNotification(notification.type, channel);
  }

  getPriorityWeight(priority: NotificationPriority): number {
    const weights = {
      [NotificationPriority.LOW]: 1,
      [NotificationPriority.NORMAL]: 2,
      [NotificationPriority.HIGH]: 3,
      [NotificationPriority.URGENT]: 4
    };
    return weights[priority];
  }

  sortByPriority(notifications: Notification[]): Notification[] {
    return notifications.sort((a, b) => {
      const weightDiff = this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority);
      if (weightDiff !== 0) return weightDiff;
      // If same priority, sort by creation date (newest first)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  groupByUser(notifications: Notification[]): Map<string, Notification[]> {
    const grouped = new Map<string, Notification[]>();

    for (const notification of notifications) {
      const userNotifications = grouped.get(notification.userId) || [];
      userNotifications.push(notification);
      grouped.set(notification.userId, userNotifications);
    }

    return grouped;
  }

  shouldBatch(notifications: Notification[]): boolean {
    // Batch if more than 5 notifications for the same user
    return notifications.length > 5;
  }

  createBatchSummary(notifications: Notification[]): string {
    const typeCount = notifications.reduce((acc, notif) => {
      acc[notif.type] = (acc[notif.type] || 0) + 1;
      return acc;
    }, {} as Record<NotificationType, number>);

    const parts: string[] = [];
    for (const [type, count] of Object.entries(typeCount)) {
      parts.push(`${count} ${type.toLowerCase()}`);
    }

    return `You have ${notifications.length} new notifications: ${parts.join(', ')}`;
  }

  filterExpired(notifications: Notification[]): Notification[] {
    return notifications.filter(n => !n.isExpired());
  }

  calculateExpiryDate(daysFromNow: number = 30): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  }
}
