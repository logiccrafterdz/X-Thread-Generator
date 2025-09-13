/**
 * Local fallback thread generator service
 * Provides thread generation when Gemini API is unavailable or disabled
 */

const { getCharCount, truncateSmart, validateTweetLength } = require('../utils/charCounter');
const { detectLanguagePercentages, getLanguageCode, detectTextDirection } = require('../utils/langDetect');
const { dedupeHashtagsAndEmojis } = require('../utils/dedupe');
const { generateThreadHashtags } = require('./hashtagGenerator');
const CONSTANTS = require('../config/constants');

/**
 * Generate fallback thread using local templates and logic
 * @param {string} text - Input text to convert to thread
 * @param {Object} params - Generation parameters
 * @returns {Object} Generated thread object
 */
function generateFallbackThread(text, params = {}) {
  try {
    const {
      language = CONSTANTS.DEFAULT_LANGUAGE,
      style = CONSTANTS.DEFAULT_STYLE,
      maxTweets = CONSTANTS.DEFAULT_MAX_TWEETS,
      includeHashtags = true,
      includeImages = false
    } = params;

    // Analyze input text
    const langAnalysis = detectLanguagePercentages(text);
    const detectedLanguage = getLanguageCode(text);
    const direction = detectTextDirection(text);

    // Segment text into logical chunks
    const segments = segmentText(text, maxTweets);

    // Generate tweets from segments
    let tweets = segments.map((segment, index) => {
      const tweetText = generateTweetText(segment, style, index, segments.length, langAnalysis);
      
      return {
        index: index + 1,
        text: tweetText,
        char_count: getCharCount(tweetText),
        warnings: [],
        hashtags: [], // Will be filled by dynamic hashtag generator
        emoji_suggestions: generateEmojis(segment, style, index),
        cta: index === segments.length - 1 ? generateCTA(style, langAnalysis) : null,
        image_suggestion: includeImages ? generateImageSuggestion(segment, style) : null
      };
    });

    // Ensure exact tweet count
    tweets = ensureExactTweetCount(tweets, maxTweets);

    // Apply dynamic hashtag generation if requested
    if (includeHashtags) {
      tweets = generateThreadHashtags(tweets, {
        maxHashtags: 4,
        englishRatio: 0.7
      });
    }

    // Deduplicate hashtags and emojis
    tweets = dedupeHashtagsAndEmojis(tweets);

    // Validate and fix character counts
    tweets = tweets.map(tweet => {
      const validation = validateTweetLength(tweet.text, tweet.hashtags, tweet.cta);
      
      if (!validation.isValid) {
        tweet.text = truncateSmart(tweet.text, 280, tweet.hashtags, tweet.cta);
        tweet.char_count = getCharCount(tweet.text, tweet.hashtags, tweet.cta);
        tweet.warnings.push('Tweet truncated to fit character limit');
      }

      return tweet;
    });

    // Generate metadata
    const metadata = {
      language: language === 'auto' ? detectedLanguage : language,
      style_requested: style,
      tone_detected: detectTone(text, style),
      max_tweets_requested: maxTweets,
      tweets_generated: tweets.length,
      direction
    };

    // Generate summary and recommendations
    const threadSummary = generateThreadSummary(tweets, style);
    const engagementScore = calculateEngagementScore(tweets, langAnalysis, style);
    const publishingRecommendations = generatePublishingRecommendations(langAnalysis, style);

    return {
      metadata,
      thread: tweets,
      thread_summary: threadSummary,
      estimated_engagement_score: engagementScore,
      publishing_recommendations: publishingRecommendations
    };

  } catch (error) {
    console.error('Fallback generation error:', error);
    return {
      error: 'Failed to generate thread using local fallback',
      code: CONSTANTS.ERROR_CODES.INTERNAL_ERROR
    };
  }
}

/**
 * Segment text into logical chunks for tweets
 * @param {string} text - Input text
 * @param {number} targetCount - Target number of segments
 * @returns {Array<string>} Text segments
 */
