import { v4 as uuidv4 } from 'uuid';
import {
  Notification,
  NotificationChannel,
  NotificationPriority
} from '@domain/entities/Notification';
import { INotificationRepository } from '@domain/repositories/INotificationRepository';
import { IUserPreferencesRepository } from '@domain/repositories/IUserPreferencesRepository';
import { NotificationDomainService } from '@domain/services/NotificationDomainService';
import { BulkNotificationDTO, NotificationResponseDTO } from '../dto/NotificationDTO';
import { AppError } from '@shared/errors/AppError';

export class SendBulkNotifications {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly preferencesRepository: IUserPreferencesRepository,
    private readonly domainService: NotificationDomainService
  ) {}

  async execute(dto: BulkNotificationDTO): Promise<{
    successful: NotificationResponseDTO[];
    failed: Array<{ userId: string; error: string }>;
  }> {
    const successful: NotificationResponseDTO[] = [];
    const failed: Array<{ userId: string; error: string }> = [];

    for (const userId of dto.userIds) {
      try {
        // Get user preferences
        const preferences = await this.preferencesRepository.findByUserId(userId);

        // Determine channels based on preferences
        let channels = dto.channels || [NotificationChannel.ALL];
        if (preferences) {
          const enabledChannels = preferences.getEnabledChannels(dto.type);
          if (enabledChannels.length > 0 && !dto.channels) {
            channels = enabledChannels;
          }

          // Check if user should receive this notification
          if (channels.length === 0) {
            failed.push({ userId, error: 'User has disabled all channels for this type' });
            continue;
          }
        }

        // Create notification entity
        const notification = new Notification(
          uuidv4(),
          userId,
          dto.type,
          dto.title,
          dto.message,
          channels,
          dto.priority || NotificationPriority.NORMAL,
          dto.metadata,
          dto.actions,
          dto.expiresAt || this.domainService.calculateExpiryDate(30),
          dto.imageUrl,
          dto.iconUrl
        );

        // Validate notification
        this.domainService.validateNotification(notification);

        // Save to repository
        const saved = await this.notificationRepository.save(notification);
        successful.push(this.toResponseDTO(saved));
      } catch (error: any) {
        failed.push({
          userId,
          error: error.message || 'Failed to create notification'
        });
      }
    }

    return { successful, failed };
  }

  async executeBatched(
    dto: BulkNotificationDTO,
    batchSize: number = 100
  ): Promise<{
    successful: NotificationResponseDTO[];
    failed: Array<{ userId: string; error: string }>;
  }> {
    const allSuccessful: NotificationResponseDTO[] = [];
    const allFailed: Array<{ userId: string; error: string }> = [];

    // Split userIds into batches
    for (let i = 0; i < dto.userIds.length; i += batchSize) {
      const batch = dto.userIds.slice(i, i + batchSize);
      const batchDto = { ...dto, userIds: batch };

      const result = await this.execute(batchDto);
      allSuccessful.push(...result.successful);
      allFailed.push(...result.failed);
    }

    return { successful: allSuccessful, failed: allFailed };
  }

  private toResponseDTO(notification: Notification): NotificationResponseDTO {
    return {
      id: notification.id,
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
      deliveredAt: notification.deliveredAt
    };
  }
}
