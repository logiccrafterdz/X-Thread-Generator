/**
 * Gemini AI service with retry logic and error handling
 * Provides intelligent thread generation with fallback capabilities
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Ajv = require('ajv');
const winston = require('winston');
const { generateFallbackThread } = require('./localTemplates');
const { generateThreadHashtags } = require('./hashtagGenerator');
const CONSTANTS = require('../config/constants');

// Load and compile JSON schema
const threadSchema = require('../schemas/threadSchema.json');
const ajv = new Ajv();
const validateThreadSchema = ajv.compile(threadSchema);

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || CONSTANTS.DEFAULT_LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: `${CONSTANTS.LOGS_DIR}/gemini-service.log` })
  ]
});

// Initialize Gemini AI
let genAI = null;
let model = null;
let quotaUsed = 0;
let quotaLimit = parseInt(process.env.GEMINI_QUOTA_LIMIT) || CONSTANTS.DEFAULT_GEMINI_QUOTA_LIMIT;

/**
 * Initialize Gemini AI service
 */
function initializeGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  const isEnabled = process.env.GEMINI_ENABLED === 'true';
  
  if (!isEnabled || !apiKey) {
    logger.info('Gemini API is disabled or API key not provided');
    return false;
  }

  try {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || CONSTANTS.DEFAULT_GEMINI_MODEL,
      generationConfig: {
        temperature: parseFloat(process.env.GEMINI_TEMPERATURE) || CONSTANTS.DEFAULT_GEMINI_TEMPERATURE,
        maxOutputTokens: parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS) || CONSTANTS.DEFAULT_GEMINI_MAX_OUTPUT_TOKENS,
      }
    });
    
    logger.info('Gemini AI service initialized successfully');
    return { success: true };
  } catch (error) {
    logger.error('Failed to initialize Gemini AI:', error);
    return { error: 'Failed to initialize Gemini AI service', code: CONSTANTS.ERROR_CODES.INTERNAL_ERROR };
  }
}

/**
 * Check if Gemini service is available and within quota
 * @returns {Object} Service status
 */
function getServiceStatus() {
  const isEnabled = process.env.GEMINI_ENABLED === 'true';
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  const withinQuota = quotaUsed < quotaLimit;
  const isInitialized = !!model;

  return {
    enabled: isEnabled,
    configured: hasApiKey,
    initialized: isInitialized,
    quota_used: quotaUsed,
    quota_limit: quotaLimit,
    within_quota: withinQuota,
    available: isEnabled && hasApiKey && isInitialized && withinQuota
  };
}

/**
 * Generate thread using Gemini AI with retry logic
 * @param {string} text - Input text
 * @param {Object} params - Generation parameters
 * @returns {Object} Generated thread or fallback result
 */
async function generateThread(text, params = {}) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  logger.info('Thread generation request started', { requestId, params });

  try {
    // Check service availability
    const status = getServiceStatus();
    if (!status.available) {
      logger.warn('Gemini service not available, using fallback', { 
        requestId, 
        reason: getUnavailableReason(status) 
      });
      return await useFallback(text, params, requestId, 'service_unavailable');
    }

    // Generate thread using Gemini
    const result = await callGeminiWithRetry(text, params, requestId);
    
    if (result.success) {
      logger.info('Thread generated successfully via Gemini', { 
        requestId, 
        duration: Date.now() - startTime 
      });
      return result.data;
    } else {
      logger.warn('Gemini generation failed, using fallback', { 
        requestId, 
        error: result.error 
      });
      return await useFallback(text, params, requestId, result.error);
    }

  } catch (error) {
    logger.error('Unexpected error in thread generation', { requestId, error });
    return await useFallback(text, params, requestId, 'unexpected_error');
  }
}

/**
 * Call Gemini API with retry logic
 * @param {string} text - Input text
 * @param {Object} params - Generation parameters
 * @param {string} requestId - Request identifier
 * @returns {Object} Result with success flag and data/error
 */