function segmentText(text, targetCount) {
  if (!text || targetCount < 1) {
    return [];
  }

  // First try paragraph-based segmentation
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  if (paragraphs.length >= targetCount) {
    // Use paragraphs directly or combine small ones
    return combineSmallSegments(paragraphs.slice(0, targetCount * 2), targetCount);
  }

  // Fall back to sentence-based segmentation
  const sentences = text.split(/[.!?؟]\s+/).filter(s => s.trim().length > 0);
  
  if (sentences.length >= targetCount) {
    const sentencesPerTweet = Math.ceil(sentences.length / targetCount);
    const segments = [];
    
    for (let i = 0; i < sentences.length; i += sentencesPerTweet) {
      const segment = sentences.slice(i, i + sentencesPerTweet).join('. ').trim();
      if (segment) segments.push(segment);
    }
    
    return segments.slice(0, targetCount);
  }

  // Last resort: split by length
  const avgLength = Math.ceil(text.length / targetCount);
  const segments = [];
  
  for (let i = 0; i < text.length; i += avgLength) {
    let segment = text.substring(i, i + avgLength);
    
    // Try to break at word boundary
    if (i + avgLength < text.length) {
      const lastSpace = segment.lastIndexOf(' ');
      if (lastSpace > segment.length * 0.5) {
        segment = segment.substring(0, lastSpace);
      }
    }
    
    segments.push(segment.trim());
  }

  return segments.filter(s => s.length > 0);
}

/**
 * Combine small segments to reach target count
 * @param {Array<string>} segments - Original segments
 * @param {number} targetCount - Target segment count
 * @returns {Array<string>} Combined segments
 */
function combineSmallSegments(segments, targetCount) {
  if (segments.length <= targetCount) {
    return segments;
  }

  const avgLength = segments.reduce((sum, s) => sum + s.length, 0) / targetCount;
  const combined = [];
  let current = '';

  for (const segment of segments) {
    if (current.length === 0) {
      current = segment;
    } else if (current.length + segment.length + 1 < avgLength * 1.5) {
      current += ' ' + segment;
    } else {
      combined.push(current);
      current = segment;
      
      if (combined.length >= targetCount - 1) {
        // Add remaining segments to the last one
        const remaining = segments.slice(segments.indexOf(segment) + 1);
        if (remaining.length > 0) {
          current += ' ' + remaining.join(' ');
        }
        break;
      }
    }
  }

  if (current) {
    combined.push(current);
  }

  return combined;
}

/**
 * Generate tweet text with appropriate style and formatting
 * @param {string} segment - Text segment
 * @param {string} style - Writing style
 * @param {number} index - Tweet index
 * @param {number} total - Total tweets
 * @param {Object} langAnalysis - Language analysis
 * @returns {string} Formatted tweet text
 */
function generateTweetText(segment, style, index, total, langAnalysis) {
  let tweetText = segment.trim();

  // Add thread numbering if more than one tweet
  if (total > 1) {
    const threadNumber = `(${index + 1}/${total})`;
    tweetText += ` ${threadNumber}`;
  }

  // Add style-specific prefixes for first tweet
  if (index === 0) {
    const prefixes = getStylePrefixes(style, langAnalysis.dominant_language);
    if (prefixes.length > 0) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      tweetText = `${prefix} ${tweetText}`;
    }
  }

  return tweetText;
}

/**
 * Get style-specific prefixes
 * @param {string} style - Writing style
 * @param {string} language - Dominant language
 * @returns {Array<string>} Available prefixes
 */
function getStylePrefixes(style, language) {
  const isArabic = language === 'arabic';
  
  const prefixes = {
    educational: isArabic ? ['💡 نصيحة:', '📚 تعلم:', '✨ فكرة:'] : ['💡 Tip:', '📚 Learn:', '✨ Insight:'],
    technical: isArabic ? ['🔧 تقني:', '⚙️ طريقة:', '🛠️ حل:'] : ['🔧 Technical:', '⚙️ Method:', '🛠️ Solution:'],
    concise: isArabic ? ['📌 خلاصة:', '⚡ سريع:', '🎯 مباشر:'] : ['📌 Summary:', '⚡ Quick:', '🎯 Direct:'],
    engaging: isArabic ? ['🔥 مهم:', '👀 انتبه:', '🚀 رائع:'] : ['🔥 Important:', '👀 Notice:', '🚀 Amazing:'],
    professional: isArabic ? ['📊 تحليل:', '💼 خبرة:', '📈 استراتيجية:'] : ['📊 Analysis:', '💼 Experience:', '📈 Strategy:']
  };

  return prefixes[style] || [];
}

