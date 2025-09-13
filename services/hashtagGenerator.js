/**
 * Smart hashtag generator for Twitter threads
 * Generates dynamic, content-relevant hashtags with English/Arabic hybrid approach
 */

const { detectLanguagePercentages } = require('../utils/langDetect');

/**
 * Topic-based hashtag dictionary with trending and searchable hashtags
 */
const HASHTAG_DICTIONARY = {
  // AI & Technology
  ai: {
    english: ['#AI', '#MachineLearning', '#DeepLearning', '#NeuralNetworks', '#ArtificialIntelligence', '#MLOps', '#DataScience', '#TechTrends'],
    arabic: ['#ذكاء_اصطناعي', '#تعلم_آلي', '#تقنية', '#ابتكار']
  },
  
  // Programming & Development
  programming: {
    english: ['#Programming', '#Coding', '#WebDev', '#JavaScript', '#Python', '#React', '#NodeJS', '#FullStack'],
    arabic: ['#برمجة', '#تطوير', '#مطور', '#كود']
  },
  
  // Writing & Content
  writing: {
    english: ['#Writing', '#ContentCreation', '#Storytelling', '#Copywriting', '#BlogWriting', '#CreativeWriting', '#WritingTips'],
    arabic: ['#كتابة', '#محتوى', '#قصص', '#إبداع']
  },
  
  // Education & Learning
  education: {
    english: ['#Education', '#Learning', '#OnlineLearning', '#Skills', '#Knowledge', '#StudyTips', '#PersonalGrowth'],
    arabic: ['#تعليم', '#تعلم', '#مهارات', '#معرفة']
  },
  
  // Business & Entrepreneurship
  business: {
    english: ['#Business', '#Entrepreneurship', '#Startup', '#Leadership', '#Marketing', '#Strategy', '#Innovation'],
    arabic: ['#أعمال', '#ريادة', '#قيادة', '#تسويق']
  },
  
  // Productivity & Self-improvement
  productivity: {
    english: ['#Productivity', '#TimeManagement', '#Efficiency', '#WorkLife', '#SelfImprovement', '#Mindset', '#Goals'],
    arabic: ['#إنتاجية', '#تطوير_الذات', '#أهداف', '#نجاح']
  },
  
  // Technology & Innovation
  technology: {
    english: ['#Technology', '#Innovation', '#DigitalTransformation', '#TechNews', '#Future', '#Automation', '#CloudComputing'],
    arabic: ['#تقنية', '#ابتكار', '#تحول_رقمي', '#مستقبل']
  },
  
  // Design & Creativity
  design: {
    english: ['#Design', '#UXDesign', '#UIDesign', '#CreativeDesign', '#GraphicDesign', '#UserExperience', '#DesignThinking'],
    arabic: ['#تصميم', '#إبداع', '#فن', '#جرافيك']
  },
  
  // Finance & Investment
  finance: {
    english: ['#Finance', '#Investment', '#Trading', '#Cryptocurrency', '#FinTech', '#PersonalFinance', '#WealthBuilding'],
    arabic: ['#مالية', '#استثمار', '#تداول', '#ثروة']
  },
  
  // Health & Wellness
  health: {
    english: ['#Health', '#Wellness', '#Fitness', '#MentalHealth', '#Nutrition', '#HealthyLifestyle', '#SelfCare'],
    arabic: ['#صحة', '#لياقة', '#عافية', '#تغذية']
  },
  
  // Social Media & Digital Marketing
  social: {
    english: ['#SocialMedia', '#DigitalMarketing', '#ContentStrategy', '#Branding', '#Influence', '#OnlinePresence'],
    arabic: ['#وسائل_التواصل', '#تسويق_رقمي', '#علامة_تجارية', '#تأثير']
  },
  
  // General/Fallback
  general: {
    english: ['#Tips', '#Insights', '#Thoughts', '#Wisdom', '#Experience', '#Advice', '#Perspective'],
    arabic: ['#نصائح', '#خبرة', '#حكمة', '#رأي']
  }
};

/**
 * Keyword patterns for topic detection
 */
const KEYWORD_PATTERNS = {
  ai: /\b(ai|artificial intelligence|machine learning|deep learning|neural|algorithm|automation|chatgpt|gpt|llm|ذكاء اصطناعي|تعلم آلي)\b/i,
  programming: /\b(programming|coding|developer|javascript|python|react|node|html|css|api|database|برمجة|مطور|كود)\b/i,
  writing: /\b(writing|content|story|blog|article|copywriting|author|publish|كتابة|محتوى|قصة|مقال)\b/i,
  education: /\b(education|learning|study|course|tutorial|knowledge|skill|teach|تعليم|تعلم|دراسة|مهارة)\b/i,
  business: /\b(business|startup|entrepreneur|company|marketing|sales|strategy|أعمال|شركة|تسويق|استراتيجية)\b/i,
  productivity: /\b(productivity|efficiency|time management|goal|habit|focus|workflow|إنتاجية|هدف|عادة)\b/i,
  technology: /\b(technology|tech|innovation|digital|cloud|software|hardware|تقنية|ابتكار|رقمي)\b/i,
  design: /\b(design|ux|ui|creative|visual|graphic|interface|تصميم|إبداع|واجهة)\b/i,
  finance: /\b(finance|investment|trading|money|crypto|bitcoin|financial|مالية|استثمار|تداول|مال)\b/i,
  health: /\b(health|fitness|wellness|nutrition|mental health|exercise|صحة|لياقة|تغذية)\b/i,
  social: /\b(social media|marketing|brand|influence|twitter|instagram|وسائل التواصل|تسويق|علامة تجارية)\b/i
};

/**
 * Thread-level hashtags to avoid repetition
 */
