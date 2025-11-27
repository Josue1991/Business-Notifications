import { PushSubscription, DeviceType } from '../entities/PushSubscription';

export interface ISubsriptionRepository {
  save(subscription: PushSubscription): Promise<PushSubscription>;
  findById(id: string): Promise<PushSubscription | null>;
  findByUserId(userId: string): Promise<PushSubscription[]>;
  findActiveByUserId(userId: string): Promise<PushSubscription[]>;
  findByEndpoint(endpoint: string): Promise<PushSubscription | null>;
  findByFCMToken(token: string): Promise<PushSubscription | null>;
  update(subscription: PushSubscription): Promise<PushSubscription>;
  deactivate(id: string): Promise<void>;
  deleteById(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<number>;
  deleteExpired(): Promise<number>;
  findByDeviceType(userId: string, deviceType: DeviceType): Promise<PushSubscription[]>;
}
