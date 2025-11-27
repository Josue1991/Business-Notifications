# Business-Notificaciones

Microservicio de notificaciones en tiempo real para BusinessApp. Gestiona notificaciones en tiempo real mediante WebSockets, push notifications (Web Push y FCM), y notificaciones in-app almacenadas en MongoDB.

## 🚀 Características

- **Notificaciones en Tiempo Real**: WebSocket con Socket.IO y Redis adapter para escalabilidad
- **Push Notifications**: Soporte para Web Push (VAPID) y Firebase Cloud Messaging (Android/iOS)
- **Notificaciones In-App**: Almacenamiento persistente en MongoDB
- **Preferencias de Usuario**: Configuración granular por tipo de notificación y canal
- **Quiet Hours**: Horarios personalizados sin notificaciones
- **Arquitectura Hexagonal**: Código limpio y mantenible
- **Event-Driven**: Integración con Kafka para eventos del sistema
- **Queue Processing**: BullMQ para procesamiento asíncrono de notificaciones push

## 📋 Requisitos

- Node.js 20+
- MongoDB 7.0+
- Redis 7.2+
- Kafka 3.0+ (opcional, para eventos)

## 🛠️ Instalación

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Generar claves VAPID para Web Push
npx web-push generate-vapid-keys

# Configurar Firebase para FCM (ver sección Firebase)
```

## ⚙️ Configuración

### Variables de Entorno

Editar `.env` con tus credenciales:

```env
# Server
PORT=3007
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/business_notificaciones

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Socket.IO
SOCKET_IO_CORS_ORIGIN=http://localhost:3000

# Web Push (VAPID)
VAPID_PUBLIC_KEY=tu-clave-publica
VAPID_PRIVATE_KEY=tu-clave-privada
VAPID_SUBJECT=mailto:admin@businessapp.com

# Firebase Cloud Messaging
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_PRIVATE_KEY=tu-private-key
FIREBASE_CLIENT_EMAIL=tu-client-email
```

### Configurar Firebase Cloud Messaging (FCM)

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un proyecto o selecciona uno existente
3. Ve a **Configuración del Proyecto** → **Cuentas de servicio**
4. Haz clic en **Generar nueva clave privada**
5. Descarga el archivo JSON y extrae:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

## 🚀 Uso

### Desarrollo

```bash
# Modo desarrollo con hot-reload
npm run dev
```

### Producción

```bash
# Compilar TypeScript
npm run build

# Iniciar servidor
npm start
```

### Docker

```bash
# Construir imagen
docker build -t business-notificaciones .

# Ejecutar con docker-compose
docker-compose up -d
```

## 📡 API REST

### Notificaciones

#### Crear Notificación

```http
POST /api/notifications
Content-Type: application/json

{
  "userId": "user123",
  "type": "INFO",
  "title": "Nuevo mensaje",
  "message": "Tienes un nuevo mensaje en tu bandeja",
  "channels": ["IN_APP", "PUSH"],
  "priority": "NORMAL",
  "metadata": {
    "messageId": "msg456"
  },
  "actions": [
    {
      "label": "Ver mensaje",
      "url": "/messages/msg456"
    }
  ]
}
```

#### Notificaciones Masivas

```http
POST /api/notifications/bulk
Content-Type: application/json

{
  "userIds": ["user1", "user2", "user3"],
  "type": "SYSTEM",
  "title": "Mantenimiento programado",
  "message": "El sistema estará en mantenimiento mañana de 2-4 AM",
  "priority": "HIGH"
}
```

#### Consultar Notificaciones

```http
GET /api/notifications?userId=user123&isRead=false&limit=20&skip=0
```

#### Marcar como Leída

```http
PATCH /api/notifications/:id/read
Content-Type: application/json

{
  "userId": "user123"
}
```

### Push Subscriptions

#### Suscribirse (Web Push)

```http
POST /api/subscriptions
Content-Type: application/json

{
  "userId": "user123",
  "deviceType": "WEB",
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

#### Suscribirse (FCM - Mobile)

```http
POST /api/subscriptions
Content-Type: application/json

{
  "userId": "user123",
  "deviceType": "ANDROID",
  "fcmToken": "token-from-firebase-sdk",
  "deviceInfo": {
    "deviceName": "Samsung Galaxy S23"
  }
}
```

### Preferencias de Usuario

#### Actualizar Preferencias

```http
PUT /api/preferences
Content-Type: application/json

{
  "userId": "user123",
  "preferences": {
    "INFO": {
      "inApp": true,
      "push": false,
      "websocket": true
    },
    "ERROR": {
      "inApp": true,
      "push": true,
      "websocket": true
    }
  },
  "quietHours": {
    "enabled": true,
    "startTime": "22:00",
    "endTime": "08:00",
    "timezone": "America/Mexico_City"
  }
}
```

## 🔌 WebSocket (Socket.IO)

### Cliente JavaScript

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3007', {
  path: '/socket.io',
  transports: ['websocket']
});

// Autenticar
socket.emit('authenticate', {
  userId: 'user123',
  token: 'jwt-token' // Opcional
});

socket.on('authenticated', (data) => {
  console.log('Autenticado:', data);
});

