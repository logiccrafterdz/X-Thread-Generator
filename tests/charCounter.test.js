/**
 * Tests for character counter utility
 */

const { getCharCount, truncateSmart, validateTweetLength, analyzeText } = require('../utils/charCounter');

describe('Character Counter Utilities', () => {
  describe('getCharCount', () => {
    test('counts basic ASCII text correctly', () => {
      expect(getCharCount('Hello world')).toBe(11);
      expect(getCharCount('')).toBe(0);
      expect(getCharCount('a')).toBe(1);
    });

    test('counts Arabic text correctly', () => {
      expect(getCharCount('مرحبا بالعالم')).toBe(13);
      expect(getCharCount('السلام عليكم')).toBe(12);
    });

    test('counts emojis as single characters', () => {
      expect(getCharCount('Hello 👋')).toBe(7);
      expect(getCharCount('🚀🎉🔥')).toBe(3);
      expect(getCharCount('👨‍💻')).toBe(1); // Complex emoji
    });

    test('includes hashtags and CTA in count', () => {
      const text = 'Hello world';
      const hashtags = ['#test', '#demo'];
      const cta = 'What do you think?';
      
      const count = getCharCount(text, hashtags, cta);
      expect(count).toBeGreaterThan(11); // More than just the text
    });

    test('handles null and undefined inputs', () => {
      expect(getCharCount(null)).toBe(0);
      expect(getCharCount(undefined)).toBe(0);
      expect(getCharCount('')).toBe(0);
    });
  });

  describe('truncateSmart', () => {
    test('returns original text if under limit', () => {
      const text = 'Short text';
      expect(truncateSmart(text, 280)).toBe(text);
    });

    test('truncates at word boundaries', () => {
      const text = 'This is a very long sentence that needs to be truncated properly';
      const result = truncateSmart(text, 30);
      expect(result.length).toBeLessThanOrEqual(30);
      expect(result).not.toMatch(/\s$/); // Shouldn't end with space
    });

    test('preserves space for hashtags and CTA', () => {
      const text = 'Very long text that needs truncation';
      const hashtags = ['#test'];
      const cta = 'Thoughts?';
      
      const result = truncateSmart(text, 50, hashtags, cta);
      const totalLength = getCharCount(result, hashtags, cta);
      expect(totalLength).toBeLessThanOrEqual(50);
    });

    test('handles Arabic text truncation', () => {
      const arabicText = 'هذا نص طويل جداً يحتاج إلى قطع بطريقة ذكية للحفاظ على المعنى';
      const result = truncateSmart(arabicText, 30);
      expect(result.length).toBeLessThanOrEqual(30);
    });
  });

  describe('validateTweetLength', () => {
    test('validates tweets within character limit', () => {
      const result = validateTweetLength('Short tweet');
      expect(result.isValid).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
      expect(result.overBy).toBe(0);
    });

    test('detects tweets over character limit', () => {
      const longText = 'a'.repeat(300);
      const result = validateTweetLength(longText);
      expect(result.isValid).toBe(false);
      expect(result.overBy).toBeGreaterThan(0);
      expect(result.remaining).toBeLessThan(0);
    });

    test('includes hashtags and CTA in validation', () => {
      const text = 'a'.repeat(200);
      const hashtags = ['#verylonghashtag', '#anotherlongone'];
      const cta = 'What are your thoughts on this?';
      
      const result = validateTweetLength(text, hashtags, cta);
      expect(result.charCount).toBeGreaterThan(200);
    });
  });

  describe('analyzeText', () => {
    test('analyzes basic text properties', () => {
      const text = 'Hello world! 👋';
      const analysis = analyzeText(text);
      
      expect(analysis.length).toBe(14);
      expect(analysis.hasEmoji).toBe(true);
      expect(analysis.hasArabic).toBe(false);
      expect(analysis.graphemes).toBe(13); // Emoji counts as 1 grapheme
    });

    test('detects Arabic text', () => {
      const arabicText = 'مرحبا بالعالم';
      const analysis = analyzeText(arabicText);
      
      expect(analysis.hasArabic).toBe(true);
      expect(analysis.hasEmoji).toBe(false);
    });

    test('handles mixed content', () => {
      const mixedText = 'Hello مرحبا 🌍';
      const analysis = analyzeText(mixedText);
      
      expect(analysis.hasArabic).toBe(true);
      expect(analysis.hasEmoji).toBe(true);
    });

    test('handles empty input', () => {
      const analysis = analyzeText('');
      expect(analysis.length).toBe(0);
      expect(analysis.graphemes).toBe(0);
    });
  });
});