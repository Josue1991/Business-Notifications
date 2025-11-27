import { INotificationRepository } from '@domain/repositories/INotificationRepository';
import { AppError } from '@shared/errors/AppError';

export class MarkAsRead {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(notificationId: string, userId: string): Promise<void> {
    try {
      const notification = await this.notificationRepository.findById(notificationId);

      if (!notification) {
        throw new AppError('Notification not found', 404);
      }

      if (notification.userId !== userId) {
        throw new AppError('Unauthorized to mark this notification as read', 403);
      }

      if (notification.isRead) {
        return; // Already read, nothing to do
      }

      notification.markAsRead();
      await this.notificationRepository.markAsRead(notificationId);
    } catch (error: any) {
      throw new AppError(
        error.message || 'Failed to mark notification as read',
        error.statusCode || 500
      );
    }
  }

  async executeMany(notificationIds: string[], userId: string): Promise<void> {
    try {
      for (const id of notificationIds) {
        await this.execute(id, userId);
      }
    } catch (error: any) {
      throw new AppError(
        error.message || 'Failed to mark notifications as read',
        error.statusCode || 500
      );
    }
  }
}