// Old hashtag distribution function removed - now using dynamic hashtagGenerator.js

// Old createHashtagPool function removed - now using dynamic hashtagGenerator.js

// Old generateHashtags function removed - now using dynamic hashtagGenerator.js

// Old extractSmartHashtags function removed - now using dynamic hashtagGenerator.js

// Old extractImportantWords and getStyleHashtags functions removed - now using dynamic hashtagGenerator.js

/**
 * Generate relevant emojis for content
 * @param {string} segment - Text segment
 * @param {string} style - Writing style
 * @param {number} index - Tweet index
 * @returns {Array<string>} Suggested emojis
 */
function generateEmojis(segment, style, index) {
  const styleEmojis = {
    educational: ['📚', '💡', '✨', '🎯', '📖'],
    technical: ['🔧', '⚙️', '🛠️', '💻', '🔬'],
    concise: ['📌', '⚡', '🎯', '✅', '⭐'],
    engaging: ['🔥', '👀', '🚀', '💫', '🎉'],
    professional: ['📊', '💼', '📈', '🏆', '⚡']
  };

  // Content-based emojis
  const contentEmojis = [];
  const lowerSegment = segment.toLowerCase();

  if (lowerSegment.includes('important') || lowerSegment.includes('مهم')) {
    contentEmojis.push('⚠️', '🚨', '📢');
  }
  if (lowerSegment.includes('success') || lowerSegment.includes('نجح')) {
    contentEmojis.push('🎉', '🏆', '✅');
  }
  if (lowerSegment.includes('money') || lowerSegment.includes('مال')) {
    contentEmojis.push('💰', '💵', '📈');
  }
  if (lowerSegment.includes('time') || lowerSegment.includes('وقت')) {
    contentEmojis.push('⏰', '⌚', '⏳');
  }

  // Special emojis for thread position
  if (index === 0) {
    contentEmojis.unshift('🧵', '👇'); // Thread start indicators
  }

  const allEmojis = [...(styleEmojis[style] || []), ...contentEmojis];
  return [...new Set(allEmojis)].slice(0, 3); // Max 3 unique emojis
}

/**
 * Generate call-to-action for final tweet
 * @param {string} style - Writing style
 * @param {Object} langAnalysis - Language analysis
 * @returns {string} CTA text
 */
function generateCTA(style, langAnalysis) {
  const isArabic = langAnalysis.dominant_language === 'arabic';
  
  const ctas = {
    educational: isArabic ? 
      ['شاركنا رأيك 👇', 'ما رأيك في هذا؟ 💭', 'هل تطبق هذا؟ 🤔'] :
      ['Share your thoughts 👇', 'What do you think? 💭', 'Do you apply this? 🤔'],
    technical: isArabic ?
      ['جرب وأخبرنا 🔧', 'شارك تجربتك 💻', 'هل واجهت هذا؟ ⚙️'] :
      ['Try it and let us know 🔧', 'Share your experience 💻', 'Have you faced this? ⚙️'],
    concise: isArabic ?
      ['رأيك؟ 👇', 'تجربتك؟ 💭', 'مفيد؟ ✨'] :
      ['Your take? 👇', 'Your experience? 💭', 'Helpful? ✨'],
    engaging: isArabic ?
      ['شارك القصة! 🚀', 'علق برأيك! 🔥', 'وأنت؟ 👀'] :
      ['Share the story! 🚀', 'Drop your opinion! 🔥', 'What about you? 👀'],
    professional: isArabic ?
      ['شاركنا خبرتك 💼', 'ما استراتيجيتك؟ 📊', 'تجربتك؟ 🎯'] :
      ['Share your expertise 💼', 'What\'s your strategy? 📊', 'Your experience? 🎯']
  };

  const styleCTAs = ctas[style] || ctas.educational;
  return styleCTAs[Math.floor(Math.random() * styleCTAs.length)];
}

