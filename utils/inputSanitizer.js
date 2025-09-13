/**
 * Input sanitization utility
 * Cleans and validates user input for security and processing
 */

const CONSTANTS = require('../config/constants');

/**
 * Sanitize text input by removing dangerous content
 * @param {string} input - Raw input text
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized text
 */
function sanitizeInput(input, options = {}) {
  const defaults = {
    maxLength: parseInt(process.env.MAX_INPUT_LENGTH) || CONSTANTS.MAX_INPUT_LENGTH,
    removeHTML: true,
    removeControlChars: true,
    normalizeWhitespace: true,
    preserveNewlines: true
  };

  const opts = { ...defaults, ...options };

  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Remove HTML tags and potentially dangerous content
  if (opts.removeHTML) {
    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    // Remove script content (case insensitive)
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove style content
    sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Decode HTML entities
    sanitized = sanitized
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&#96;/g, '`');
  }

  // Remove control characters except newlines and tabs
  if (opts.removeControlChars) {
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  // Normalize whitespace
  if (opts.normalizeWhitespace) {
    if (opts.preserveNewlines) {
      // Replace multiple spaces/tabs with single space, preserve newlines
      sanitized = sanitized.replace(/[ \t]+/g, ' ');
      // Remove excessive newlines (more than 2 consecutive)
      sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
    } else {
      // Replace all whitespace with single spaces
      sanitized = sanitized.replace(/\s+/g, ' ');
    }
  }

  // Trim leading and trailing whitespace
  sanitized = sanitized.trim();

  // Enforce maximum length
  if (opts.maxLength && sanitized.length > opts.maxLength) {
    sanitized = sanitized.substring(0, opts.maxLength);
  }

  return sanitized;
}

/**
 * Validate input parameters for thread generation
 * @param {Object} params - Request parameters
 * @returns {Object} Validation result
 */
function validateParameters(params) {
  const errors = [];
  const warnings = [];

  // Validate text
  if (!params.text || typeof params.text !== 'string') {
    errors.push('Text is required and must be a string');
  } else if (params.text.trim().length === 0) {
    errors.push('Text cannot be empty');
  } else if (params.text.length > (parseInt(process.env.MAX_INPUT_LENGTH) || CONSTANTS.MAX_INPUT_LENGTH)) {
    errors.push(`Text exceeds maximum length of ${process.env.MAX_INPUT_LENGTH || CONSTANTS.MAX_INPUT_LENGTH} characters`);
  }

  // Validate language
  const validLanguages = ['auto', 'ar', 'en', 'both'];
  if (params.language && !validLanguages.includes(params.language)) {
    errors.push(`Language must be one of: ${validLanguages.join(', ')}`);
  }

  // Validate style
  const validStyles = ['educational', 'technical', 'concise', 'engaging', 'professional'];
  if (params.style && !validStyles.includes(params.style)) {
    errors.push(`Style must be one of: ${validStyles.join(', ')}`);
  }

  // Validate maxTweets
  if (params.maxTweets !== undefined) {
    const maxTweets = parseInt(params.maxTweets);
    const maxAllowed = parseInt(process.env.MAX_TWEETS_PER_THREAD) || CONSTANTS.MAX_TWEETS_PER_THREAD;
    
    if (isNaN(maxTweets) || maxTweets < 1) {
      errors.push('maxTweets must be a positive integer');
    } else if (maxTweets > maxAllowed) {
      errors.push(`maxTweets cannot exceed ${maxAllowed}`);
    } else if (maxTweets > 10) {
      warnings.push('Large thread counts may reduce engagement');
    }
  }

  // Validate boolean flags
  if (params.includeHashtags !== undefined && typeof params.includeHashtags !== 'boolean') {
    errors.push('includeHashtags must be a boolean');
  }

  if (params.includeImages !== undefined && typeof params.includeImages !== 'boolean') {
    errors.push('includeImages must be a boolean');
  }

  if (errors.length > 0) {
    return {
      error: errors.join('; '),
      code: CONSTANTS.ERROR_CODES.VALIDATION_ERROR,
      details: { errors, warnings }
    };
  }

  return {
    success: true,
    warnings,
    sanitized: {
      text: sanitizeInput(params.text || ''),
      language: params.language || CONSTANTS.DEFAULT_LANGUAGE,
      style: params.style || CONSTANTS.DEFAULT_STYLE,
      maxTweets: Math.min(parseInt(params.maxTweets) || CONSTANTS.DEFAULT_MAX_TWEETS, parseInt(process.env.MAX_TWEETS_PER_THREAD) || CONSTANTS.MAX_TWEETS_PER_THREAD),
      includeHashtags: params.includeHashtags !== false,
      includeImages: params.includeImages === true
    }
  };
}

/**
 * Check if input contains potentially suspicious content
 * @param {string} input - Input to check
 * @returns {Object} Security check result
 */
function securityCheck(input) {
  if (!input || typeof input !== 'string') {
    return { isSafe: true, issues: [] };
  }

  const issues = [];

  // Check for script injection attempts
  if (/<script|javascript:|vbscript:|onload|onerror|onclick/i.test(input)) {
    issues.push('Potential script injection detected');
  }

  // Check for SQL injection patterns
  if (/(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bUNION\b).*(\bFROM\b|\bWHERE\b|\bINTO\b)/i.test(input)) {
    issues.push('Potential SQL injection pattern detected');
  }

  // Check for excessive special characters (potential attack)
  const specialCharCount = (input.match(/[<>&"'`]/g) || []).length;
  if (specialCharCount > input.length * 0.1) {
    issues.push('Excessive special characters detected');
  }

  // Check for very long words (potential buffer overflow attempt)
  const words = input.split(/\s+/);
  const longWords = words.filter(word => word.length > 100);
  if (longWords.length > 0) {
    issues.push('Unusually long words detected');
  }

  return {
    isSafe: issues.length === 0,
    issues
  };
}

/**
 * Normalize text for processing
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let normalized = text;

  // Normalize Unicode (combine diacritics, etc.)
  normalized = normalized.normalize('NFC');

  // Fix common smart quote issues
  normalized = normalized
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[…]/g, '...')
    .replace(/[–—]/g, '-');

  // Fix common spacing issues
  normalized = normalized
    .replace(/\u00A0/g, ' ') // Non-breaking space
    .replace(/\u2000-\u200B/g, ' ') // Various Unicode spaces
    .replace(/\u2028|\u2029/g, '\n'); // Line/paragraph separators

  return normalized;
}

/**
 * Extract metadata from input text
 * @param {string} text - Input text
 * @returns {Object} Extracted metadata
 */
function extractMetadata(text) {
  if (!text || typeof text !== 'string') {
    return {
      wordCount: 0,
      sentenceCount: 0,
      paragraphCount: 0,
      estimatedReadingTime: 0,
      hasUrls: false,
      hasMentions: false,
      hasHashtags: false
    };
  }

  // Word count (Unicode-aware)
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;

  // Sentence count (handle Arabic and English punctuation)
  const sentences = text.split(/[.!?؟]/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length;

  // Paragraph count
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const paragraphCount = paragraphs.length;

  // Estimated reading time (words per minute: 200 for English, 150 for Arabic)
  const estimatedReadingTime = Math.ceil(wordCount / 175); // Average between languages

  // Check for URLs
  const hasUrls = /https?:\/\/[^\s]+/i.test(text);

  // Check for mentions
  const hasMentions = /@\w+/.test(text);

  // Check for hashtags
  const hasHashtags = /#\w+/.test(text);

  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    estimatedReadingTime,
    hasUrls,
    hasMentions,
    hasHashtags,
    estimatedTweetCount: Math.ceil(wordCount / 25) // Rough estimate
  };
}

module.exports = {
  sanitizeInput,
  validateParameters,
  securityCheck,
  normalizeText,
  extractMetadata
};