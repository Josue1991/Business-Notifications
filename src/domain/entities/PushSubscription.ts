export enum DeviceType {
  WEB = 'WEB',
  ANDROID = 'ANDROID',
  IOS = 'IOS'
}

export interface VAPIDKeys {
  publicKey: string;
  privateKey: string;
}

export class PushSubscription {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly deviceType: DeviceType,
    public readonly endpoint: string,
    public readonly keys?: {
      p256dh: string;
      auth: string;
    }, // For Web Push (VAPID)
    public readonly fcmToken?: string, // For Firebase Cloud Messaging
    public readonly deviceInfo?: {
      userAgent?: string;
      platform?: string;
      deviceName?: string;
    },
    public isActive: boolean = true,
    public readonly createdAt: Date = new Date(),
    public lastUsedAt: Date = new Date(),
    public failureCount: number = 0,
    public lastFailureAt?: Date,
    public errorMessage?: string
  ) {}

  deactivate(): void {
    this.isActive = false;
  }

  activate(): void {
    this.isActive = true;
    this.failureCount = 0;
    this.errorMessage = undefined;
  }

  updateLastUsed(): void {
    this.lastUsedAt = new Date();
  }

  recordFailure(error: string): void {
    this.failureCount++;
    this.lastFailureAt = new Date();
    this.errorMessage = error;

    // Deactivate after 3 consecutive failures
    if (this.failureCount >= 3) {
      this.deactivate();
    }
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.errorMessage = undefined;
    this.updateLastUsed();
  }

  isExpired(): boolean {
    // Consider inactive if not used in 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    return this.lastUsedAt < ninetyDaysAgo;
  }

  isWebPush(): boolean {
    return this.deviceType === DeviceType.WEB && !!this.keys;
  }

  isFCM(): boolean {
    return (
      (this.deviceType === DeviceType.ANDROID || this.deviceType === DeviceType.IOS) &&
      !!this.fcmToken
    );
  }

  getIdentifier(): string {
    if (this.isWebPush()) {
      return this.endpoint;
    } else if (this.isFCM()) {
      return this.fcmToken!;
    }
    return this.id;
  }
}
