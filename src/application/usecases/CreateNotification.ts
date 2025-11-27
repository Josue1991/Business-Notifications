import { v4 as uuidv4 } from 'uuid';
import {
  Notification,
  NotificationChannel,
  NotificationPriority
} from '@domain/entities/Notification';
import { INotificationRepository } from '@domain/repositories/INotificationRepository';
import { IUserPreferencesRepository } from '@domain/repositories/IUserPreferencesRepository';
import { NotificationDomainService } from '@domain/services/NotificationDomainService';
import { CreateNotificationDTO, NotificationResponseDTO } from '../dto/NotificationDTO';
import { AppError } from '@shared/errors/AppError';

export class CreateNotification {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly preferencesRepository: IUserPreferencesRepository,
    private readonly domainService: NotificationDomainService
  ) {}

  async execute(dto: CreateNotificationDTO): Promise<NotificationResponseDTO> {
    try {
      // Get user preferences
      const preferences = await this.preferencesRepository.findByUserId(dto.userId);

      // Determine channels based on preferences
      let channels = dto.channels || [NotificationChannel.ALL];
      if (preferences) {
        const enabledChannels = preferences.getEnabledChannels(dto.type);
        if (enabledChannels.length > 0 && !dto.channels) {
          channels = enabledChannels;
        }
      }

      // Create notification entity
      const notification = new Notification(
        uuidv4(),
        dto.userId,
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

      return this.toResponseDTO(saved);
    } catch (error: any) {
      throw new AppError(
        error.message || 'Failed to create notification',
        error.statusCode || 500
      );
    }
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
