import webpush, { PushSubscription as WebPushSubscription } from 'web-push';
import { PushSubscription, DeviceType } from '@domain/entities/PushSubscription';
import { IPushProvider } from './IPushProvider';
import { config } from '@shared/config/config';
import { logger } from '@shared/utils/logger';

export class WebPushProvider implements IPushProvider {
  constructor() {
    // Configure VAPID keys
    webpush.setVapidDetails(
      config.webPush.vapidSubject,
      config.webPush.vapidPublicKey,
      config.webPush.vapidPrivateKey
    );

    logger.info('Web Push provider initialized with VAPID keys');
  }

  async send(
    subscription: PushSubscription,
    payload: {
      title: string;
      message: string;
      data?: any;
      icon?: string;
      image?: string;
      badge?: string;
      actions?: Array<{ action: string; title: string }>;
    }
  ): Promise<void> {
    if (!subscription.isWebPush()) {
      throw new Error('Subscription is not a Web Push subscription');
    }

    if (!subscription.isActive) {
      throw new Error('Subscription is not active');
    }

    const webPushSubscription: WebPushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys!.p256dh,
        auth: subscription.keys!.auth
      }
    };

    const notificationPayload = JSON.stringify({
      notification: {
        title: payload.title,
        body: payload.message,
        icon: payload.icon || '/icon.png',
        badge: payload.badge || '/badge.png',
        image: payload.image,
        data: payload.data,
        actions: payload.actions,
        timestamp: Date.now(),
        requireInteraction: false,
        tag: payload.data?.notificationId || 'default'
      }
    });

    try {
      await webpush.sendNotification(webPushSubscription, notificationPayload);
      logger.info(`Web Push notification sent to ${subscription.userId}`);
    } catch (error: any) {
      logger.error('Web Push send error:', error);

      // Handle specific errors
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription expired or not found
        throw new Error('SUBSCRIPTION_EXPIRED');
      } else if (error.statusCode === 401) {
        throw new Error('INVALID_VAPID_KEYS');
      }

      throw new Error(error.message || 'Failed to send Web Push notification');
    }
  }

  async sendBatch(
    subscriptions: PushSubscription[],
    payload: {
      title: string;
      message: string;
      data?: any;
      icon?: string;
      image?: string;
      badge?: string;
    }
  ): Promise<{ successful: string[]; failed: Array<{ id: string; error: string }> }> {
    const successful: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    const promises = subscriptions.map(async (subscription) => {
      try {
        await this.send(subscription, payload);
        successful.push(subscription.id);
      } catch (error: any) {
        failed.push({
          id: subscription.id,
          error: error.message || 'Unknown error'
        });
      }
    });

    await Promise.allSettled(promises);

    logger.info(`Batch send complete: ${successful.length} successful, ${failed.length} failed`);

    return { successful, failed };
  }

  public getPublicKey(): string {
    return config.webPush.vapidPublicKey;
  }
}
