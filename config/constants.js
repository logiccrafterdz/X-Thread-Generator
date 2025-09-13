/**
 * Centralized configuration constants
 * All hardcoded values should be defined here for easy maintenance
 */

module.exports = {
  // Server Configuration
  DEFAULT_PORT: 3000,
  DEFAULT_LOG_LEVEL: 'info',
  LOG_FILE_MAX_SIZE: 20971520, // 20MB in bytes
  LOG_FILE_MAX_FILES: 5,
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Input Limits
  MAX_INPUT_LENGTH: 10000,
  MAX_TWEETS_PER_THREAD: 20,
  MAX_HASHTAGS_PER_TWEET: 3,
  MAX_EMOJIS_PER_TWEET: 10,
  TWEET_CHAR_LIMIT: 280,
  
  // Thread Generation
  DEFAULT_STYLE: 'professional',
  DEFAULT_MAX_TWEETS: 5,
  DEFAULT_LANGUAGE: 'auto',
  
  // Gemini Configuration
  DEFAULT_GEMINI_MODEL: 'gemini-pro',
  DEFAULT_GEMINI_TEMPERATURE: 0.0,
  DEFAULT_GEMINI_MAX_OUTPUT_TOKENS: 4096,
  DEFAULT_GEMINI_QUOTA_LIMIT: 100,
  
  // Cleanup Configuration
  HISTORY_RETENTION_DAYS: 7,
  LOG_RETENTION_DAYS: 14,
  CLEANUP_INTERVAL_HOURS: 24,
  
  // Security
  BODY_PARSER_LIMIT: '1mb',
  
  // User Preferences
  MAX_STYLE_MEMORY: 5,
  MAX_LOCALSTORAGE_THREADS: 5,
  
  // UI Constants
  TEXTAREA_MIN_HEIGHT: 120,
  MODAL_ANIMATION_DURATION: 300,
  
  // File Paths
  LOGS_DIR: 'logs',
  HISTORY_DIR: 'history',
  SCHEMAS_DIR: 'schemas',
  PUBLIC_DIR: 'public',
  
  // Error Codes
  ERROR_CODES: {
    VALIDATION_ERROR: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    RATE_LIMIT: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },
  
  // Success Messages
  SUCCESS_MESSAGES: {
    THREAD_GENERATED: 'Thread generated successfully',
    HISTORY_SAVED: 'Thread saved to history',
    PREFERENCES_UPDATED: 'Preferences updated successfully'
  }
};