/**
 * Generate smart image suggestion for content
 * @param {string} segment - Text segment
 * @param {string} style - Writing style
 * @returns {Object|null} Image suggestion
 */
function generateImageSuggestion(segment, style) {
  const lowerText = segment.toLowerCase();
  
  // Enhanced content analysis patterns with scoring
  const imagePatterns = [
    {
      keywords: ['startup', 'entrepreneur', 'founding', 'business plan', 'venture'],
      pattern: {
        type: 'infographic',
        content: 'Startup journey infographic',
        keywords: ['startup', 'entrepreneur', 'journey', 'business'],
        template: 'process'
      },
      priority: 10
    },
    {
      keywords: ['mvp', 'minimum viable product', 'product development', 'iterate'],
      pattern: {
        type: 'diagram',
        content: 'Product development cycle',
        keywords: ['mvp', 'product', 'development', 'iteration'],
        template: 'process'
      },
      priority: 9
    },
    {
      keywords: ['team', 'hiring', 'talent', 'leadership', 'skills'],
      pattern: {
        type: 'infographic',
        content: 'Team building visual',
        keywords: ['team', 'leadership', 'skills', 'hiring'],
        template: 'vertical_list'
      },
      priority: 8
    },
    {
      keywords: ['funding', 'investment', 'capital', 'money', 'revenue'],
      pattern: {
        type: 'chart',
        content: 'Financial growth chart',
        keywords: ['funding', 'growth', 'revenue', 'investment'],
        template: 'horizontal_list'
      },
      priority: 8
    },
    {
      keywords: ['step', 'process', 'tutorial', 'guide', 'how to', 'method'],
      pattern: {
        type: 'infographic',
        content: 'Step-by-step process guide',
        keywords: ['tutorial', 'process', 'steps', 'guide'],
        template: 'vertical_list'
      },
      priority: 7
    },
    {
      keywords: ['vs', 'versus', 'comparison', 'compare', 'difference', 'before', 'after'],
      pattern: {
        type: 'infographic',
        content: 'Comparison analysis',
        keywords: ['comparison', 'vs', 'analysis', 'differences'],
        template: 'comparison'
      },
      priority: 7
    },
    {
      keywords: ['data', 'statistics', 'chart', 'graph', 'percentage', 'number', 'result', 'metric'],
      pattern: {
        type: 'chart',
        content: 'Data visualization',
        keywords: ['data', 'statistics', 'metrics', 'results'],
        template: 'horizontal_list'
      },
      priority: 6
    },
    {
      keywords: ['tips', 'advice', 'list', 'points', 'factors', 'reasons', 'benefits'],
      pattern: {
        type: 'infographic',
        content: 'Key insights infographic',
        keywords: ['tips', 'list', 'insights', 'benefits'],
        template: 'vertical_list'
      },
      priority: 6
    },
    {
      keywords: ['code', 'programming', 'software', 'app', 'website', 'algorithm', 'api'],
      pattern: {
        type: 'screenshot',
        content: 'Code or interface showcase',
        keywords: ['code', 'programming', 'tech', 'interface'],
        template: 'highlight'
      },
      priority: 6
    },
    {
      keywords: ['strategy', 'plan', 'growth', 'success', 'framework'],
      pattern: {
        type: 'infographic',
        content: 'Strategic framework diagram',
        keywords: ['strategy', 'framework', 'growth', 'success'],
        template: 'process'
      },
      priority: 5
    },
    {
      keywords: ['timeline', 'history', 'evolution', 'progress', 'journey', 'development'],
      pattern: {
        type: 'infographic',
        content: 'Timeline progression',
        keywords: ['timeline', 'history', 'progress', 'evolution'],
        template: 'horizontal_list'
      },
      priority: 5
    },
    {
      keywords: ['problem', 'solution', 'fix', 'issue', 'challenge', 'resolve'],
      pattern: {
        type: 'diagram',
        content: 'Problem-solution flow',
        keywords: ['problem', 'solution', 'fix', 'challenge'],
        template: 'comparison'
      },
      priority: 5
    },
    {
      keywords: ['quote', 'saying', 'insight', 'wisdom', 'lesson', 'principle'],
      pattern: {
        type: 'photo',
        content: 'Inspirational quote card',
        keywords: ['quote', 'insight', 'wisdom', 'inspiration'],
        template: 'highlight'
      },
      priority: 4
    }
  ];
  
  // Score patterns based on keyword matches
  let bestMatch = null;
  let bestScore = 0;
  
  for (const patternObj of imagePatterns) {
    let score = 0;
    let matchedKeywords = [];
    
    for (const keyword of patternObj.keywords) {
      if (lowerText.includes(keyword)) {
        score += patternObj.priority + keyword.length; // Longer, more specific keywords get higher scores
        matchedKeywords.push(keyword);
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        ...patternObj.pattern,
        content: `${patternObj.pattern.content} for: "${segment.substring(0, 60)}..."`,
        matched_keywords: matchedKeywords
      };
    }
  }
  
  // If we found a good match, return it
  if (bestMatch && bestScore >= 5) {
    return bestMatch;
  }
  
  // Style-based fallback suggestions (more specific than before)
  const styleSuggestions = {
    educational: {
      type: 'infographic',
      content: `Educational breakdown: "${segment.substring(0, 50)}..."`,
      keywords: ['education', 'learning', 'knowledge', 'tutorial'],
      template: 'vertical_list'
    },
    technical: {
      type: 'diagram',
      content: `Technical architecture: "${segment.substring(0, 50)}..."`,
      keywords: ['technical', 'system', 'process', 'architecture'],
      template: 'process'
    },
    engaging: {
      type: 'photo',
      content: `Eye-catching visual: "${segment.substring(0, 50)}..."`,
      keywords: ['engaging', 'visual', 'attractive', 'impact'],
      template: 'highlight'
    },
    professional: {
      type: 'chart',
      content: `Business insight chart: "${segment.substring(0, 50)}..."`,
      keywords: ['professional', 'business', 'data', 'insight'],
      template: 'horizontal_list'
    },
    concise: {
      type: 'infographic',
      content: `Key points summary: "${segment.substring(0, 50)}..."`,
      keywords: ['summary', 'key points', 'overview', 'concise'],
      template: 'vertical_list'
    }
  };
  
  return styleSuggestions[style] || {
    type: 'infographic',
    content: `Content visualization: "${segment.substring(0, 50)}..."`,
    keywords: ['content', 'visual', 'information', 'summary'],
    template: 'vertical_list'
  };
}

