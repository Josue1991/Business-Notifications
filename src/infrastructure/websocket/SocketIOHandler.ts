import { Socket } from 'socket.io';
import { WebSocketManager } from './WebSocketManager';
import { QueryNotifications } from '@application/usecases/QueryNotifications';
import { MarkAsRead } from '@application/usecases/MarkAsRead';
import { logger } from '@shared/utils/logger';
import { AppError } from '@shared/errors/AppError';
import { NotificationResponseDTO } from '@application/dto/NotificationDTO';

export class SocketIOHandler {
  constructor(
    private readonly webSocketManager: WebSocketManager,
    private readonly queryNotifications: QueryNotifications,
    private readonly markAsRead: MarkAsRead
  ) {}

  public handleConnection(socket: Socket): void {
    logger.info(`New socket connection: ${socket.id}`);

    // Handle authentication
    socket.on('authenticate', async (data: { userId: string; token?: string }) => {
      try {
        // TODO: Validate token with Business-Security
        const { userId } = data;

        if (!userId) {
          socket.emit('error', { message: 'User ID is required' });
          socket.disconnect();
          return;
        }

        // Register user connection
        this.webSocketManager.addConnection(socket, userId, {
          userAgent: socket.handshake.headers['user-agent'],
          ip: socket.handshake.address
        });

        socket.emit('authenticated', { userId, socketId: socket.id });

        // Send unread notifications count
        const unreadCount = await this.queryNotifications.getUnreadCount(userId);
        socket.emit('unread_count', { count: unreadCount });

        logger.info(`User ${userId} authenticated on socket ${socket.id}`);
      } catch (error: any) {
        logger.error('Authentication error:', error);
        socket.emit('error', { message: 'Authentication failed' });
        socket.disconnect();
      }
    });

    // Handle get notifications
    socket.on('get_notifications', async (data: { limit?: number; skip?: number }) => {
      try {
        const userId = this.webSocketManager.getUserBySocket(socket.id);
        if (!userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const result = await this.queryNotifications.execute({
          userId,
          limit: data.limit || 20,
          skip: data.skip || 0
        });

        socket.emit('notifications', result);
      } catch (error: any) {
        logger.error('Error getting notifications:', error);
        socket.emit('error', { message: error.message || 'Failed to get notifications' });
      }
    });

    // Handle get unread notifications
    socket.on('get_unread', async () => {
      try {
        const userId = this.webSocketManager.getUserBySocket(socket.id);
        if (!userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const notifications = await this.queryNotifications.getUnread(userId);
        socket.emit('unread_notifications', { notifications });
      } catch (error: any) {
        logger.error('Error getting unread notifications:', error);
        socket.emit('error', { message: error.message || 'Failed to get unread notifications' });
      }
    });

    // Handle mark as read
    socket.on('mark_as_read', async (data: { notificationId: string }) => {
      try {
        const userId = this.webSocketManager.getUserBySocket(socket.id);
        if (!userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        await this.markAsRead.execute(data.notificationId, userId);

        // Send updated unread count
        const unreadCount = await this.queryNotifications.getUnreadCount(userId);
        socket.emit('unread_count', { count: unreadCount });

        socket.emit('marked_as_read', { notificationId: data.notificationId });
      } catch (error: any) {
        logger.error('Error marking as read:', error);
        socket.emit('error', { message: error.message || 'Failed to mark as read' });
      }
    });

    // Handle mark all as read
    socket.on('mark_all_as_read', async () => {
      try {
        const userId = this.webSocketManager.getUserBySocket(socket.id);
        if (!userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const unread = await this.queryNotifications.getUnread(userId);
        const ids = unread.map(n => n.id);

        await this.markAsRead.executeMany(ids, userId);

        socket.emit('all_marked_as_read');
        socket.emit('unread_count', { count: 0 });
      } catch (error: any) {
        logger.error('Error marking all as read:', error);
        socket.emit('error', { message: error.message || 'Failed to mark all as read' });
      }
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      logger.info(`Socket ${socket.id} disconnected: ${reason}`);
      this.webSocketManager.removeConnection(socket.id);
    });
  }

  public sendNotificationToUser(userId: string, notification: NotificationResponseDTO): void {
    // This will be called from Kafka consumer or use case
    const socketIds = this.webSocketManager.getUserSockets(userId);

    if (socketIds.length > 0) {
      for (const socketId of socketIds) {
        // Emit to specific socket
        logger.info(`Sending notification ${notification.id} to user ${userId} via socket ${socketId}`);
      }
    } else {
      logger.info(`User ${userId} is offline, notification will be stored`);
    }
  }
}
