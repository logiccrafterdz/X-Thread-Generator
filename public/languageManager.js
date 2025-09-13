/**
 * Client-side Language Manager for Dual-Audience Strategy
 * Handles Arabic UI for primary audience and English for global users
 */

class LanguageManager {
    constructor() {
        this.currentLanguage = this.detectInitialLanguage();
        this.translations = {};
        this.loadTranslations();
        this.initializeLanguageToggle();
    }

    /**
     * Detect initial language preference
     */
    detectInitialLanguage() {
        // Check localStorage first
        const saved = localStorage.getItem('threadgen_ui_language');
        if (saved && ['ar', 'en'].includes(saved)) {
            return saved;
        }

        // Auto-detect based on browser language
        const browserLang = navigator.language || navigator.userLanguage;
        
        // Arabic detection
        if (browserLang.startsWith('ar')) {
            return 'ar';
        }
        
        // Arabic-speaking regions
        const arabicRegions = ['sa', 'ae', 'eg', 'ma', 'dz', 'tn', 'ly', 'sd', 'sy', 'iq', 'jo', 'lb', 'ye', 'om', 'kw', 'bh', 'qa'];
        const region = browserLang.split('-')[1]?.toLowerCase();
        
        if (region && arabicRegions.includes(region)) {
            return 'ar';
        }
        
        return 'ar'; // Default to Arabic as primary audience
    }

    /**
     * Load translation data
     */
    loadTranslations() {
        this.translations = {
            ar: {
                title: 'مولد خيوط X',
                subtitle: 'حول محتواك الطويل إلى خيوط X جذابة مع دعم العربية والإنجليزية',
                
                sections: {
                    input: '📝 الإدخال',
                    output: '🧵 الخيط المولد',
                    history: '📚 الخيوط السابقة'
                },
                
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
                
                buttons: {
                    generate: '🚀 إنشاء الخيط',
                    showHistory: '📚 عرض السجل',
                    hideHistory: 'إخفاء السجل',
                    refresh: 'تحديث',
                    copy: 'نسخ',
                    copyPlain: 'نسخ كنص عادي',
                    preview: 'معاينة',
                    save: 'حفظ',
                    switchToEnglish: '🌐 English'
                },
                
                messages: {
                    generating: 'جاري إنشاء خيطك...',
                    success: 'تم إنشاء الخيط بنجاح!',
                    error: 'حدث خطأ أثناء إنشاء الخيط',
                    copied: 'تم النسخ إلى الحافظة',
                    copyError: 'فشل في النسخ إلى الحافظة',
                    loading: 'جاري التحميل...',
                    noHistory: 'لا توجد خيوط سابقة. أنشئ خيطك الأول لرؤيته هنا!',
                    historyLoaded: 'تم تحميل الخيط من السجل! يمكنك تعديله وإعادة إنشاؤه.',
                    characterCount: 'حرف',
                    outputPlaceholder: 'سيظهر خيطك المولد هنا...'
                },
                
                footer: {
                    text: 'مصمم للاستخدام الشخصي • لا يتم جمع البيانات • ',
                    statusLink: 'حالة الخدمة'
                },
                
                copyright: '© 2025 LogicCrafterDZ - جميع الحقوق محفوظة'
            },
            
            en: {
                title: 'X Thread Generator',
                subtitle: 'Convert your long-form content into engaging X threads with Arabic and English support',
                
                sections: {
                    input: '📝 Input',
                    output: '🧵 Generated Thread',
                    history: '📚 Recent Threads'
                },
                
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
                
                buttons: {
                    generate: '🚀 Generate Thread',
                    showHistory: '📚 Show History',
                    hideHistory: 'Hide History',
                    refresh: 'Refresh',
                    copy: 'Copy',
                    copyPlain: 'Copy as Plain Text',
                    preview: 'Preview',
                    save: 'Save',
                    switchToArabic: '🌐 العربية'
                },
                
                messages: {
                    generating: 'Generating your thread...',
                    success: 'Thread generated successfully!',
                    error: 'Error generating thread',
                    copied: 'Copied to clipboard',
                    copyError: 'Failed to copy to clipboard',
                    loading: 'Loading...',
                    noHistory: 'No threads found. Generate your first thread to see it here!',
                    historyLoaded: 'Thread loaded from history! You can modify and regenerate it.',
                    characterCount: 'characters',
                    outputPlaceholder: 'Your generated thread will appear here...'
                },
                
                footer: {
                    text: 'Built for personal use • No data collection • ',
                    statusLink: 'Service Status'
                },
                
                copyright: '© 2025 LogicCrafterDZ - All Rights Reserved'
            }
        };
    }

