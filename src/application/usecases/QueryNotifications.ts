import { INotificationRepository } from '@domain/repositories/INotificationRepository';
import { NotificationDomainService } from '@domain/services/NotificationDomainService';
import { QueryNotificationsDTO, NotificationResponseDTO } from '../dto/NotificationDTO';
import { AppError } from '@shared/errors/AppError';

export class QueryNotifications {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly domainService: NotificationDomainService
  ) {}

  async execute(dto: QueryNotificationsDTO): Promise<{
    notifications: NotificationResponseDTO[];
    total: number;
    unreadCount: number;
  }> {
    try {
      const limit = dto.limit || 20;
      const skip = dto.skip || 0;

      const filters = {
        type: dto.type,
        isRead: dto.isRead,
        fromDate: dto.fromDate,
        toDate: dto.toDate,
        priority: dto.priority
      };

      const notifications = await this.notificationRepository.findByUserId(
        dto.userId,
        filters,
        limit,
        skip
      );

      const unreadCount = await this.notificationRepository.countUnread(dto.userId);

      // Filter out expired notifications
      const validNotifications = this.domainService.filterExpired(notifications);

      return {
        notifications: validNotifications.map(n => this.toResponseDTO(n)),
        total: validNotifications.length,
        unreadCount
      };
    } catch (error: any) {
      throw new AppError(
        error.message || 'Failed to query notifications',
        error.statusCode || 500
      );
    }
  }

  async getUnread(userId: string, limit?: number): Promise<NotificationResponseDTO[]> {
    try {
      const notifications = await this.notificationRepository.findUnreadByUserId(
        userId,
        limit || 20
      );

      const validNotifications = this.domainService.filterExpired(notifications);
      const sorted = this.domainService.sortByPriority(validNotifications);

      return sorted.map(n => this.toResponseDTO(n));
    } catch (error: any) {
      throw new AppError(
        error.message || 'Failed to get unread notifications',
        error.statusCode || 500
      );
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.notificationRepository.countUnread(userId);
    } catch (error: any) {
      throw new AppError(
        error.message || 'Failed to get unread count',
        error.statusCode || 500
      );
    }
  }

  private toResponseDTO(notification: any): NotificationResponseDTO {
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
