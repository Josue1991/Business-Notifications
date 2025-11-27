import { Collection } from 'mongodb';
import { Notification, NotificationType, NotificationChannel, NotificationPriority } from '@domain/entities/Notification';
import { INotificationRepository, NotificationFilters } from '@domain/repositories/INotificationRepository';
import { MongoDatabase } from './MongoDatabase';
import { logger } from '@shared/utils/logger';

interface NotificationDocument {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  metadata?: any;
  actions?: any[];
  expiresAt?: Date;
  imageUrl?: string;
  iconUrl?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
}

export class MongoNotificationRepository implements INotificationRepository {
  private collection: Collection<NotificationDocument>;

  constructor() {
    const db = MongoDatabase.getInstance();
    this.collection = db.getCollection<NotificationDocument>('notifications');
  }

  async save(notification: Notification): Promise<Notification> {
    try {
      const doc: NotificationDocument = {
        _id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        channels: notification.channels,
        priority: notification.priority,
        metadata: notification.metadata,
        actions: notification.actions,
        expiresAt: notification.expiresAt,
        imageUrl: notification.imageUrl,
        iconUrl: notification.iconUrl,
        isRead: notification.isRead,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
        deliveredAt: notification.deliveredAt,
        failedAt: notification.failedAt,
        errorMessage: notification.errorMessage
      };

      await this.collection.insertOne(doc as any);
      logger.info(`Notification ${notification.id} saved to MongoDB`);

      return notification;
    } catch (error: any) {
      logger.error('Error saving notification:', error);
      throw new Error('Failed to save notification');
    }
  }

  async findById(id: string): Promise<Notification | null> {
    try {
      const doc = await this.collection.findOne({ _id: id });
      return doc ? this.toEntity(doc) : null;
    } catch (error: any) {
      logger.error('Error finding notification:', error);
      throw new Error('Failed to find notification');
    }
  }

  async findByUserId(
    userId: string,
    filters?: NotificationFilters,
    limit: number = 20,
    skip: number = 0
  ): Promise<Notification[]> {
    try {
      const query: any = { userId };

      if (filters) {
        if (filters.type) query.type = filters.type;
        if (filters.isRead !== undefined) query.isRead = filters.isRead;
        if (filters.priority) query.priority = filters.priority;
        if (filters.fromDate || filters.toDate) {
          query.createdAt = {};
          if (filters.fromDate) query.createdAt.$gte = filters.fromDate;
          if (filters.toDate) query.createdAt.$lte = filters.toDate;
        }
      }

      const docs = await this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      return docs.map(doc => this.toEntity(doc));
    } catch (error: any) {
      logger.error('Error finding notifications by user:', error);
      throw new Error('Failed to find notifications');
    }
  }

  async markAsRead(id: string): Promise<void> {
    try {
      await this.collection.updateOne(
        { _id: id },
        { $set: { isRead: true, readAt: new Date() } }
      );
      logger.info(`Notification ${id} marked as read`);
    } catch (error: any) {
      logger.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  async markAsDelivered(id: string): Promise<void> {
    try {
      await this.collection.updateOne(
        { _id: id },
        { $set: { deliveredAt: new Date() } }
      );
    } catch (error: any) {
      logger.error('Error marking notification as delivered:', error);
      throw new Error('Failed to mark notification as delivered');
    }
  }

  async markAsFailed(id: string, error: string): Promise<void> {
    try {
      await this.collection.updateOne(
        { _id: id },
        { $set: { failedAt: new Date(), errorMessage: error } }
      );
    } catch (error: any) {
      logger.error('Error marking notification as failed:', error);
      throw new Error('Failed to mark notification as failed');
    }
  }

  async countUnread(userId: string): Promise<number> {
    try {
      return await this.collection.countDocuments({ userId, isRead: false });
    } catch (error: any) {
      logger.error('Error counting unread notifications:', error);
      throw new Error('Failed to count unread notifications');
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      await this.collection.deleteOne({ _id: id });
      logger.info(`Notification ${id} deleted`);
    } catch (error: any) {
      logger.error('Error deleting notification:', error);
      throw new Error('Failed to delete notification');
    }
  }

  async deleteOlderThan(date: Date): Promise<number> {
    try {
      const result = await this.collection.deleteMany({ createdAt: { $lt: date } });
      logger.info(`Deleted ${result.deletedCount} old notifications`);
      return result.deletedCount || 0;
    } catch (error: any) {
      logger.error('Error deleting old notifications:', error);
      throw new Error('Failed to delete old notifications');
    }
  }

  async findUnreadByUserId(userId: string, limit: number = 20): Promise<Notification[]> {
    try {
      const docs = await this.collection
        .find({ userId, isRead: false })
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit)
        .toArray();

      return docs.map(doc => this.toEntity(doc));
    } catch (error: any) {
      logger.error('Error finding unread notifications:', error);
      throw new Error('Failed to find unread notifications');
    }
  }

  private toEntity(doc: NotificationDocument): Notification {
    return new Notification(
      doc._id,
      doc.userId,
      doc.type,
      doc.title,
      doc.message,
      doc.channels,
      doc.priority,
      doc.metadata,
      doc.actions,
      doc.expiresAt,
      doc.imageUrl,
      doc.iconUrl,
      doc.isRead,
      doc.readAt,
      doc.createdAt,
      doc.deliveredAt,
      doc.failedAt,
      doc.errorMessage
    );
  }
}
