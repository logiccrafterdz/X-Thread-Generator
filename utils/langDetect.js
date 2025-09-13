/**
 * Language detection utility with Arabic and English support
 * Provides RTL/LTR direction detection and language percentages
 */

/**
 * Detect language percentages in text
 * @param {string} text - Text to analyze
 * @returns {Object} Language percentages and metadata
 */
function detectLanguagePercentages(text) {
  if (!text || typeof text !== 'string') {
    return {
      arabic: 0,
      english: 0,
      other: 0,
      total_chars: 0,
      dominant_language: 'unknown',
      direction: 'ltr',
      is_mixed: false
    };
  }

  // Remove whitespace and non-letter characters for accurate counting
  const letters = text.replace(/[\s\d\p{P}\p{S}]/gu, '');
  const totalLetters = letters.length;

  if (totalLetters === 0) {
    return {
      arabic: 0,
      english: 0,
      other: 0,
      total_chars: 0,
      dominant_language: 'unknown',
      direction: 'ltr',
      is_mixed: false
    };
  }

  // Arabic script ranges (including Arabic, Persian, Urdu additions)
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFE70-\uFEFF\uFB50-\uFDFF]/g;
  const arabicMatches = letters.match(arabicRegex) || [];
  const arabicCount = arabicMatches.length;

  // English/Latin script
  const englishRegex = /[a-zA-Z]/g;
  const englishMatches = letters.match(englishRegex) || [];
  const englishCount = englishMatches.length;

  // Other characters
  const otherCount = totalLetters - arabicCount - englishCount;

  // Calculate percentages
  const arabicPercent = (arabicCount / totalLetters) * 100;
  const englishPercent = (englishCount / totalLetters) * 100;
  const otherPercent = (otherCount / totalLetters) * 100;

  // Determine dominant language
  let dominantLanguage = 'unknown';
  if (arabicPercent > englishPercent && arabicPercent > otherPercent) {
    dominantLanguage = 'arabic';
  } else if (englishPercent > arabicPercent && englishPercent > otherPercent) {
    dominantLanguage = 'english';
  } else if (otherPercent > arabicPercent && otherPercent > englishPercent) {
    dominantLanguage = 'other';
  }

  // Determine text direction
  // Arabic is RTL if it's dominant or significant (>30%)
  const direction = arabicPercent > 30 ? 'rtl' : 'ltr';

  // Check if text is mixed (both Arabic and English present with >10% each)
  const isMixed = arabicPercent > 10 && englishPercent > 10;

  return {
    arabic: Math.round(arabicPercent * 100) / 100,
    english: Math.round(englishPercent * 100) / 100,
    other: Math.round(otherPercent * 100) / 100,
    total_chars: totalLetters,
    dominant_language: dominantLanguage,
    direction,
    is_mixed: isMixed,
    raw_counts: {
      arabic: arabicCount,
      english: englishCount,
      other: otherCount
    }
  };
}

/**
 * Determine if text is primarily Arabic
 * @param {string} text - Text to check
 * @param {number} threshold - Percentage threshold (default 30)
 * @returns {boolean} True if Arabic content exceeds threshold
 */
function isArabicText(text, threshold = 30) {
  const analysis = detectLanguagePercentages(text);
  return analysis.arabic >= threshold;
}

/**
 * Determine if text is primarily English
 * @param {string} text - Text to check
 * @param {number} threshold - Percentage threshold (default 50)
 * @returns {boolean} True if English content exceeds threshold
 */
function isEnglishText(text, threshold = 50) {
  const analysis = detectLanguagePercentages(text);
  return analysis.english >= threshold;
}

/**
 * Detect text direction (RTL/LTR)
 * @param {string} text - Text to analyze
 * @returns {string} 'rtl', 'ltr', or 'mixed'
 */
function detectTextDirection(text) {
  const analysis = detectLanguagePercentages(text);
  
  if (analysis.is_mixed) {
    return 'mixed';
  }
  
  return analysis.direction;
}

/**
 * Get language code based on dominant language
 * @param {string} text - Text to analyze
 * @returns {string} Language code ('ar', 'en', 'mixed', 'unknown')
 */
function getLanguageCode(text) {
  const analysis = detectLanguagePercentages(text);
  
  if (analysis.is_mixed) {
    return 'mixed';
  }
  
  switch (analysis.dominant_language) {
    case 'arabic':
      return 'ar';
    case 'english':
      return 'en';
    default:
      return 'unknown';
  }
}

/**
 * Analyze a thread for language consistency
 * @param {Array<Object>} tweets - Array of tweet objects with text property
 * @returns {Object} Thread language analysis
 */
function analyzeThreadLanguage(tweets) {
  if (!Array.isArray(tweets) || tweets.length === 0) {
    return {
      dominant_language: 'unknown',
      direction: 'ltr',
      is_consistent: true,
      mixed_tweets: [],
      recommendations: []
    };
  }

  const tweetAnalyses = tweets.map((tweet, index) => ({
    index,
    text: tweet.text || '',
    analysis: detectLanguagePercentages(tweet.text || '')
  }));

  // Aggregate statistics
  const totalChars = tweetAnalyses.reduce((sum, t) => sum + t.analysis.total_chars, 0);
  const totalArabic = tweetAnalyses.reduce((sum, t) => sum + t.analysis.raw_counts.arabic, 0);
  const totalEnglish = tweetAnalyses.reduce((sum, t) => sum + t.analysis.raw_counts.english, 0);

  const overallArabicPercent = totalChars > 0 ? (totalArabic / totalChars) * 100 : 0;
  const overallEnglishPercent = totalChars > 0 ? (totalEnglish / totalChars) * 100 : 0;

  // Determine overall dominant language
  let dominantLanguage = 'unknown';
  if (overallArabicPercent > overallEnglishPercent) {
    dominantLanguage = overallArabicPercent > 30 ? 'arabic' : 'unknown';
  } else {
    dominantLanguage = overallEnglishPercent > 50 ? 'english' : 'unknown';
  }

  // Determine overall direction
  const direction = overallArabicPercent > 30 ? 'rtl' : 'ltr';

  // Check consistency (all tweets should have similar language ratios)
  const mixedTweets = tweetAnalyses.filter(t => t.analysis.is_mixed);
  const isConsistent = mixedTweets.length === 0;

  // Generate recommendations
  const recommendations = [];
  if (!isConsistent) {
    recommendations.push('Consider separating mixed-language content into different tweets');
  }
  if (dominantLanguage === 'arabic' && direction === 'rtl') {
    recommendations.push('Use RTL formatting for optimal Arabic text display');
  }

  return {
    dominant_language: dominantLanguage,
    direction,
    is_consistent: isConsistent,
    mixed_tweets: mixedTweets.map(t => t.index),
    recommendations,
    statistics: {
      total_chars: totalChars,
      arabic_percent: Math.round(overallArabicPercent * 100) / 100,
      english_percent: Math.round(overallEnglishPercent * 100) / 100
    }
  };
}

module.exports = {
  detectLanguagePercentages,
  isArabicText,
  isEnglishText,
  detectTextDirection,
  getLanguageCode,
  analyzeThreadLanguage
};