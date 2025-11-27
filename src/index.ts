import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config } from './shared/config/config';
import { logger } from './shared/utils/logger';
import { MongoDatabase } from './infrastructure/database/MongoDatabase';
import { SocketServer } from './infrastructure/websocket/SocketServer';
import { WebSocketManager } from './infrastructure/websocket/WebSocketManager';
import { SocketIOHandler } from './infrastructure/websocket/SocketIOHandler';
import { createNotificationRoutes } from './infrastructure/http/routes';

// Repositories
import { MongoNotificationRepository } from './infrastructure/database/MongoNotificationRepository';
import { MongoUserPreferencesRepository } from './infrastructure/database/MongoUserPreferencesRepository';
import { MongoPushSubscriptionRepository } from './infrastructure/database/MongoPushSubscriptionRepository';

// Domain Services
import { NotificationDomainService } from './domain/services/NotificationDomainService';

// Use Cases
import { CreateNotification } from './application/usecases/CreateNotification';
import { MarkAsRead } from './application/usecases/MarkAsRead';
import { QueryNotifications } from './application/usecases/QueryNotifications';
import { ManageSubscription } from './application/usecases/ManageSubscription';
import { UpdatePreferences } from './application/usecases/UpdatePreferences';
import { SendBulkNotifications } from './application/usecases/SendBulkNotifications';

// Push Notifications
import { PushNotificationQueue } from './infrastructure/push/PushNotificationQueue';

class Server {
  private app: Application;
  private httpServer: ReturnType<typeof createServer>;
  private socketServer: SocketServer;
  private webSocketManager: WebSocketManager;
  private socketIOHandler: SocketIOHandler;
  private pushQueue: PushNotificationQueue;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.setupMiddleware();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: config.security.corsOrigin,
      credentials: true
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: 'Too many requests from this IP, please try again later'
    });
    this.app.use('/api/', limiter);
  }

  private async initializeDatabase(): Promise<void> {
    try {
      const db = MongoDatabase.getInstance();
      await db.connect();
      logger.info('MongoDB connected successfully');
    } catch (error: any) {
      logger.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  private initializeWebSocket(): void {
    // Initialize WebSocket server
    this.socketServer = new SocketServer(this.httpServer);
    this.webSocketManager = new WebSocketManager();

    // Initialize repositories
    const notificationRepository = new MongoNotificationRepository();
    const preferencesRepository = new MongoUserPreferencesRepository();

    // Initialize domain services
    const domainService = new NotificationDomainService();

    // Initialize use cases for WebSocket
    const queryNotifications = new QueryNotifications(notificationRepository, domainService);
    const markAsRead = new MarkAsRead(notificationRepository);

    // Initialize Socket.IO handler
    this.socketIOHandler = new SocketIOHandler(
      this.webSocketManager,
      queryNotifications,
      markAsRead
    );

    // Setup connection handler
    this.socketServer.onConnection((socket) => {
      this.socketIOHandler.handleConnection(socket);
    });

    logger.info('WebSocket server initialized');
  }

  private initializeRoutes(): void {
    // Initialize repositories
    const notificationRepository = new MongoNotificationRepository();
    const preferencesRepository = new MongoUserPreferencesRepository();
    const subscriptionRepository = new MongoPushSubscriptionRepository();

    // Initialize domain services
    const domainService = new NotificationDomainService();

    // Initialize Push Queue
    this.pushQueue = new PushNotificationQueue(subscriptionRepository);

    // Initialize use cases
    const createNotification = new CreateNotification(
      notificationRepository,
      preferencesRepository,
      domainService
    );
    const markAsRead = new MarkAsRead(notificationRepository);
    const queryNotifications = new QueryNotifications(notificationRepository, domainService);
    const manageSubscription = new ManageSubscription(subscriptionRepository);
    const updatePreferences = new UpdatePreferences(preferencesRepository);
    const sendBulkNotifications = new SendBulkNotifications(
      notificationRepository,
      preferencesRepository,
      domainService
    );

    // Setup routes
    const routes = createNotificationRoutes(
      createNotification,
      markAsRead,
      queryNotifications,
      manageSubscription,
      updatePreferences,
      sendBulkNotifications
    );

    this.app.use('/api', routes);

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        service: 'business-notificaciones',
        version: '1.0.0',
        status: 'running'
      });
    });

    logger.info('Routes initialized');
  }

  private setupErrorHandler(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        path: req.path
      });
    });

    // Global error handler
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Unhandled error:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: config.server.nodeEnv === 'development' ? err.message : undefined
      });
    });
  }

  public async start(): Promise<void> {
    try {
      // Initialize database
      await this.initializeDatabase();

      // Initialize WebSocket
      this.initializeWebSocket();

      // Initialize routes
      this.initializeRoutes();

      // Setup error handler
      this.setupErrorHandler();

      // Start server
      this.httpServer.listen(config.server.port, () => {
        logger.info(`Server running on port ${config.server.port}`);
        logger.info(`Environment: ${config.server.nodeEnv}`);
        logger.info(`WebSocket enabled at ws://localhost:${config.server.port}${config.socketIO.path}`);
      });

      // Setup cleanup on exit
      this.setupGracefulShutdown();
    } catch (error: any) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      try {
        // Close Socket.IO
        await this.socketServer.close();

        // Close Push Queue
        await this.pushQueue.close();

        // Close database
        const db = MongoDatabase.getInstance();
        await db.disconnect();

        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (error: any) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }
}

// Start server
const server = new Server();
server.start();
