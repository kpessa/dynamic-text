import type { UserPreferences } from './types.js';

// User preferences management
const PREFERENCES_KEY = 'dynamicTextPreferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  autoDeduplicateOnImport: false,
  showDeduplicationPrompt: true,
  deduplicationThreshold: 1.0, // 1.0 = exact match only
  preserveImportHistory: true
};

export function getPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
  return { ...DEFAULT_PREFERENCES };
}

export function savePreferences(preferences: UserPreferences): boolean {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    return true;
  } catch (error) {
    console.error('Error saving preferences:', error);
    return false;
  }
}

export function updatePreference(key: keyof UserPreferences, value: UserPreferences[keyof UserPreferences]): boolean {
  const preferences = getPreferences();
  preferences[key] = value;
  return savePreferences(preferences);
}

export function resetPreferences(): UserPreferences {
  localStorage.removeItem(PREFERENCES_KEY);
  return DEFAULT_PREFERENCES;
}
