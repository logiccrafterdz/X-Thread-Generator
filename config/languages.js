/**
 * Dual-audience language configuration
 * Primary: Arabic-speaking users interested in English tech content
 * Secondary: Global English-speaking users
 */

const LANGUAGES = {
  // UI/UX Elements - Arabic for primary audience
  ui: {
    ar: {
      title: 'مولد خيوط X',
      subtitle: 'حول محتواك الطويل إلى خيوط X جذابة مع دعم العربية والإنجليزية',
      
      // Navigation & Sections
      sections: {
        input: '📝 الإدخال',
        output: '🧵 الخيط المولد',
        history: '📚 الخيوط السابقة'
      },
      
      // Form Labels
      form: {
        content: 'المحتوى الخاص بك *',
        contentPlaceholder: 'الصق مقالك أو ملاحظاتك أو محتواك هنا...',
        language: 'اللغة',
        style: 'أسلوب الكتابة',
        maxTweets: 'أقصى عدد تغريدات',
        includeHashtags: 'تضمين الهاشتاجات',
        imageSuggestions: 'اقتراحات الصور',
        personalNote: 'ملاحظة شخصية (اختيارية)',
        personalNotePlaceholder: 'أضف ملاحظة شخصية لإلحاقها في نهاية خيطك...',
        darkMode: '🌙 الوضع الليلي'
      },
      
      // Buttons
      buttons: {
        generate: '🚀 إنشاء الخيط',
        showHistory: '📚 عرض السجل',
        hideHistory: 'إخفاء السجل',
        refresh: 'تحديث',
        copy: 'نسخ',
        copyPlain: 'نسخ كنص عادي',
        preview: 'معاينة',
        save: 'حفظ'
      },
      
      // Messages
      messages: {
        generating: 'جاري إنشاء خيطك...',
        success: 'تم إنشاء الخيط بنجاح!',
        error: 'حدث خطأ أثناء إنشاء الخيط',
        copied: 'تم النسخ إلى الحافظة',
        loading: 'جاري التحميل...',
        noHistory: 'لا توجد خيوط سابقة. أنشئ خيطك الأول لرؤيته هنا!',
        historyLoaded: 'تم تحميل الخيط من السجل! يمكنك تعديله وإعادة إنشاؤه.',
        characterCount: 'حرف'
      },
      
      // Footer
      footer: {
        text: 'مصمم للاستخدام الشخصي • لا يتم جمع البيانات • ',
        statusLink: 'حالة الخدمة'
      }
    },
    
    en: {
      title: 'X Thread Generator',
      subtitle: 'Convert your long-form content into engaging X threads with Arabic and English support',
      
      // Navigation & Sections
      sections: {
        input: '📝 Input',
        output: '🧵 Generated Thread',
        history: '📚 Recent Threads'
      },
      
      // Form Labels
      form: {
        content: 'Your Content *',
        contentPlaceholder: 'Paste your article, notes, or content here...',
        language: 'Language',
        style: 'Writing Style',
        maxTweets: 'Max Tweets',
        includeHashtags: 'Include Hashtags',
        imageSuggestions: 'Image Suggestions',
        personalNote: 'Personal Note (optional)',
        personalNotePlaceholder: 'Add a personal note to append at the end of your thread...',
        darkMode: '🌙 Dark Mode'
      },
      
      // Buttons
      buttons: {
        generate: '🚀 Generate Thread',
        showHistory: '📚 Show History',
        hideHistory: 'Hide History',
        refresh: 'Refresh',
        copy: 'Copy',
        copyPlain: 'Copy as Plain Text',
        preview: 'Preview',
        save: 'Save'
      },
      
      // Messages
      messages: {
        generating: 'Generating your thread...',
        success: 'Thread generated successfully!',
        error: 'Error generating thread',
        copied: 'Copied to clipboard',
        loading: 'Loading...',
        noHistory: 'No threads found. Generate your first thread to see it here!',
        historyLoaded: 'Thread loaded from history! You can modify and regenerate it.',
        characterCount: 'characters'
      },
      
      // Footer
      footer: {
        text: 'Built for personal use • No data collection • ',
        statusLink: 'Service Status'
      }
    }
  },
  
  // Technical Content - Always English (for both audiences)
  technical: {
    // Language options (keep technical)
    languageOptions: {
      'auto': 'Auto-detect',
      'en': 'English',
      'ar': 'Arabic',
      'both': 'Mixed'
    },
    
    // Writing styles (keep English for consistency)
    styleOptions: {
      'educational': 'Educational',
      'engaging': 'Engaging', 
      'professional': 'Professional',
      'technical': 'Technical',
      'concise': 'Concise'
    },
    
    // API and technical terms
    api: {
      endpoints: {
        generate: '/api/generate-thread',
        health: '/api/health',
        history: '/api/history',
        stats: '/api/stats'
      },
      
      errors: {
        networkError: 'Network Error',
        serverError: 'Server Error',
        validationError: 'Validation Error',
        quotaExceeded: 'Quota Exceeded'
      }
    }
  },
  
  // User preferences for language switching
  preferences: {
    defaultLanguage: 'ar', // Arabic as primary
    fallbackLanguage: 'en',
    autoDetectUserLanguage: true,
    persistLanguageChoice: true
  }
};

/**
 * Get text for current UI language
 * @param {string} path - Dot notation path (e.g., 'form.content')
 * @param {string} lang - Language code ('ar' or 'en')
 * @returns {string} Localized text
 */
function getText(path, lang = 'ar') {
  const keys = path.split('.');
  let current = LANGUAGES.ui[lang];
  
  for (const key of keys) {
    if (current && current[key]) {
      current = current[key];
    } else {
      // Fallback to English if Arabic text not found
      current = LANGUAGES.ui.en;
      for (const fallbackKey of keys) {
        if (current && current[fallbackKey]) {
          current = current[fallbackKey];
        } else {
          return path; // Return path if not found
        }
      }
      break;
    }
  }
  
  return current || path;
}

/**
 * Get technical term (always English)
 * @param {string} path - Dot notation path
 * @returns {string} Technical term
 */
function getTechnical(path) {
  const keys = path.split('.');
  let current = LANGUAGES.technical;
  
  for (const key of keys) {
    if (current && current[key]) {
      current = current[key];
    } else {
      return path;
    }
  }
  
  return current || path;
}

/**
 * Detect user's preferred language based on browser settings
 * @returns {string} Language code ('ar' or 'en')
 */
function detectUserLanguage() {
  const browserLang = navigator.language || navigator.userLanguage;
  
  // Check if Arabic is preferred
  if (browserLang.startsWith('ar')) {
    return 'ar';
  }
  
  // Check for Arabic-speaking regions
  const arabicRegions = ['sa', 'ae', 'eg', 'ma', 'dz', 'tn', 'ly', 'sd', 'sy', 'iq', 'jo', 'lb', 'ye', 'om', 'kw', 'bh', 'qa'];
  const region = browserLang.split('-')[1]?.toLowerCase();
  
  if (region && arabicRegions.includes(region)) {
    return 'ar';
  }
  
  return 'en';
}

module.exports = {
  LANGUAGES,
  getText,
  getTechnical,
  detectUserLanguage
};