async function callGeminiWithRetry(text, params, requestId, attempt = 1) {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  try {
    // Check quota before making request
    if (quotaUsed >= quotaLimit) {
      return { success: false, error: 'quota_exceeded' };
    }

    // Increment quota usage
    quotaUsed++;

    // Generate prompt
    const prompt = buildPrompt(text, params);
    
    logger.debug('Calling Gemini API', { requestId, attempt, prompt: prompt.substring(0, 200) + '...' });

    // Make API call
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    logger.debug('Gemini API response received', { requestId, attempt });

    // Parse and validate response
    const parsedResult = parseGeminiResponse(responseText, requestId);
    
    if (parsedResult.success) {
      return parsedResult;
    } else if (attempt < maxRetries) {
      // Retry on parse failure
      logger.warn('Retrying Gemini call due to parse failure', { requestId, attempt });
      await delay(baseDelay * Math.pow(2, attempt - 1));
      return await callGeminiWithRetry(text, params, requestId, attempt + 1);
    } else {
      return parsedResult;
    }

  } catch (error) {
    logger.error('Gemini API call failed', { requestId, attempt, error: error.message });

    if (attempt < maxRetries) {
      // Exponential backoff retry
      const delayMs = baseDelay * Math.pow(2, attempt - 1);
      logger.info('Retrying Gemini call', { requestId, attempt: attempt + 1, delayMs });
      
      await delay(delayMs);
      return await callGeminiWithRetry(text, params, requestId, attempt + 1);
    } else {
      return { success: false, error: 'api_call_failed', details: error.message };
    }
  }
}

/**
 * Build prompt for Gemini API
 * @param {string} text - Input text
 * @param {Object} params - Generation parameters
 * @returns {string} Formatted prompt
 */
function buildPrompt(text, params) {
  const {
    language = 'auto',
    style = 'educational',
    maxTweets = 5,
    includeHashtags = true,
    includeImages = false
  } = params;

  const systemMessage = `You are a personal assistant specialized in converting long-form content into engaging Twitter threads. You MUST respond with valid JSON that follows the exact schema provided. If unable to generate a proper thread, return {"error": "reason"}.

CRITICAL REQUIREMENTS:
- Each tweet MUST be ≤280 characters including hashtags and emojis
- Thread MUST contain exactly ${maxTweets} tweets
- Response MUST be valid JSON following the schema
- Support both Arabic (RTL) and English (LTR) content
- Detect language and set appropriate direction metadata`;

  const userPrompt = `INPUT_TEXT: ${text}

PARAMETERS: ${JSON.stringify({
    language,
    style,
    maxTweets,
    includeHashtags,
    includeImages
  })}

INSTRUCTIONS:
1. Analyze the input text for language, tone, and key concepts
2. Create exactly ${maxTweets} engaging tweets that tell a complete story
3. Each tweet should contain one main idea with supporting details
4. Include relevant hashtags (max 3 per tweet) if includeHashtags is true
5. Add appropriate emojis for engagement
6. Ensure character count ≤ 280 for each tweet
7. Set direction to "rtl" if Arabic content > 30%, otherwise "ltr"
8. Include a call-to-action in the final tweet
9. Generate metadata with detected language and tone
10. Provide thread summary and engagement score

RESPOND WITH VALID JSON ONLY - NO OTHER TEXT OR FORMATTING.`;

  return systemMessage + '\n\n' + userPrompt;
}

/**
 * Parse and validate Gemini response
 * @param {string} responseText - Raw response from Gemini
 * @param {string} requestId - Request identifier
 * @returns {Object} Parsed and validated result
 */
function parseGeminiResponse(responseText, requestId) {
  try {
    // Clean response text (remove markdown formatting if present)
    let cleanText = responseText.trim();
    
    // Remove markdown code blocks
    cleanText = cleanText.replace(/```json\s*\n?/g, '');
    cleanText = cleanText.replace(/```\s*\n?/g, '');
    cleanText = cleanText.replace(/^```|```$/g, '');
    
    // Try to find JSON content
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanText = jsonMatch[0];
    }

    // Parse JSON
    const parsedData = JSON.parse(cleanText);

    // Validate against schema
    const isValid = validateThreadSchema(parsedData);
    
    if (!isValid) {
      logger.error('Schema validation failed', { 
        requestId, 
        errors: validateThreadSchema.errors 
      });
      return { 
        success: false, 
        error: 'schema_validation_failed',
        details: validateThreadSchema.errors 
      };
    }

    // Additional validation checks
    const validationResult = performAdditionalValidation(parsedData, requestId);
    if (!validationResult.success) {
      return validationResult;
    }

    // Apply dynamic hashtag generation
    if (parsedData.thread && Array.isArray(parsedData.thread)) {
      parsedData.thread = generateThreadHashtags(parsedData.thread, {
        maxHashtags: 4,
        englishRatio: 0.7
      });
      
      logger.info('Dynamic hashtags applied to Gemini thread', { 
        requestId, 
        tweetCount: parsedData.thread.length 
      });
    }

    return { success: true, data: parsedData };

  } catch (error) {
    logger.error('Failed to parse Gemini response', { requestId, error: error.message });
    return { success: false, error: 'json_parse_failed', details: error.message };
  }
}