/**
 * Ensure exact tweet count by adding or removing tweets
 * @param {Array<Object>} tweets - Current tweets
 * @param {number} targetCount - Target count
 * @returns {Array<Object>} Adjusted tweets
 */
function ensureExactTweetCount(tweets, targetCount) {
  if (tweets.length === targetCount) {
    return tweets;
  }

  if (tweets.length > targetCount) {
    // Remove excess tweets (prefer removing from middle)
    const toRemove = tweets.length - targetCount;
    const startRemove = Math.floor((tweets.length - toRemove) / 2);
    return [
      ...tweets.slice(0, startRemove),
      ...tweets.slice(startRemove + toRemove)
    ].map((tweet, index) => ({ ...tweet, index: index + 1 }));
  }

  // Add more tweets by splitting the longest ones
  const result = [...tweets];
  while (result.length < targetCount) {
    // Find the longest tweet
    const longestIndex = result.reduce((maxIdx, tweet, idx) => 
      tweet.text.length > result[maxIdx].text.length ? idx : maxIdx, 0);
    
    const longestTweet = result[longestIndex];
    if (longestTweet.text.length < 100) break; // Don't split very short tweets

    // Split the longest tweet
    const midPoint = Math.floor(longestTweet.text.length / 2);
    const splitPoint = longestTweet.text.lastIndexOf(' ', midPoint);
    
    if (splitPoint > 0) {
      const firstPart = longestTweet.text.substring(0, splitPoint).trim();
      const secondPart = longestTweet.text.substring(splitPoint).trim();
      
      result[longestIndex] = { ...longestTweet, text: firstPart };
      result.splice(longestIndex + 1, 0, {
        ...longestTweet,
        text: secondPart,
        hashtags: [], // Don't duplicate hashtags
        emoji_suggestions: []
      });
    } else {
      break; // Can't split further
    }
  }

  // Reindex
  return result.slice(0, targetCount).map((tweet, index) => ({ ...tweet, index: index + 1 }));
}

