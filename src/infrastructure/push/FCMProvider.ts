import admin, { ServiceAccount } from 'firebase-admin';
import { PushSubscription, DeviceType } from '@domain/entities/PushSubscription';
import { IPushProvider } from './IPushProvider';
import { config } from '@shared/config/config';
import { logger } from '@shared/utils/logger';

export class FCMProvider implements IPushProvider {
  private messaging: admin.messaging.Messaging;

  constructor() {
    // Initialize Firebase Admin with service account
    try {
      const serviceAccount: ServiceAccount = {
        projectId: config.fcm.projectId,
        privateKey: config.fcm.privateKey.replace(/\\n/g, '\n'),
        clientEmail: config.fcm.clientEmail
      };

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      }

      this.messaging = admin.messaging();
      logger.info('Firebase Cloud Messaging initialized');
    } catch (error: any) {
      logger.error('Failed to initialize FCM:', error);
      throw error;
    }
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
    if (!subscription.isFCM()) {
      throw new Error('Subscription is not a FCM subscription');
    }

    if (!subscription.isActive) {
      throw new Error('Subscription is not active');
    }

    const fcmToken = subscription.fcmToken!;

    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.message,
        imageUrl: payload.image
      },
      data: {
        ...payload.data,
        icon: payload.icon || '',
        badge: payload.badge || '',
        actions: JSON.stringify(payload.actions || [])
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          priority: 'high',
          icon: payload.icon,
          imageUrl: payload.image,
          color: '#007bff'
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.message
            },
            badge: 1,
            sound: 'default'
          }
        },
        fcmOptions: {
          imageUrl: payload.image
        }
      }
    };

    try {
      const response = await this.messaging.send(message);
      logger.info(`FCM notification sent to ${subscription.userId}: ${response}`);
    } catch (error: any) {
      logger.error('FCM send error:', error);

      // Handle specific FCM errors
      if (
        error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token'
      ) {
        throw new Error('SUBSCRIPTION_EXPIRED');
      } else if (error.code === 'messaging/authentication-error') {
        throw new Error('INVALID_FCM_CREDENTIALS');
      }

      throw new Error(error.message || 'Failed to send FCM notification');
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

    // FCM supports batch sending (up to 500 tokens)
    const tokens = subscriptions
      .filter(s => s.isFCM() && s.isActive)
      .map(s => s.fcmToken!);

    if (tokens.length === 0) {
      return { successful, failed };
    }

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.message,
        imageUrl: payload.image
      },
      data: {
        ...payload.data,
        icon: payload.icon || '',
        badge: payload.badge || ''
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          priority: 'high',
          icon: payload.icon,
          imageUrl: payload.image,
          color: '#007bff'
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.message
            },
            badge: 1,
            sound: 'default'
          }
        },
        fcmOptions: {
          imageUrl: payload.image
        }
      }
    };

    try {
      const response = await this.messaging.sendEachForMulticast(message);

      response.responses.forEach((res, index) => {
        const subscription = subscriptions[index];
        if (res.success) {
          successful.push(subscription.id);
        } else {
          failed.push({
            id: subscription.id,
            error: res.error?.message || 'Unknown error'
          });
        }
      });

      logger.info(
        `FCM batch send complete: ${response.successCount} successful, ${response.failureCount} failed`
      );
    } catch (error: any) {
      logger.error('FCM batch send error:', error);
      // Mark all as failed
      subscriptions.forEach(sub => {
        failed.push({
          id: sub.id,
          error: error.message || 'Batch send failed'
        });
      });
    }

    return { successful, failed };
  }

  async sendToTopic(
    topic: string,
    payload: {
      title: string;
      message: string;
      data?: any;
    }
  ): Promise<void> {
    const message: admin.messaging.Message = {
      topic,
      notification: {
        title: payload.title,
        body: payload.message
      },
      data: payload.data
    };

    try {
      const response = await this.messaging.send(message);
      logger.info(`FCM topic notification sent to ${topic}: ${response}`);
    } catch (error: any) {
      logger.error('FCM topic send error:', error);
      throw new Error(error.message || 'Failed to send FCM topic notification');
    }
  }
}