/**
 * Perform additional validation beyond schema
 * @param {Object} data - Parsed thread data
 * @param {string} requestId - Request identifier
 * @returns {Object} Validation result
 */
function performAdditionalValidation(data, requestId) {
  const errors = [];

  // Check if error response
  if (data.error) {
    return { success: true, data }; // Error responses are valid
  }

  // Validate thread exists and has correct length
  if (!data.thread || !Array.isArray(data.thread)) {
    errors.push('Thread must be an array');
  } else {
    // Check tweet count matches metadata
    if (data.metadata && data.metadata.tweets_generated !== data.thread.length) {
      errors.push('Tweet count mismatch between metadata and thread');
    }

    // Check character limits
    data.thread.forEach((tweet, index) => {
      if (tweet.char_count > 280) {
        errors.push(`Tweet ${index + 1} exceeds 280 character limit (${tweet.char_count})`);
      }
      
      // Verify actual character count
      const actualCount = tweet.text.length;
      if (Math.abs(actualCount - tweet.char_count) > 5) {
        errors.push(`Tweet ${index + 1} character count mismatch (reported: ${tweet.char_count}, actual: ${actualCount})`);
      }
    });
  }

  if (errors.length > 0) {
    logger.error('Additional validation failed', { requestId, errors });
    return { success: false, error: 'validation_failed', details: errors };
  }

  return { success: true };
}

/**
 * Use fallback generation service
 * @param {string} text - Input text
 * @param {Object} params - Generation parameters
 * @param {string} requestId - Request identifier
 * @param {string} reason - Reason for fallback
 * @returns {Object} Fallback result
 */
async function useFallback(text, params, requestId, reason) {
  logger.info('Using fallback generation', { requestId, reason });

  try {
    const fallbackResult = generateFallbackThread(text, params);
    
    // Apply dynamic hashtag generation to fallback result
    if (fallbackResult.thread && Array.isArray(fallbackResult.thread)) {
      fallbackResult.thread = generateThreadHashtags(fallbackResult.thread, {
        maxHashtags: 4,
        englishRatio: 0.7
      });
      
      logger.info('Dynamic hashtags applied to fallback thread', { 
        requestId, 
        tweetCount: fallbackResult.thread.length 
      });
    }
    
    // Log fallback event if enabled
    if (process.env.FALLBACK_LOG_EVENTS === 'true') {
      logger.info('FALLBACK', { 
        reason, 
        timestamp: new Date().toISOString(), 
        requestId 
      });
    }

    return fallbackResult;
  } catch (error) {
    logger.error('Fallback generation failed', { requestId, error });
    return {
      error: 'Both Gemini and fallback generation failed'
    };
  }
}

/**
 * Get reason why service is unavailable
 * @param {Object} status - Service status
 * @returns {string} Reason description
 */
function getUnavailableReason(status) {
  if (!status.enabled) return 'service_disabled';
  if (!status.configured) return 'api_key_missing';
  if (!status.initialized) return 'initialization_failed';
  if (!status.within_quota) return 'quota_exceeded';
  return 'unknown';
}

/**
 * Generate unique request ID
 * @returns {string} Request ID
 */
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Delay execution for specified milliseconds
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Reset quota usage (for testing or daily reset)
 */
function resetQuota() {
  quotaUsed = 0;
  logger.info('Quota usage reset');
}

/**
 * Get current quota usage
 * @returns {Object} Quota information
 */
function getQuotaInfo() {
  return {
    used: quotaUsed,
    limit: quotaLimit,
    remaining: quotaLimit - quotaUsed,
    percentage: (quotaUsed / quotaLimit) * 100
  };
}

// Initialize service on module load
initializeGemini();

module.exports = {
  generateThread,
  getServiceStatus,
  getQuotaInfo,
  resetQuota,
  initializeGemini
};