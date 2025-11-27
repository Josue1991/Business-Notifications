import { Notification } from '../entities/Notification';

export interface NotificationFilters {
  userId?: string;
  type?: string;
  isRead?: boolean;
  fromDate?: Date;
  toDate?: Date;
  priority?: string;
}

export interface INotificationRepository {
  save(notification: Notification): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findByUserId(
    userId: string,
    filters?: NotificationFilters,
    limit?: number,
    skip?: number
  ): Promise<Notification[]>;
  markAsRead(id: string): Promise<void>;
  markAsDelivered(id: string): Promise<void>;
  markAsFailed(id: string, error: string): Promise<void>;
  countUnread(userId: string): Promise<number>;
  deleteById(id: string): Promise<void>;
  deleteOlderThan(date: Date): Promise<number>;
  findUnreadByUserId(userId: string, limit?: number): Promise<Notification[]>;
}