/**
 * Detect tone from content and style
 * @param {string} text - Input text
 * @param {string} style - Requested style
 * @returns {string} Detected tone
 */
function detectTone(text, style) {
  const lowerText = text.toLowerCase();
  
  // Look for tone indicators
  if (lowerText.includes('warning') || lowerText.includes('careful') || lowerText.includes('تحذير')) {
    return style + ' + warning';
  }
  if (lowerText.includes('exciting') || lowerText.includes('amazing') || lowerText.includes('رائع')) {
    return style + ' + excitement';
  }
  if (lowerText.includes('important') || lowerText.includes('critical') || lowerText.includes('مهم')) {
    return style + ' + urgent';
  }
  
  return style;
}

/**
 * Generate thread summary
 * @param {Array<Object>} tweets - Thread tweets
 * @param {string} style - Writing style
 * @returns {string} Thread summary
 */
function generateThreadSummary(tweets, style) {
  const structures = {
    educational: 'Introduction → Key Points → Examples → Conclusion',
    technical: 'Problem → Solution → Implementation → Results',
    concise: 'Hook → Main Points → Summary',
    engaging: 'Hook → Story → Insights → CTA',
    professional: 'Analysis → Strategy → Application → Recommendations'
  };

  return structures[style] || 'Hook → Content → Conclusion';
}

/**
 * Calculate estimated engagement score
 * @param {Array<Object>} tweets - Thread tweets
 * @param {Object} langAnalysis - Language analysis
 * @param {string} style - Writing style
 * @returns {number} Engagement score (0-10)
 */
function calculateEngagementScore(tweets, langAnalysis, style) {
  let score = 5.0; // Base score

  // Thread length factor
  if (tweets.length >= 3 && tweets.length <= 7) {
    score += 1.0; // Optimal length
  } else if (tweets.length > 10) {
    score -= 1.5; // Too long
  }

  // CTA presence
  if (tweets.some(t => t.cta)) {
    score += 0.5;
  }

  // Emoji usage
  const emojiCount = tweets.reduce((sum, t) => sum + (t.emoji_suggestions?.length || 0), 0);
  if (emojiCount > 0 && emojiCount <= tweets.length * 2) {
    score += 0.5;
  }

  // Hashtag usage
  const hashtagCount = tweets.reduce((sum, t) => sum + (t.hashtags?.length || 0), 0);
  if (hashtagCount > 0 && hashtagCount <= tweets.length * 3) {
    score += 0.5;
  }

  // Style factor
  const styleScores = {
    engaging: 0.5,
    educational: 0.3,
    professional: 0.2,
    technical: 0.1,
    concise: 0.2
  };
  score += styleScores[style] || 0;

  return Math.min(Math.max(score, 0), 10);
}

/**
 * Generate publishing recommendations
 * @param {Object} langAnalysis - Language analysis
 * @param {string} style - Writing style
 * @returns {Object} Publishing recommendations
 */
function generatePublishingRecommendations(langAnalysis, style) {
  const isArabic = langAnalysis.dominant_language === 'arabic';
  
  // Time recommendations based on language/region
  const bestTime = isArabic ? '21:00 GMT+3' : '09:00 GMT-5';
  
  const engagementTips = [];
  
  if (isArabic) {
    engagementTips.push('Post during evening hours (8-10 PM) for better Arabic audience engagement');
    engagementTips.push('Use RTL formatting for optimal display');
  } else {
    engagementTips.push('Post during business hours or early evening for English audience');
    engagementTips.push('Consider time zones of your target audience');
  }

  if (style === 'educational') {
    engagementTips.push('Pin the thread for reference');
    engagementTips.push('Encourage saves and bookmarks');
  }

  return {
    best_time: bestTime,
    thread_timing: '2 minutes',
    engagement_tips: engagementTips
  };
}

module.exports = {
  generateFallbackThread
};