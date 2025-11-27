import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3007', 10),
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/business_notificaciones',
    dbName: process.env.MONGODB_DB_NAME || 'business_notificaciones'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || ''
  },
  socketIO: {
    path: process.env.SOCKET_IO_PATH || '/socket.io',
    corsOrigin: process.env.SOCKET_IO_CORS_ORIGIN || 'http://localhost:3000',
    pingTimeout: parseInt(process.env.SOCKET_IO_PING_TIMEOUT || '60000', 10),
    pingInterval: parseInt(process.env.SOCKET_IO_PING_INTERVAL || '25000', 10)
  },
  webPush: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
    vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@businessapp.com'
  },
  fcm: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || ''
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'business-notificaciones',
    groupId: process.env.KAFKA_GROUP_ID || 'business-notificaciones-group',
    topics: {
      notifications: process.env.KAFKA_TOPIC_NOTIFICATIONS || 'business.notifications',
      logs: process.env.KAFKA_TOPIC_LOGS || 'business.logs'
    }
  },
  queue: {
    notificationName: process.env.QUEUE_NOTIFICATION_NAME || 'notification-queue',
    maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES || '3', 10)
  },
  security: {
    apiKey: process.env.API_KEY || 'your-api-key-here',
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-here',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },
  notifications: {
    expiryDays: parseInt(process.env.NOTIFICATION_EXPIRY_DAYS || '30', 10),
    cleanupIntervalHours: parseInt(process.env.CLEANUP_INTERVAL_HOURS || '24', 10),
    maxNotificationsPerUser: parseInt(process.env.MAX_NOTIFICATIONS_PER_USER || '1000', 10)
  }
};
