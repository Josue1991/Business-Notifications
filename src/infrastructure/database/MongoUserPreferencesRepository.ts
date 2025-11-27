import { Collection } from 'mongodb';
import { UserPreferences, NotificationTypePreferences, QuietHours } from '@domain/entities/UserPreferences';
import { IUserPreferencesRepository } from '@domain/repositories/IUserPreferencesRepository';
import { MongoDatabase } from './MongoDatabase';
import { logger } from '@shared/utils/logger';

interface UserPreferencesDocument {
  _id: string;
  userId: string;
  preferences: NotificationTypePreferences;
  quietHours: QuietHours;
  language: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class MongoUserPreferencesRepository implements IUserPreferencesRepository {
  private collection: Collection<UserPreferencesDocument>;

  constructor() {
    const db = MongoDatabase.getInstance();
    this.collection = db.getCollection<UserPreferencesDocument>('user_preferences');
  }

  async save(preferences: UserPreferences): Promise<UserPreferences> {
    try {
      const doc: UserPreferencesDocument = {
        _id: preferences.id,
        userId: preferences.userId,
        preferences: preferences.preferences,
        quietHours: preferences.quietHours,
        language: preferences.language,
        soundEnabled: preferences.soundEnabled,
        vibrationEnabled: preferences.vibrationEnabled,
        createdAt: preferences.createdAt,
        updatedAt: preferences.updatedAt
      };

      await this.collection.insertOne(doc as any);
      logger.info(`User preferences for ${preferences.userId} saved`);

      return preferences;
    } catch (error: any) {
      logger.error('Error saving user preferences:', error);
      throw new Error('Failed to save user preferences');
    }
  }

  async findByUserId(userId: string): Promise<UserPreferences | null> {
    try {
      const doc = await this.collection.findOne({ userId });
      return doc ? this.toEntity(doc) : null;
    } catch (error: any) {
      logger.error('Error finding user preferences:', error);
      throw new Error('Failed to find user preferences');
    }
  }

  async update(preferences: UserPreferences): Promise<UserPreferences> {
    try {
      preferences.updatedAt = new Date();

      const doc: UserPreferencesDocument = {
        _id: preferences.id,
        userId: preferences.userId,
        preferences: preferences.preferences,
        quietHours: preferences.quietHours,
        language: preferences.language,
        soundEnabled: preferences.soundEnabled,
        vibrationEnabled: preferences.vibrationEnabled,
        createdAt: preferences.createdAt,
        updatedAt: preferences.updatedAt
      };

      await this.collection.replaceOne({ userId: preferences.userId }, doc as any, {
        upsert: true
      });

      logger.info(`User preferences for ${preferences.userId} updated`);

      return preferences;
    } catch (error: any) {
      logger.error('Error updating user preferences:', error);
      throw new Error('Failed to update user preferences');
    }
  }

  async delete(userId: string): Promise<void> {
    try {
      await this.collection.deleteOne({ userId });
      logger.info(`User preferences for ${userId} deleted`);
    } catch (error: any) {
      logger.error('Error deleting user preferences:', error);
      throw new Error('Failed to delete user preferences');
    }
  }

  async exists(userId: string): Promise<boolean> {
    try {
      const count = await this.collection.countDocuments({ userId });
      return count > 0;
    } catch (error: any) {
      logger.error('Error checking user preferences existence:', error);
      throw new Error('Failed to check user preferences existence');
    }
  }

  private toEntity(doc: UserPreferencesDocument): UserPreferences {
    return new UserPreferences(
      doc._id,
      doc.userId,
      doc.preferences,
      doc.quietHours,
      doc.language,
      doc.soundEnabled,
      doc.vibrationEnabled,
      doc.createdAt,
      doc.updatedAt
    );
  }
}