const THREAD_HASHTAGS = {
  english: ['#Thread', '#TwitterThread', '#TweetThread'],
  arabic: ['#خيط', '#خيط_تويتر']
};

/**
 * Analyze tweet content and detect relevant topics
 * @param {string} text - Tweet text to analyze
 * @returns {Array<string>} Array of detected topics
 */
function detectTopics(text) {
  if (!text || typeof text !== 'string') {
    return ['general'];
  }

  const topics = [];
  const lowerText = text.toLowerCase();

  // Check each keyword pattern
  for (const [topic, pattern] of Object.entries(KEYWORD_PATTERNS)) {
    if (pattern.test(lowerText)) {
      topics.push(topic);
    }
  }

  // If no topics detected, use general
  return topics.length > 0 ? topics : ['general'];
}

/**
 * Generate hashtags for a single tweet
 * @param {string} text - Tweet text
 * @param {Object} options - Generation options
 * @param {Set} usedHashtags - Set of already used hashtags in the thread
 * @returns {Array<string>} Array of hashtags
 */
function generateTweetHashtags(text, options = {}, usedHashtags = new Set()) {
  const {
    maxHashtags = 4,
    englishRatio = 0.7,
    includeThreadHashtag = false,
    forceArabic = false
  } = options;

  // Detect language and topics
  const langAnalysis = detectLanguagePercentages(text);
  const topics = detectTopics(text);
  const isArabicContent = langAnalysis.arabic > 30;

  const hashtags = [];
  const englishCount = Math.ceil(maxHashtags * englishRatio);
  const arabicCount = maxHashtags - englishCount;

  // Add English hashtags
  const englishHashtags = [];
  for (const topic of topics) {
    if (HASHTAG_DICTIONARY[topic] && HASHTAG_DICTIONARY[topic].english) {
      englishHashtags.push(...HASHTAG_DICTIONARY[topic].english);
    }
  }

  // Remove duplicates and filter used hashtags
  const availableEnglish = [...new Set(englishHashtags)]
    .filter(tag => !usedHashtags.has(tag))
    .slice(0, englishCount);

  hashtags.push(...availableEnglish);

  // Add Arabic hashtags if content is Arabic or forced
  if ((isArabicContent || forceArabic) && arabicCount > 0) {
    const arabicHashtags = [];
    for (const topic of topics) {
      if (HASHTAG_DICTIONARY[topic] && HASHTAG_DICTIONARY[topic].arabic) {
        arabicHashtags.push(...HASHTAG_DICTIONARY[topic].arabic);
      }
    }

    const availableArabic = [...new Set(arabicHashtags)]
      .filter(tag => !usedHashtags.has(tag))
      .slice(0, arabicCount);

    hashtags.push(...availableArabic);
  }

  // Add thread hashtag if requested and it's the first tweet
  if (includeThreadHashtag) {
    const threadHashtag = isArabicContent ? 
      THREAD_HASHTAGS.arabic[0] : 
      THREAD_HASHTAGS.english[0];
    
    if (!usedHashtags.has(threadHashtag)) {
      hashtags.unshift(threadHashtag);
    }
  }

  // Fill remaining slots with general hashtags if needed
  while (hashtags.length < maxHashtags) {
    const generalHashtags = isArabicContent ? 
      HASHTAG_DICTIONARY.general.arabic : 
      HASHTAG_DICTIONARY.general.english;
    
    const available = generalHashtags.filter(tag => 
      !hashtags.includes(tag) && !usedHashtags.has(tag)
    );
    
    if (available.length === 0) break;
    
    hashtags.push(available[0]);
  }

  // Mark hashtags as used
  hashtags.forEach(tag => usedHashtags.add(tag));

  return hashtags.slice(0, maxHashtags);
}

/**
 * Generate hashtags for an entire thread
 * @param {Array} thread - Array of tweet objects
 * @param {Object} options - Generation options
 * @returns {Array} Updated thread with hashtags
 */
function generateThreadHashtags(thread, options = {}) {
  if (!Array.isArray(thread) || thread.length === 0) {
    return thread;
  }

  const usedHashtags = new Set();
  const updatedThread = thread.map((tweet, index) => {
    const tweetOptions = {
      ...options,
      includeThreadHashtag: index === 0, // Only first tweet gets thread hashtag
      maxHashtags: index === thread.length - 1 ? 4 : 3 // Last tweet can have more hashtags
    };

    const hashtags = generateTweetHashtags(tweet.text || '', tweetOptions, usedHashtags);
    
    return {
      ...tweet,
      hashtags: hashtags
    };
  });

  return updatedThread;
}

/**
 * Get hashtag statistics for a thread
 * @param {Array} thread - Thread with hashtags
 * @returns {Object} Hashtag statistics
 */
function getHashtagStats(thread) {
  if (!Array.isArray(thread)) {
    return { total: 0, english: 0, arabic: 0, unique: 0 };
  }

  const allHashtags = thread.flatMap(tweet => tweet.hashtags || []);
  const uniqueHashtags = new Set(allHashtags);
  
  const english = allHashtags.filter(tag => /^#[a-zA-Z]/.test(tag)).length;
  const arabic = allHashtags.filter(tag => /[\u0600-\u06FF]/.test(tag)).length;

  return {
    total: allHashtags.length,
    english,
    arabic,
    unique: uniqueHashtags.size,
    distribution: {
      english: Math.round((english / allHashtags.length) * 100) || 0,
      arabic: Math.round((arabic / allHashtags.length) * 100) || 0
    }
  };
}

module.exports = {
  generateTweetHashtags,
  generateThreadHashtags,
  detectTopics,
  getHashtagStats,
  HASHTAG_DICTIONARY
};