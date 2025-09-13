/**
 * Express server for Twitter Thread Generator
 * Provides REST API endpoints with security, rate limiting, and error handling
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const path = require('path');
const fs = require('fs').promises;

// Import configuration constants
const CONSTANTS = require('./config/constants');

// Import services and utilities
const geminiService = require('./services/geminiService');
const { validateParameters, securityCheck, extractMetadata } = require('./utils/inputSanitizer');

// Load user preferences
let userPrefs = {};
try {
  const prefsData = require('./userprefs.json');
  userPrefs = prefsData;
} catch (error) {
  // Use default preferences if file doesn't exist or is invalid
  userPrefs = {
    preferredStyle: 'educational',
    alwaysUseArabicHashtags: false,
    emojiPreference: 'moderate',
    autoAddCTA: true,
    recentStyles: ['educational'],
    styleFrequency: {
      educational: 0,
      professional: 0,
      engaging: 0,
      technical: 0,
      casual: 0
    }
  };
}

/**
 * Update user preferences and save to file
 * @param {string} style - The style that was used
 */
async function updateUserPreferences(style) {
  try {
    // Update style frequency
    if (!userPrefs.styleFrequency) {
      userPrefs.styleFrequency = {};
    }
    userPrefs.styleFrequency[style] = (userPrefs.styleFrequency[style] || 0) + 1;
    
    // Update recent styles (keep last 10)
    if (!userPrefs.recentStyles) {
      userPrefs.recentStyles = [];
    }
    userPrefs.recentStyles.unshift(style);
    userPrefs.recentStyles = [...new Set(userPrefs.recentStyles)].slice(0, 10);
    
    // Update preferred style if this one is used frequently
    const styleFreq = userPrefs.styleFrequency;
    const mostUsedStyle = Object.keys(styleFreq).reduce((a, b) => 
      styleFreq[a] > styleFreq[b] ? a : b, style
    );
    
    if (styleFreq[mostUsedStyle] >= 3) {
      userPrefs.preferredStyle = mostUsedStyle;
    }
    
    // Update timestamp
    userPrefs.lastUpdated = new Date().toISOString();
    
    // Save to file
    const prefsPath = path.join(__dirname, 'userprefs.json');
    await fs.writeFile(prefsPath, JSON.stringify(userPrefs, null, 2));
    
    logger.info('User preferences updated', { style, mostUsedStyle });
  } catch (error) {
    logger.error('Failed to update user preferences', { error, style });
  }
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || CONSTANTS.DEFAULT_PORT;

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || CONSTANTS.DEFAULT_LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: `${CONSTANTS.LOGS_DIR}/server.log`,
      maxsize: parseInt(process.env.LOG_FILE_MAX_SIZE?.replace('m', '')) * 1024 * 1024 || CONSTANTS.LOG_FILE_MAX_SIZE,
      maxFiles: CONSTANTS.LOG_FILE_MAX_FILES
    })
  ]
});

// Create logs directory if it doesn't exist
(async () => {
  try {
    await fs.mkdir(CONSTANTS.LOGS_DIR, { recursive: true });
    await fs.mkdir(CONSTANTS.HISTORY_DIR, { recursive: true });
  } catch (error) {
    console.warn('Could not create directories:', error.message);
  }
})();

// Cleanup function for old logs and history
async function cleanupOldFiles() {
  try {
    const now = Date.now();
    const logRetentionMs = CONSTANTS.LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const historyRetentionMs = CONSTANTS.HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    // Clean old log files
    const logFiles = await fs.readdir(CONSTANTS.LOGS_DIR).catch(() => []);
    for (const file of logFiles) {
      const filePath = path.join(CONSTANTS.LOGS_DIR, file);
      const stats = await fs.stat(filePath).catch(() => null);
      if (stats && (now - stats.mtime.getTime()) > logRetentionMs) {
        await fs.unlink(filePath);
        logger.info('Cleaned old log file', { file });
      }
    }

    // Clean old history files
    const historyFiles = await fs.readdir(CONSTANTS.HISTORY_DIR).catch(() => []);
    for (const file of historyFiles) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(CONSTANTS.HISTORY_DIR, file);
      const stats = await fs.stat(filePath).catch(() => null);
      if (stats && (now - stats.mtime.getTime()) > historyRetentionMs) {
        await fs.unlink(filePath);
        logger.info('Cleaned old history file', { file });
      }
    }
  } catch (error) {
    logger.error('Cleanup failed', { error: error.message });
  }
}

