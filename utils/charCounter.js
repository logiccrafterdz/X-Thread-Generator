/**
 * Character counter utility with Unicode and emoji support
 * Provides Twitter-accurate character counting for Arabic and English text
 */

const GraphemeSplitter = require('grapheme-splitter');
const CONSTANTS = require('../config/constants');

// Use grapheme splitter for width calculation instead of string-width
// to avoid ES module compatibility issues

const splitter = new GraphemeSplitter();

/**
 * Count characters in a way that matches Twitter's counting rules
 * @param {string} text - The text to count
 * @param {Array<string>} hashtags - Optional hashtags to include in count
 * @param {string} cta - Optional call-to-action to include in count
 * @returns {number} Character count as Twitter would calculate it
 */
function getCharCount(text, hashtags = [], cta = '') {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Combine all text elements
  let fullText = text;
  
  // Add hashtags if provided and not already in text
  if (hashtags && hashtags.length > 0) {
    const hashtagText = hashtags.join(' ');
    if (!fullText.includes(hashtagText)) {
      fullText += ` ${hashtagText}`;
    }
  }

  // Add CTA if provided and not already in text
  if (cta && typeof cta === 'string' && !fullText.includes(cta)) {
    fullText += ` ${cta}`;
  }

  // Use grapheme splitter for accurate emoji and Unicode counting
  const graphemes = splitter.splitGraphemes(fullText);
  
  // Twitter counts each grapheme cluster as 1 character
  // This handles complex emojis, Arabic diacritics, etc.
  return graphemes.length;
}

/**
 * Smart truncation that cuts at sentence or word boundaries
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length (default 280)
 * @param {Array<string>} hashtags - Hashtags to preserve space for
 * @param {string} cta - CTA to preserve space for
 * @returns {string} Truncated text
 */
function truncateSmart(text, maxLength = CONSTANTS.TWEET_CHAR_LIMIT, hashtags = [], cta = '') {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Calculate space needed for hashtags and CTA
  const hashtagSpace = hashtags.length > 0 ? hashtags.join(' ').length + 1 : 0;
  const ctaSpace = cta ? cta.length + 1 : 0;
  const availableSpace = maxLength - hashtagSpace - ctaSpace;

  if (availableSpace <= 0) {
    return '';
  }

  // If text already fits, return as is
  if (getCharCount(text) <= availableSpace) {
    return text;
  }

  // Truncate at word boundaries first
  const words = text.split(/\s+/);
  let truncated = '';
  
  for (const word of words) {
    const testText = truncated ? `${truncated} ${word}` : word;
    if (getCharCount(testText) <= availableSpace) {
      truncated = testText;
    } else {
      break;
    }
  }

  // If we got something meaningful, return it
  if (truncated.length > availableSpace * 0.5) {
    return truncated;
  }

  // Fall back to sentence boundaries
  const sentences = text.split(/[.!?؟]\s+/);
  truncated = '';
  
  for (const sentence of sentences) {
    const testText = truncated ? `${truncated}. ${sentence}` : sentence;
    if (getCharCount(testText) <= availableSpace) {
      truncated = testText;
    } else {
      break;
    }
  }

  // If still nothing good, do character-level truncation
  if (!truncated || truncated.length < availableSpace * 0.3) {
    const graphemes = splitter.splitGraphemes(text);
    truncated = graphemes.slice(0, availableSpace - 3).join('') + '...';
  }

  return truncated;
}

/**
 * Validate if text fits Twitter character limits
 * @param {string} text - Text to validate
 * @param {Array<string>} hashtags - Hashtags to include
 * @param {string} cta - Call to action to include
 * @returns {Object} Validation result with isValid and details
 */
function validateTweetLength(text, hashtags = [], cta = '') {
  const charCount = getCharCount(text, hashtags, cta);
  const maxLength = CONSTANTS.TWEET_CHAR_LIMIT;
  
  return {
    isValid: charCount <= maxLength,
    charCount,
    maxLength,
    remaining: maxLength - charCount,
    overBy: charCount > maxLength ? charCount - maxLength : 0
  };
}

/**
 * Get detailed character analysis for debugging
 * @param {string} text - Text to analyze
 * @returns {Object} Detailed analysis
 */
function analyzeText(text) {
  if (!text || typeof text !== 'string') {
    return {
      length: 0,
      graphemes: 0,
      bytes: 0,
      width: 0,
      hasArabic: false,
      hasEmoji: false
    };
  }

  const graphemes = splitter.splitGraphemes(text);
  
  // Check for Arabic characters
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFE70-\uFEFF]/;
  const hasArabic = arabicRegex.test(text);
  
  // Check for emoji (simplified check)
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  const hasEmoji = emojiRegex.test(text);

  return {
    length: text.length,
    graphemes: graphemes.length,
    bytes: Buffer.byteLength(text, 'utf8'),
    width: graphemes.length, // Use graphemes count for width
    hasArabic,
    hasEmoji,
    graphemeList: graphemes
  };
}

module.exports = {
  getCharCount,
  truncateSmart,
  validateTweetLength,
  analyzeText
};