    /**
     * Get translated text
     */
    getText(path) {
        const keys = path.split('.');
        let current = this.translations[this.currentLanguage];
        
        for (const key of keys) {
            if (current && current[key]) {
                current = current[key];
            } else {
                // Fallback to English
                current = this.translations.en;
                for (const fallbackKey of keys) {
                    if (current && current[fallbackKey]) {
                        current = current[fallbackKey];
                    } else {
                        return path;
                    }
                }
                break;
            }
        }
        
        return current || path;
    }

    /**
     * Switch language and update UI
     */
    switchLanguage(lang) {
        if (!['ar', 'en'].includes(lang)) return;
        
        this.currentLanguage = lang;
        localStorage.setItem('threadgen_ui_language', lang);
        
        this.updateUI();
        this.updateDirection();
    }

    /**
     * Update text direction and font
     */
    updateDirection() {
        const body = document.body;
        const html = document.documentElement;
        
        if (this.currentLanguage === 'ar') {
            body.setAttribute('dir', 'rtl');
            html.setAttribute('dir', 'rtl');
            html.setAttribute('lang', 'ar');
        } else {
            body.setAttribute('dir', 'ltr');
            html.setAttribute('dir', 'ltr');
            html.setAttribute('lang', 'en');
        }
    }

    /**
     * Update all UI elements with current language
     */
    updateUI() {
        // Update title and subtitle
        const titleElement = document.querySelector('.header h1');
        const subtitleElement = document.querySelector('.header p');
        
        if (titleElement) {
            titleElement.textContent = '🧵 ' + this.getText('title');
        }
        
        if (subtitleElement) {
            subtitleElement.textContent = this.getText('subtitle');
        }

        // Update section titles
        const inputTitle = document.querySelector('.input-section .section-title');
        const outputTitle = document.querySelector('.output-section .section-title');
        const historyTitle = document.querySelector('.history-section .section-title');
        
        if (inputTitle) inputTitle.textContent = this.getText('sections.input');
        if (outputTitle) outputTitle.textContent = this.getText('sections.output');
        if (historyTitle) historyTitle.textContent = this.getText('sections.history');

        // Update form labels
        this.updateFormLabels();
        
        // Update buttons
        this.updateButtons();
        
        // Update placeholders and messages
        this.updatePlaceholders();
        
        // Update footer
        this.updateFooter();
        
        // Update copyright
        this.updateCopyright();
    }

    /**
     * Update form labels
     */
    updateFormLabels() {
        const labelMappings = {
            'label[for="text"]': 'form.content',
            'label[for="language"]': 'form.language',
            'label[for="style"]': 'form.style',
            'label[for="maxTweets"]': 'form.maxTweets',
            'label[for="includeHashtags"]': 'form.includeHashtags',
            'label[for="includeImages"]': 'form.imageSuggestions',
            'label[for="personalNote"]': 'form.personalNote',
            'label[for="darkMode"]': 'form.darkMode'
        };

        Object.entries(labelMappings).forEach(([selector, textPath]) => {
            const element = document.querySelector(selector);
            if (element) {
                element.textContent = this.getText(textPath);
            }
        });
    }

    /**
     * Update button texts
     */
    updateButtons() {
        const buttonMappings = {
            '#generateBtn': 'buttons.generate',
            '#showHistoryBtn': 'buttons.showHistory',
            '#hideHistoryBtn': 'buttons.hideHistory',
            '#refreshHistoryBtn': 'buttons.refresh'
        };

        Object.entries(buttonMappings).forEach(([selector, textPath]) => {
            const element = document.querySelector(selector);
            if (element) {
                element.textContent = this.getText(textPath);
            }
        });
        
        // Update language toggle button
        this.updateLanguageToggle();
    }

