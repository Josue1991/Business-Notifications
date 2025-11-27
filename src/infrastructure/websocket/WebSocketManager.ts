import { Socket } from 'socket.io';
import { logger } from '@shared/utils/logger';

export interface ConnectedUser {
  userId: string;
  socketId: string;
  connectedAt: Date;
  metadata?: any;
}

export class WebSocketManager {
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private socketUsers: Map<string, string> = new Map(); // socketId -> userId
  private userMetadata: Map<string, any> = new Map(); // userId -> metadata

  public addConnection(socket: Socket, userId: string, metadata?: any): void {
    const socketId = socket.id;

    // Add to userConnections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(socketId);

    // Add to socketUsers
    this.socketUsers.set(socketId, userId);

    // Store metadata
    if (metadata) {
      this.userMetadata.set(userId, metadata);
    }

    // Join user-specific room
    socket.join(`user:${userId}`);

    logger.info(`User ${userId} connected via socket ${socketId}`);
  }

  public removeConnection(socketId: string): void {
    const userId = this.socketUsers.get(socketId);

    if (userId) {
      const sockets = this.userConnections.get(userId);
      if (sockets) {
        sockets.delete(socketId);

        // If no more connections, remove user entry
        if (sockets.size === 0) {
          this.userConnections.delete(userId);
          this.userMetadata.delete(userId);
          logger.info(`User ${userId} fully disconnected`);
        }
      }

      this.socketUsers.delete(socketId);
      logger.info(`Socket ${socketId} disconnected`);
    }
  }

  public isUserOnline(userId: string): boolean {
    const sockets = this.userConnections.get(userId);
    return sockets ? sockets.size > 0 : false;
  }

  public getUserSockets(userId: string): string[] {
    const sockets = this.userConnections.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  public getUserBySocket(socketId: string): string | undefined {
    return this.socketUsers.get(socketId);
  }

  public getUserMetadata(userId: string): any {
    return this.userMetadata.get(userId);
  }

  public getOnlineUsers(): string[] {
    return Array.from(this.userConnections.keys());
  }

  public getOnlineUsersCount(): number {
    return this.userConnections.size;
  }

  public getTotalConnections(): number {
    return this.socketUsers.size;
  }

  public getConnectedUsers(): ConnectedUser[] {
    const users: ConnectedUser[] = [];

    for (const [userId, sockets] of this.userConnections.entries()) {
      for (const socketId of sockets) {
        users.push({
          userId,
          socketId,
          connectedAt: new Date(), // In production, track actual connection time
          metadata: this.userMetadata.get(userId)
        });
      }
    }

    return users;
  }

  public clear(): void {
    this.userConnections.clear();
    this.socketUsers.clear();
    this.userMetadata.clear();
    logger.info('WebSocket manager cleared');
  }
}