// Schedule daily cleanup
setInterval(cleanupOldFiles, CONSTANTS.CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000);
// Run cleanup on startup
cleanupOldFiles();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || CONSTANTS.RATE_LIMIT_WINDOW_MS,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || CONSTANTS.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ 
  limit: CONSTANTS.BODY_PARSER_LIMIT
}));

app.use(express.urlencoded({ extended: true, limit: CONSTANTS.BODY_PARSER_LIMIT }));

// Note: Security validation is performed at the endpoint level on individual fields

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  logger.info('Request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Log response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    logger.info('Response sent', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      contentLength: data ? data.length : 0
    });
    originalSend.call(this, data);
  };

  next();
});

// Serve static files
app.use(express.static('public'));

// API Routes

/**
 * POST /api/generate-thread
 * Generate a Twitter thread from input text
 */
app.post('/api/generate-thread', async (req, res) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  try {
    logger.info('Thread generation request', { requestId, body: req.body });

    // Validate and sanitize input
    const validation = validateParameters(req.body);
    
    if (validation.error) {
      logger.warn('Invalid parameters', { requestId });
      return res.status(validation.code || 400).json({
        error: validation.error,
        details: validation.details
      });
    }

    // Check input size
    if (validation.sanitized.text.length > (parseInt(process.env.MAX_INPUT_LENGTH) || 10000)) {
      logger.warn('Input too large', { requestId, length: validation.sanitized.text.length, maxLength: parseInt(process.env.MAX_INPUT_LENGTH) || 10000 });
      return res.status(413).json({
        error: 'Input text too large',
        maxLength: parseInt(process.env.MAX_INPUT_LENGTH) || 10000,
        actualLength: validation.sanitized.text.length
      });
    }

    // Extract metadata for logging
    const metadata = extractMetadata(validation.sanitized.text);
    logger.info('Input metadata', { requestId, metadata });

    // Generate thread
    const result = await geminiService.generateThread(
      validation.sanitized.text,
      validation.sanitized
    );

    // Check for errors
    if (result.error) {
      logger.error('Thread generation failed', { requestId, error: result.error });
      return res.status(500).json({
        error: 'Thread generation failed',
        details: result.error
      });
    }

    // Save to history if successful
    try {
      await saveToHistory(result, requestId);
    } catch (historyError) {
      logger.warn('Failed to save to history', { requestId, error: historyError.message });
      // Don't fail the request for history issues
    }

    // Update user preferences
    await updateUserPreferences(validation.sanitized.style);

    // Log success and warnings
    if (validation.warnings.length > 0) {
      logger.info('Thread generated with warnings', { requestId, warnings: validation.warnings });
    } else {
      logger.info('Thread generated successfully', { requestId });
    }

    res.json(result);

  } catch (error) {
    logger.error('Unexpected error in thread generation', { requestId, error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while generating the thread'
    });
  }
});

/**
 * GET /api/health
 * Get service health status
 */
