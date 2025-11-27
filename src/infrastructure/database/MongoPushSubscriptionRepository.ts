import { Collection } from 'mongodb';
import { PushSubscription, DeviceType } from '@domain/entities/PushSubscription';
import { ISubsriptionRepository } from '@domain/repositories/IPushSubscriptionRepository';
import { MongoDatabase } from './MongoDatabase';
import { logger } from '@shared/utils/logger';

interface PushSubscriptionDocument {
  _id: string;
  userId: string;
  deviceType: DeviceType;
  endpoint: string;
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
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date;
  failureCount: number;
  lastFailureAt?: Date;
  errorMessage?: string;
}

export class MongoPushSubscriptionRepository implements ISubsriptionRepository {
  private collection: Collection<PushSubscriptionDocument>;

  constructor() {
    const db = MongoDatabase.getInstance();
    this.collection = db.getCollection<PushSubscriptionDocument>('push_subscriptions');
  }

  async save(subscription: PushSubscription): Promise<PushSubscription> {
    try {
      const doc: PushSubscriptionDocument = {
        _id: subscription.id,
        userId: subscription.userId,
        deviceType: subscription.deviceType,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        fcmToken: subscription.fcmToken,
        deviceInfo: subscription.deviceInfo,
        isActive: subscription.isActive,
        createdAt: subscription.createdAt,
        lastUsedAt: subscription.lastUsedAt,
        failureCount: subscription.failureCount,
        lastFailureAt: subscription.lastFailureAt,
        errorMessage: subscription.errorMessage
      };

      await this.collection.insertOne(doc as any);
      logger.info(`Push subscription ${subscription.id} saved`);

      return subscription;
    } catch (error: any) {
      logger.error('Error saving push subscription:', error);
      throw new Error('Failed to save push subscription');
    }
  }

  async findById(id: string): Promise<PushSubscription | null> {
    try {
      const doc = await this.collection.findOne({ _id: id });
      return doc ? this.toEntity(doc) : null;
    } catch (error: any) {
      logger.error('Error finding push subscription:', error);
      throw new Error('Failed to find push subscription');
    }
  }

  async findByUserId(userId: string): Promise<PushSubscription[]> {
    try {
      const docs = await this.collection.find({ userId }).toArray();
      return docs.map(doc => this.toEntity(doc));
    } catch (error: any) {
      logger.error('Error finding push subscriptions by user:', error);
      throw new Error('Failed to find push subscriptions');
    }
  }

  async findActiveByUserId(userId: string): Promise<PushSubscription[]> {
    try {
      const docs = await this.collection.find({ userId, isActive: true }).toArray();
      return docs.map(doc => this.toEntity(doc));
    } catch (error: any) {
      logger.error('Error finding active push subscriptions:', error);
      throw new Error('Failed to find active push subscriptions');
    }
  }

  async findByEndpoint(endpoint: string): Promise<PushSubscription | null> {
    try {
      const doc = await this.collection.findOne({ endpoint });
      return doc ? this.toEntity(doc) : null;
    } catch (error: any) {
      logger.error('Error finding push subscription by endpoint:', error);
      throw new Error('Failed to find push subscription by endpoint');
    }
  }

  async findByFCMToken(token: string): Promise<PushSubscription | null> {
    try {
      const doc = await this.collection.findOne({ fcmToken: token });
      return doc ? this.toEntity(doc) : null;
    } catch (error: any) {
      logger.error('Error finding push subscription by FCM token:', error);
      throw new Error('Failed to find push subscription by FCM token');
    }
  }

  async update(subscription: PushSubscription): Promise<PushSubscription> {
    try {
      const doc: PushSubscriptionDocument = {
        _id: subscription.id,
        userId: subscription.userId,
        deviceType: subscription.deviceType,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        fcmToken: subscription.fcmToken,
        deviceInfo: subscription.deviceInfo,
        isActive: subscription.isActive,
        createdAt: subscription.createdAt,
        lastUsedAt: subscription.lastUsedAt,
        failureCount: subscription.failureCount,
        lastFailureAt: subscription.lastFailureAt,
        errorMessage: subscription.errorMessage
      };

      await this.collection.replaceOne({ _id: subscription.id }, doc as any);
      logger.info(`Push subscription ${subscription.id} updated`);

      return subscription;
    } catch (error: any) {
      logger.error('Error updating push subscription:', error);
      throw new Error('Failed to update push subscription');
    }
  }

  async deactivate(id: string): Promise<void> {
    try {
      await this.collection.updateOne({ _id: id }, { $set: { isActive: false } });
      logger.info(`Push subscription ${id} deactivated`);
    } catch (error: any) {
      logger.error('Error deactivating push subscription:', error);
      throw new Error('Failed to deactivate push subscription');
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      await this.collection.deleteOne({ _id: id });
      logger.info(`Push subscription ${id} deleted`);
    } catch (error: any) {
      logger.error('Error deleting push subscription:', error);
      throw new Error('Failed to delete push subscription');
    }
  }

  async deleteByUserId(userId: string): Promise<number> {
    try {
      const result = await this.collection.deleteMany({ userId });
      logger.info(`Deleted ${result.deletedCount} push subscriptions for user ${userId}`);
      return result.deletedCount || 0;
    } catch (error: any) {
      logger.error('Error deleting push subscriptions by user:', error);
      throw new Error('Failed to delete push subscriptions by user');
    }
  }

  async deleteExpired(): Promise<number> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await this.collection.deleteMany({
        lastUsedAt: { $lt: ninetyDaysAgo }
      });

      logger.info(`Deleted ${result.deletedCount} expired push subscriptions`);
      return result.deletedCount || 0;
    } catch (error: any) {
      logger.error('Error deleting expired push subscriptions:', error);
      throw new Error('Failed to delete expired push subscriptions');
    }
  }

  async findByDeviceType(userId: string, deviceType: DeviceType): Promise<PushSubscription[]> {
    try {
      const docs = await this.collection.find({ userId, deviceType }).toArray();
      return docs.map(doc => this.toEntity(doc));
    } catch (error: any) {
      logger.error('Error finding push subscriptions by device type:', error);
      throw new Error('Failed to find push subscriptions by device type');
    }
  }

  private toEntity(doc: PushSubscriptionDocument): PushSubscription {
    return new PushSubscription(
      doc._id,
      doc.userId,
      doc.deviceType,
      doc.endpoint,
      doc.keys,
      doc.fcmToken,
      doc.deviceInfo,
      doc.isActive,
      doc.createdAt,
      doc.lastUsedAt,
      doc.failureCount,
      doc.lastFailureAt,
      doc.errorMessage
    );
  }
}