    /**
     * Update placeholders and messages
     */
    updatePlaceholders() {
        const textArea = document.getElementById('text');
        const personalNote = document.getElementById('personalNote');
        const textCounter = document.getElementById('textCounter');
        const outputPlaceholder = document.querySelector('#output p');
        const loadingMessage = document.getElementById('loadingMessage');
        
        if (textArea) {
            textArea.placeholder = this.getText('form.contentPlaceholder');
        }
        
        if (personalNote) {
            personalNote.placeholder = this.getText('form.personalNotePlaceholder');
        }
        
        if (textCounter && textCounter.textContent.includes('characters')) {
            const count = textCounter.textContent.match(/\d+/)?.[0] || '0';
            textCounter.textContent = `${count} ${this.getText('messages.characterCount')}`;
        }
        
        if (outputPlaceholder && outputPlaceholder.textContent.includes('will appear here')) {
            outputPlaceholder.textContent = this.getText('messages.outputPlaceholder');
        }
        
        if (loadingMessage) {
            loadingMessage.textContent = this.getText('messages.generating');
        }
    }

    /**
     * Update footer
     */
    updateFooter() {
        const footerText = document.querySelector('.footer p');
        if (footerText) {
            const statusLink = footerText.querySelector('a');
            const statusLinkText = statusLink ? statusLink.textContent : 'Service Status';
            
            footerText.innerHTML = this.getText('footer.text') + 
                `<a href="/api/health" target="_blank">${this.getText('footer.statusLink')}</a>`;
        }
    }

    /**
     * Update copyright text
     */
    updateCopyright() {
        const copyrightElement = document.querySelector('.copyright');
        if (copyrightElement) {
            copyrightElement.textContent = this.getText('copyright');
        }
    }

    /**
     * Initialize language toggle button
     */
    initializeLanguageToggle() {
        // Create language toggle button
        const toggleButton = document.createElement('button');
        toggleButton.id = 'languageToggle';
        toggleButton.type = 'button';
        toggleButton.className = 'btn btn-secondary';
        toggleButton.style.cssText = 'position: fixed; top: 20px; left: 20px; z-index: 1000; padding: 8px 12px; font-size: 14px;';
        
        // Add to page
        document.body.appendChild(toggleButton);
        
        // Add click handler
        toggleButton.addEventListener('click', () => {
            const newLang = this.currentLanguage === 'ar' ? 'en' : 'ar';
            this.switchLanguage(newLang);
        });
        
        this.updateLanguageToggle();
    }

    /**
     * Update language toggle button text
     */
    updateLanguageToggle() {
        const toggleButton = document.getElementById('languageToggle');
        if (toggleButton) {
            if (this.currentLanguage === 'ar') {
                toggleButton.textContent = this.getText('buttons.switchToEnglish');
            } else {
                toggleButton.textContent = this.getText('buttons.switchToArabic');
            }
        }
    }

    /**
     * Initialize the language manager
     */
    initialize() {
        this.updateDirection();
        this.updateUI();
        
        // Listen for dynamic content updates
        this.observeContentChanges();
    }

    /**
     * Observe content changes to update translations
     */
    observeContentChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Update any new dynamic content
                    this.updateDynamicContent();
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Update dynamic content (like generated threads)
     */
    updateDynamicContent() {
        // Update copy buttons in generated threads
        const copyButtons = document.querySelectorAll('.copy-btn, .copy-plain-btn, .preview-btn');
        copyButtons.forEach(btn => {
            if (btn.classList.contains('copy-btn')) {
                btn.textContent = this.getText('buttons.copy');
            } else if (btn.classList.contains('copy-plain-btn')) {
                btn.textContent = this.getText('buttons.copyPlain');
            } else if (btn.classList.contains('preview-btn')) {
                btn.textContent = this.getText('buttons.preview');
            }
        });
        
        // Update loading messages
        const loadingText = document.querySelector('.loading p');
        if (loadingText && loadingText.textContent.includes('Generating')) {
            loadingText.textContent = this.getText('messages.generating');
        }
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Check if current language is RTL
     */
    isRTL() {
        return this.currentLanguage === 'ar';
    }
}

// Export for use in main.js
window.LanguageManager = LanguageManager;