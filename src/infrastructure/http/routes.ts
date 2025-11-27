import { Router, Request, Response } from 'express';
import { CreateNotification } from '@application/usecases/CreateNotification';
import { MarkAsRead } from '@application/usecases/MarkAsRead';
import { QueryNotifications } from '@application/usecases/QueryNotifications';
import { ManageSubscription } from '@application/usecases/ManageSubscription';
import { UpdatePreferences } from '@application/usecases/UpdatePreferences';
import { SendBulkNotifications } from '@application/usecases/SendBulkNotifications';
import { validateData, createNotificationSchema, bulkNotificationSchema, queryNotificationsSchema, subscriptionSchema, preferencesSchema } from '@shared/validators/schemas';
import { AppError } from '@shared/errors/AppError';
import { logger } from '@shared/utils/logger';

export function createNotificationRoutes(
  createNotification: CreateNotification,
  markAsRead: MarkAsRead,
  queryNotifications: QueryNotifications,
  manageSubscription: ManageSubscription,
  updatePreferences: UpdatePreferences,
  sendBulkNotifications: SendBulkNotifications
): Router {
  const router = Router();

  // Create notification
  router.post('/notifications', async (req: Request, res: Response) => {
    try {
      const dto = validateData(createNotificationSchema, req.body);
      const result = await createNotification.execute({
        ...dto,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined
      });
      res.status(201).json(result);
    } catch (error: any) {
      logger.error('Error creating notification:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Invalid request' });
      }
    }
  });

  // Send bulk notifications
  router.post('/notifications/bulk', async (req: Request, res: Response) => {
    try {
      const dto = validateData(bulkNotificationSchema, req.body);
      const result = await sendBulkNotifications.execute({
        ...dto,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined
      });
      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Error sending bulk notifications:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Invalid request' });
      }
    }
  });

  // Query notifications
  router.get('/notifications', async (req: Request, res: Response) => {
    try {
      const dto = validateData(queryNotificationsSchema, {
        ...req.query,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        skip: req.query.skip ? parseInt(req.query.skip as string) : undefined
      });
      const result = await queryNotifications.execute({
        ...dto,
        fromDate: dto.fromDate ? new Date(dto.fromDate) : undefined,
        toDate: dto.toDate ? new Date(dto.toDate) : undefined
      });
      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Error querying notifications:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Invalid request' });
      }
    }
  });

  // Get unread notifications
  router.get('/notifications/unread/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const result = await queryNotifications.getUnread(userId, limit);
      res.status(200).json({ notifications: result });
    } catch (error: any) {
      logger.error('Error getting unread notifications:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Get unread count
  router.get('/notifications/unread/:userId/count', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const count = await queryNotifications.getUnreadCount(userId);
      res.status(200).json({ count });
    } catch (error: any) {
      logger.error('Error getting unread count:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Mark as read
  router.patch('/notifications/:id/read', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      if (!userId) {
        throw new AppError('User ID is required', 400);
      }
      await markAsRead.execute(id, userId);
      res.status(200).json({ message: 'Notification marked as read' });
    } catch (error: any) {
      logger.error('Error marking notification as read:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Subscribe to push notifications
  router.post('/subscriptions', async (req: Request, res: Response) => {
    try {
      const dto = validateData(subscriptionSchema, req.body);
      const result = await manageSubscription.subscribe(dto);
      res.status(201).json(result);
    } catch (error: any) {
      logger.error('Error creating subscription:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Invalid request' });
      }
    }
  });

  // Get subscriptions
  router.get('/subscriptions/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const result = await manageSubscription.getSubscriptions(userId);
      res.status(200).json({ subscriptions: result });
    } catch (error: any) {
      logger.error('Error getting subscriptions:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Unsubscribe
  router.delete('/subscriptions/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      if (!userId) {
        throw new AppError('User ID is required', 400);
      }
      await manageSubscription.unsubscribe(id, userId);
      res.status(200).json({ message: 'Subscription deleted' });
    } catch (error: any) {
      logger.error('Error deleting subscription:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Update preferences
  router.put('/preferences', async (req: Request, res: Response) => {
    try {
      const dto = validateData(preferencesSchema, req.body);
      const result = await updatePreferences.execute(dto);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Error updating preferences:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Invalid request' });
      }
    }
  });

  // Get preferences
  router.get('/preferences/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const result = await updatePreferences.get(userId);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Error getting preferences:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Health check
  router.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', service: 'business-notificaciones' });
  });

  return router;
}
