import { v4 as uuidv4 } from 'uuid';
import { PushSubscription, DeviceType } from '@domain/entities/PushSubscription';
import { ISubsriptionRepository } from '@domain/repositories/IPushSubscriptionRepository';
import { SubscriptionDTO } from '../dto/NotificationDTO';
import { AppError } from '@shared/errors/AppError';

export class ManageSubscription {
  constructor(private readonly subscriptionRepository: ISubsriptionRepository) {}

  async subscribe(dto: SubscriptionDTO): Promise<PushSubscription> {
    try {
      // Validate device type
      if (!Object.values(DeviceType).includes(dto.deviceType as DeviceType)) {
        throw new AppError('Invalid device type', 400);
      }

      // Check if subscription already exists
      let existing: PushSubscription | null = null;

      if (dto.deviceType === 'WEB' && dto.endpoint) {
        existing = await this.subscriptionRepository.findByEndpoint(dto.endpoint);
      } else if (dto.fcmToken) {
        existing = await this.subscriptionRepository.findByFCMToken(dto.fcmToken);
      }

      if (existing) {
        // Update existing subscription
        existing.activate();
        existing.updateLastUsed();
        return await this.subscriptionRepository.update(existing);
      }

      // Create new subscription
      const subscription = new PushSubscription(
        uuidv4(),
        dto.userId,
        dto.deviceType as DeviceType,
        dto.endpoint || '',
        dto.keys,
        dto.fcmToken,
        dto.deviceInfo
      );

      // Validate subscription data
      this.validateSubscription(subscription);

      return await this.subscriptionRepository.save(subscription);
    } catch (error: any) {
      throw new AppError(
        error.message || 'Failed to create subscription',
        error.statusCode || 500
      );
    }
  }

  async unsubscribe(subscriptionId: string, userId: string): Promise<void> {
    try {
      const subscription = await this.subscriptionRepository.findById(subscriptionId);

      if (!subscription) {
        throw new AppError('Subscription not found', 404);
      }

      if (subscription.userId !== userId) {
        throw new AppError('Unauthorized to delete this subscription', 403);
      }

      await this.subscriptionRepository.deleteById(subscriptionId);
    } catch (error: any) {
      throw new AppError(
        error.message || 'Failed to unsubscribe',
        error.statusCode || 500
      );
    }
  }

  async getSubscriptions(userId: string): Promise<PushSubscription[]> {
    try {
      return await this.subscriptionRepository.findActiveByUserId(userId);
    } catch (error: any) {
      throw new AppError(
        error.message || 'Failed to get subscriptions',
        error.statusCode || 500
      );
    }
  }

  async deactivateSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.subscriptionRepository.deactivate(subscriptionId);
    } catch (error: any) {
      throw new AppError(
        error.message || 'Failed to deactivate subscription',
        error.statusCode || 500
      );
    }
  }

  async cleanupExpired(): Promise<number> {
    try {
      return await this.subscriptionRepository.deleteExpired();
    } catch (error: any) {
      throw new AppError(
        error.message || 'Failed to cleanup expired subscriptions',
        error.statusCode || 500
      );
    }
  }

  private validateSubscription(subscription: PushSubscription): void {
    if (subscription.deviceType === DeviceType.WEB) {
      if (!subscription.endpoint) {
        throw new AppError('Endpoint is required for Web Push', 400);
      }
      if (!subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
        throw new AppError('VAPID keys are required for Web Push', 400);
      }
    }

    if (
      subscription.deviceType === DeviceType.ANDROID ||
      subscription.deviceType === DeviceType.IOS
    ) {
      if (!subscription.fcmToken) {
        throw new AppError('FCM token is required for mobile devices', 400);
      }
    }
  }
}
