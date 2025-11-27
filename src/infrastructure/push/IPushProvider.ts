import { PushSubscription } from '@domain/entities/PushSubscription';

export interface IPushProvider {
  send(
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
  ): Promise<void>;
  
  sendBatch(
    subscriptions: PushSubscription[],
    payload: {
      title: string;
      message: string;
      data?: any;
      icon?: string;
      image?: string;
      badge?: string;
    }
  ): Promise<{ successful: string[]; failed: Array<{ id: string; error: string }> }>;
}