app.get('/api/health', async (req, res) => {
  try {
    const geminiStatus = geminiService.getServiceStatus();
    const quotaInfo = geminiService.getQuotaInfo();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      gemini: {
        ...geminiStatus,
        quota: quotaInfo
      },
      environment: {
        node_version: process.version,
        platform: process.platform,
        env: process.env.NODE_ENV
      }
    };

    // Check if any critical services are down
    if (!geminiStatus.available && process.env.FALLBACK_ENABLED !== 'true') {
      health.status = 'degraded';
      health.warnings = ['Gemini service unavailable and fallback disabled'];
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/history
 * Get list of previously generated threads
 */
app.get('/api/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // Max 50 per page
    const offset = (page - 1) * limit;

    // Read history files
    const historyDir = path.join(__dirname, 'history');
    const files = await fs.readdir(historyDir).catch(() => []);
    
    // Sort by creation time (newest first)
    const sortedFiles = files
      .filter(f => f.endsWith('.json'))
      .sort((a, b) => {
        const aTime = a.split('-')[0];
        const bTime = b.split('-')[0];
        return parseInt(bTime) - parseInt(aTime);
      });

    // Paginate
    const paginatedFiles = sortedFiles.slice(offset, offset + limit);
    
    // Load file metadata
    const history = await Promise.all(
      paginatedFiles.map(async (filename) => {
        try {
          const filePath = path.join(historyDir, filename);
          const content = await fs.readFile(filePath, 'utf8');
          const data = JSON.parse(content);
          
          return {
            id: filename.replace('.json', ''),
            timestamp: data.timestamp,
            metadata: data.thread?.metadata || {},
            summary: data.thread?.thread_summary || 'No summary available',
            tweet_count: data.thread?.thread?.length || 0,
            filename
          };
        } catch (error) {
          logger.warn('Failed to read history file', { filename, error: error.message });
          return null;
        }
      })
    );

    // Filter out failed reads
    const validHistory = history.filter(h => h !== null);

    res.json({
      history: validHistory,
      pagination: {
        page,
        limit,
        total: sortedFiles.length,
        pages: Math.ceil(sortedFiles.length / limit),
        hasNext: offset + limit < sortedFiles.length,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Failed to get history', { error });
    res.status(500).json({
      error: 'Failed to retrieve history',
      details: error.message
    });
  }
});

/**
 * GET /api/history/:id
 * Get specific thread from history
 */
app.get('/api/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID format (security)
    if (!/^[a-zA-Z0-9-_]+$/.test(id)) {
      return res.status(400).json({
        error: 'Invalid history ID format'
      });
    }

    const filePath = path.join(__dirname, 'history', `${id}.json`);
    const content = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(content);

    res.json(data);

  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({
        error: 'Thread not found in history'
      });
    } else {
      logger.error('Failed to get history item', { id: req.params.id, error });
      res.status(500).json({
        error: 'Failed to retrieve thread from history'
      });
    }
  }
});

/**
 * GET /api/stats
 * Get usage statistics
 */
app.get('/api/stats', async (req, res) => {
  try {
    const quotaInfo = geminiService.getQuotaInfo();
    const historyDir = path.join(__dirname, 'history');
    const files = await fs.readdir(historyDir).catch(() => []);
    
    // Find most frequently used style
    const styleFreq = userPrefs.styleFrequency || {};
    const mostUsedStyle = Object.keys(styleFreq).reduce((a, b) => 
      styleFreq[a] > styleFreq[b] ? a : b, 'educational'
    );
    
    const stats = {
      total_threads_generated: files.filter(f => f.endsWith('.json')).length,
      quota_usage: quotaInfo,
      service_uptime: process.uptime(),
      last_updated: new Date().toISOString(),
      user_preferences: {
        most_used_style: mostUsedStyle,
        preferred_style: userPrefs.preferredStyle,
        style_frequency: styleFreq,
        recent_styles: userPrefs.recentStyles || []
      }
    };

    res.json(stats);

  } catch (error) {
    logger.error('Failed to get stats', { error });
    res.status(500).json({
      error: 'Failed to retrieve statistics'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', { 
    error: error.message, 
    stack: error.stack,
    url: req.url,
    method: req.method 
  });

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack }),
    ...(error.details && { details: error.details })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `${req.method} ${req.url} is not a valid endpoint`
  });
});

/**
 * Save generated thread to history
 * @param {Object} thread - Generated thread object
 * @param {string} requestId - Request identifier
 */
async function saveToHistory(thread, requestId) {
  try {
    const historyDir = path.join(__dirname, CONSTANTS.HISTORY_DIR);
    await fs.mkdir(historyDir, { recursive: true });

    const timestamp = new Date().toISOString();
    const filename = `${Date.now()}-${requestId}.json`;
    const filePath = path.join(historyDir, filename);

    const historyEntry = {
      id: `${Date.now()}-${requestId}`,
      timestamp,
      thread,
      generated_via: thread.error ? 'failed' : 'success'
    };

    await fs.writeFile(filePath, JSON.stringify(historyEntry, null, 2));
    logger.info('Thread saved to history', { filename, requestId });

  } catch (error) {
    logger.error('Failed to save to history', { requestId, error });
    throw error;
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`, {
    environment: process.env.NODE_ENV,
    gemini_enabled: process.env.GEMINI_ENABLED,
    fallback_enabled: process.env.FALLBACK_ENABLED
  });
});

module.exports = app;