// Recibir notificaciones en tiempo real
socket.on('notification', (notification) => {
  console.log('Nueva notificación:', notification);
  // Mostrar notificación en UI
});

// Recibir contador de no leídas
socket.on('unread_count', ({ count }) => {
  console.log('No leídas:', count);
});

// Obtener notificaciones
socket.emit('get_notifications', { limit: 20, skip: 0 });

socket.on('notifications', ({ notifications, total, unreadCount }) => {
  console.log('Notificaciones:', notifications);
});

// Marcar como leída
socket.emit('mark_as_read', { notificationId: 'notif123' });

socket.on('marked_as_read', ({ notificationId }) => {
  console.log('Marcada como leída:', notificationId);
});
```

### Eventos del Cliente

- `authenticate` - Autenticar usuario
- `get_notifications` - Obtener lista de notificaciones
- `get_unread` - Obtener solo no leídas
- `mark_as_read` - Marcar como leída
- `mark_all_as_read` - Marcar todas como leídas
- `ping` - Health check

### Eventos del Servidor

- `authenticated` - Autenticación exitosa
- `notification` - Nueva notificación (tiempo real)
- `notifications` - Lista de notificaciones
- `unread_notifications` - Notificaciones no leídas
- `unread_count` - Contador actualizado
- `marked_as_read` - Confirmación de lectura
- `pong` - Respuesta a ping
- `error` - Error ocurrido

## 🌐 Web Push (Frontend)

### Solicitar Permiso y Suscribirse

```javascript
// Solicitar permiso
const permission = await Notification.requestPermission();

if (permission === 'granted') {
  // Registrar Service Worker
  const registration = await navigator.serviceWorker.register('/sw.js');

  // Obtener clave pública VAPID del servidor
  const response = await fetch('/api/vapid-public-key');
  const { publicKey } = await response.json();

  // Suscribirse a push
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });

  // Enviar suscripción al servidor
  await fetch('/api/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'user123',
      deviceType: 'WEB',
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: arrayBufferToBase64(subscription.getKey('auth'))
      }
    })
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
```

### Service Worker (sw.js)

```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const { notification } = data;

  const options = {
    body: notification.body,
    icon: notification.icon || '/icon.png',
    badge: notification.badge || '/badge.png',
    image: notification.image,
    data: notification.data,
    actions: notification.actions,
    tag: notification.tag,
    requireInteraction: notification.requireInteraction
  };

  event.waitUntil(
    self.registration.showNotification(notification.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data.url || '/';

  event.waitUntil(
    clients.openWindow(url)
  );
});
```

## 🏗️ Arquitectura

### Capas

```
src/
├── domain/              # Lógica de negocio
│   ├── entities/        # Entidades del dominio
│   ├── repositories/    # Interfaces de repositorios
│   └── services/        # Servicios del dominio
├── application/         # Casos de uso
│   ├── dto/             # Data Transfer Objects
│   └── usecases/        # Casos de uso
├── infrastructure/      # Implementaciones
│   ├── database/        # MongoDB repositories
│   ├── websocket/       # Socket.IO server
│   ├── push/            # Push providers
│   └── http/            # REST API
└── shared/              # Utilidades compartidas
    ├── config/          # Configuración
    ├── errors/          # Errores personalizados
    ├── utils/           # Utilidades
    └── validators/      # Validaciones
```

### Entidades del Dominio

- **Notification**: Notificación con tipo, canales, prioridad, acciones
- **UserPreferences**: Preferencias por tipo y canal, quiet hours
- **PushSubscription**: Suscripción Web Push o FCM

### Tipos de Notificación

- `INFO` - Información general
- `SUCCESS` - Operación exitosa
- `WARNING` - Advertencia
- `ERROR` - Error
- `SYSTEM` - Mensaje del sistema

### Canales

- `IN_APP` - Notificación almacenada en base de datos
- `PUSH` - Push notification (Web/Mobile)
- `WEBSOCKET` - En tiempo real via Socket.IO
- `ALL` - Todos los canales

### Prioridades

- `LOW` - Baja prioridad
- `NORMAL` - Prioridad normal
- `HIGH` - Alta prioridad
- `URGENT` - Urgente (ignora quiet hours)

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests con coverage
npm run test:coverage

# Tests en modo watch
npm run test:watch
```

## 📊 Monitoreo

El microservicio publica logs a Kafka en el topic `business.logs`:

```json
{
  "service": "business-notificaciones",
  "level": "info",
  "message": "Notification sent",
  "metadata": {
    "notificationId": "notif123",
    "userId": "user123"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 🔒 Seguridad

- **CORS**: Configurado para orígenes permitidos
- **Rate Limiting**: 100 requests por minuto por IP
- **Helmet**: Headers de seguridad HTTP
- **Validación**: Zod para validación de entrada
- **JWT**: Autenticación con Business-Security (opcional)

## 🤝 Integración con otros microservicios

### Business-Security

Valida tokens JWT para autenticación de usuarios.

### Business-Log

Publica eventos de notificaciones al topic `business.logs`.

### Business-Mensajeria

Puede recibir eventos para enviar notificaciones cuando se envía un email/SMS.

## 📝 Licencia

ISC

## 👥 Autor

BusinessApp Team
