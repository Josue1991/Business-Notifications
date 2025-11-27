import { UserPreferences, NotificationTypePreferences } from '@domain/entities/UserPreferences';
import { IUserPreferencesRepository } from '@domain/repositories/IUserPreferencesRepository';
import { PreferencesDTO } from '../dto/NotificationDTO';
import { AppError } from '@shared/errors/AppError';
import { v4 as uuidv4 } from 'uuid';
import { NotificationType } from '@domain/entities/Notification';

export class UpdatePreferences {
  constructor(private readonly preferencesRepository: IUserPreferencesRepository) {}

  async execute(dto: PreferencesDTO): Promise<UserPreferences> {
    try {
      let preferences = await this.preferencesRepository.findByUserId(dto.userId);

      if (!preferences) {
        // Create default preferences
        preferences = new UserPreferences(uuidv4(), dto.userId);
      }

      // Update notification type preferences
      if (dto.preferences) {
        for (const [type, channels] of Object.entries(dto.preferences)) {
          if (Object.values(NotificationType).includes(type as NotificationType)) {
            if (channels.inApp !== undefined) {
              preferences.updatePreference(
                type as NotificationType,
                'inApp',
                channels.inApp
              );
            }
            if (channels.push !== undefined) {
              preferences.updatePreference(
                type as NotificationType,
                'push',
                channels.push
              );
            }
            if (channels.websocket !== undefined) {
              preferences.updatePreference(
                type as NotificationType,
                'websocket',
                channels.websocket
              );
            }
          }
        }
      }

      // Update quiet hours
      if (dto.quietHours) {
        preferences.updateQuietHours(dto.quietHours);
      }

      // Update other settings
      if (dto.language !== undefined) {
        preferences.language = dto.language;
      }
      if (dto.soundEnabled !== undefined) {
        preferences.soundEnabled = dto.soundEnabled;
      }
      if (dto.vibrationEnabled !== undefined) {
        preferences.vibrationEnabled = dto.vibrationEnabled;
      }

      // Save or update
      const exists = await this.preferencesRepository.exists(dto.userId);
      if (exists) {
        return await this.preferencesRepository.update(preferences);
      } else {
        return await this.preferencesRepository.save(preferences);
      }
    } catch (error: any) {
      throw new AppError(
        error.message || 'Failed to update preferences',
        error.statusCode || 500
      );
    }
  }

  async get(userId: string): Promise<UserPreferences> {
    try {
      let preferences = await this.preferencesRepository.findByUserId(userId);

      if (!preferences) {
        // Return default preferences
        preferences = new UserPreferences(uuidv4(), userId);
      }

      return preferences;
    } catch (error: any) {
      throw new AppError(
        error.message || 'Failed to get preferences',
        error.statusCode || 500
      );
    }
  }

  async reset(userId: string): Promise<UserPreferences> {
    try {
      const preferences = new UserPreferences(uuidv4(), userId);

      const exists = await this.preferencesRepository.exists(userId);
      if (exists) {
        return await this.preferencesRepository.update(preferences);
      } else {
        return await this.preferencesRepository.save(preferences);
      }
    } catch (error: any) {
      throw new AppError(
        error.message || 'Failed to reset preferences',
        error.statusCode || 500
      );
    }
  }
}
