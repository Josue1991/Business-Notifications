import { UserPreferences } from '../entities/UserPreferences';

export interface IUserPreferencesRepository {
  save(preferences: UserPreferences): Promise<UserPreferences>;
  findByUserId(userId: string): Promise<UserPreferences | null>;
  update(preferences: UserPreferences): Promise<UserPreferences>;
  delete(userId: string): Promise<void>;
  exists(userId: string): Promise<boolean>;
}
