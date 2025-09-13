/**
 * Tests for language detection utility
 */

const { 
  detectLanguagePercentages, 
  isArabicText, 
  isEnglishText, 
  detectTextDirection,
  getLanguageCode,
  analyzeThreadLanguage 
} = require('../utils/langDetect');

describe('Language Detection Utilities', () => {
  describe('detectLanguagePercentages', () => {
    test('detects pure English text', () => {
      const text = 'Hello world this is English text';
      const result = detectLanguagePercentages(text);
      
      expect(result.english).toBeGreaterThan(90);
      expect(result.arabic).toBe(0);
      expect(result.dominant_language).toBe('english');
      expect(result.direction).toBe('ltr');
    });

    test('detects pure Arabic text', () => {
      const text = 'مرحبا بالعالم هذا نص عربي';
      const result = detectLanguagePercentages(text);
      
      expect(result.arabic).toBeGreaterThan(90);
      expect(result.english).toBe(0);
      expect(result.dominant_language).toBe('arabic');
      expect(result.direction).toBe('rtl');
    });

    test('detects mixed language text', () => {
      const text = 'Hello مرحبا world عالم';
      const result = detectLanguagePercentages(text);
      
      expect(result.arabic).toBeGreaterThan(0);
      expect(result.english).toBeGreaterThan(0);
      expect(result.is_mixed).toBe(true);
    });

    test('handles text with numbers and punctuation', () => {
      const text = 'Hello 123 world! Test.';
      const result = detectLanguagePercentages(text);
      
      expect(result.english).toBeGreaterThan(0);
      expect(result.total_chars).toBeGreaterThan(0);
    });

    test('handles empty text', () => {
      const result = detectLanguagePercentages('');
      
      expect(result.arabic).toBe(0);
      expect(result.english).toBe(0);
      expect(result.total_chars).toBe(0);
      expect(result.dominant_language).toBe('unknown');
    });
  });

  describe('isArabicText', () => {
    test('identifies Arabic text above threshold', () => {
      const arabicText = 'هذا نص عربي طويل';
      expect(isArabicText(arabicText, 50)).toBe(true);
    });

    test('rejects text below Arabic threshold', () => {
      const englishText = 'This is English text';
      expect(isArabicText(englishText, 50)).toBe(false);
    });

    test('handles mixed text with custom threshold', () => {
      const mixedText = 'Hello مرحبا عالم world';
      expect(isArabicText(mixedText, 30)).toBe(true);
      expect(isArabicText(mixedText, 70)).toBe(false);
    });
  });

  describe('isEnglishText', () => {
    test('identifies English text above threshold', () => {
      const englishText = 'This is a long English text';
      expect(isEnglishText(englishText, 50)).toBe(true);
    });

    test('rejects text below English threshold', () => {
      const arabicText = 'هذا نص عربي';
      expect(isEnglishText(arabicText, 50)).toBe(false);
    });
  });

  describe('detectTextDirection', () => {
    test('returns RTL for Arabic-dominant text', () => {
      const arabicText = 'هذا نص عربي طويل جداً';
      expect(detectTextDirection(arabicText)).toBe('rtl');
    });

    test('returns LTR for English-dominant text', () => {
      const englishText = 'This is English text';
      expect(detectTextDirection(englishText)).toBe('ltr');
    });

    test('returns mixed for balanced bilingual text', () => {
      const mixedText = 'Hello مرحبا world عالم test نص';
      expect(detectTextDirection(mixedText)).toBe('mixed');
    });
  });

  describe('getLanguageCode', () => {
    test('returns ar for Arabic text', () => {
      const arabicText = 'هذا نص عربي';
      expect(getLanguageCode(arabicText)).toBe('ar');
    });

    test('returns en for English text', () => {
      const englishText = 'This is English';
      expect(getLanguageCode(englishText)).toBe('en');
    });

    test('returns mixed for bilingual text', () => {
      const mixedText = 'Hello مرحبا world';
      expect(getLanguageCode(mixedText)).toBe('mixed');
    });

    test('returns unknown for unclear text', () => {
      expect(getLanguageCode('123 !@# .,.')).toBe('unknown');
    });
  });

  describe('analyzeThreadLanguage', () => {
    test('analyzes consistent English thread', () => {
      const tweets = [
        { text: 'First English tweet' },
        { text: 'Second English tweet' },
        { text: 'Third English tweet' }
      ];
      
      const result = analyzeThreadLanguage(tweets);
      expect(result.dominant_language).toBe('english');
      expect(result.direction).toBe('ltr');
      expect(result.is_consistent).toBe(true);
    });

    test('analyzes consistent Arabic thread', () => {
      const tweets = [
        { text: 'تغريدة عربية أولى' },
        { text: 'تغريدة عربية ثانية' },
        { text: 'تغريدة عربية ثالثة' }
      ];
      
      const result = analyzeThreadLanguage(tweets);
      expect(result.dominant_language).toBe('arabic');
      expect(result.direction).toBe('rtl');
      expect(result.is_consistent).toBe(true);
    });

    test('detects inconsistent mixed thread', () => {
      const tweets = [
        { text: 'English tweet' },
        { text: 'تغريدة عربية' },
        { text: 'Mixed English عربي tweet' }
      ];
      
      const result = analyzeThreadLanguage(tweets);
      expect(result.is_consistent).toBe(false);
      expect(result.mixed_tweets.length).toBeGreaterThan(0);
    });

    test('handles empty thread', () => {
      const result = analyzeThreadLanguage([]);
      expect(result.dominant_language).toBe('unknown');
      expect(result.is_consistent).toBe(true);
    });

    test('provides recommendations', () => {
      const tweets = [
        { text: 'English tweet مع عربي mixed' },
        { text: 'Another mixed tweet نص' }
      ];
      
      const result = analyzeThreadLanguage(tweets);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });
});