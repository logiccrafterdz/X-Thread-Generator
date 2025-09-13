/**
 * Frontend JavaScript for X Thread Generator
 */

class ThreadGenerator {
    constructor() {
        this.form = document.getElementById('threadForm');
        this.output = document.getElementById('output');
        this.loading = document.getElementById('loading');
        this.generateBtn = document.getElementById('generateBtn');
        this.textArea = document.getElementById('text');
        this.textCounter = document.getElementById('textCounter');
        this.healthIndicator = document.getElementById('healthIndicator');
        this.showHistoryBtn = document.getElementById('showHistoryBtn');
        this.hideHistoryBtn = document.getElementById('hideHistoryBtn');
        this.refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
        this.historySection = document.getElementById('historySection');
        this.historyList = document.getElementById('historyList');
        
        this.currentThread = null;
        this.maxInputLength = 10000;
        this.userPrefs = this.loadUserPreferences();
        this.savedThreads = this.loadSavedThreads();
        
        this.initializeEventListeners();
        this.loadFormPreferences();
        this.checkServiceHealth();
        this.loadUserStats(); // Load user stats to pre-select preferred style
        setInterval(() => this.checkServiceHealth(), 30000);
    }

    initializeEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateThread();
        });

        this.textArea.addEventListener('input', () => {
            this.updateCharacterCounter();
            this.textArea.style.height = 'auto';
            this.textArea.style.height = this.textArea.scrollHeight + 'px';
        });

        document.addEventListener('click', (e) => {
            if (e.target.matches('.copy-btn')) {
                this.copyToClipboard(e.target.dataset.content, e.target.dataset.type);
            }
            if (e.target.matches('.copy-plain-btn')) {
                this.copyAsPlainText();
            }
            if (e.target.matches('.preview-btn')) {
                this.showPreviewModal();
            }
        });

        // Dark mode toggle
        const darkModeToggle = document.getElementById('darkMode');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', (e) => {
                this.toggleDarkMode(e.target.checked);
            });
        }

        // Personal note field
        const personalNoteField = document.getElementById('personalNote');
        if (personalNoteField) {
            personalNoteField.addEventListener('input', (e) => {
                this.userPrefs.personalNote = e.target.value;
                this.saveUserPreferences();
            });
        }

        // Style selection tracking
        const styleSelect = document.getElementById('style');
        if (styleSelect) {
            styleSelect.addEventListener('change', (e) => {
                this.userPrefs.lastUsedStyle = e.target.value;
                this.saveUserPreferences();
            });
        }

        // History functionality
        if (this.showHistoryBtn) {
            this.showHistoryBtn.addEventListener('click', () => {
                this.showHistory();
            });
        }

        if (this.hideHistoryBtn) {
            this.hideHistoryBtn.addEventListener('click', () => {
                this.hideHistory();
            });
        }

        if (this.refreshHistoryBtn) {
            this.refreshHistoryBtn.addEventListener('click', () => {
                this.loadHistory();
            });
        }
    }

    updateCharacterCounter() {
        const length = this.textArea.value.length;
        const characterText = window.languageManager ? 
            window.languageManager.getText('messages.characterCount') : 'characters';
        this.textCounter.textContent = `${length} ${characterText}`;
        
        if (length > this.maxInputLength) {
            this.textCounter.style.color = '#c62828';
        } else if (length > this.maxInputLength * 0.9) {
            this.textCounter.style.color = '#f57c00';
        } else {
            this.textCounter.style.color = '#666';
        }
    }

    async checkServiceHealth() {
        try {
            const response = await fetch('/api/health');
            const health = await response.json();
            this.updateHealthIndicator(health.status);
        } catch (error) {
            this.updateHealthIndicator('error');
        }
    }

    updateHealthIndicator(status) {
        this.healthIndicator.className = 'health-indicator';
        switch (status) {
            case 'healthy':
                this.healthIndicator.title = 'Service is healthy';
                break;
            case 'degraded':
                this.healthIndicator.classList.add('warning');
                this.healthIndicator.title = 'Service is degraded';
                break;
            default:
                this.healthIndicator.classList.add('error');
                this.healthIndicator.title = 'Service has issues';
        }
    }

    async loadUserStats() {
        try {
            const response = await fetch('/api/stats');
            if (!response.ok) {
                throw new Error('Failed to fetch user stats');
            }
            
            const stats = await response.json();
            const userPrefs = stats.user_preferences;
            
            if (userPrefs && userPrefs.most_used_style) {
                // Pre-select the most used style in the dropdown
                const styleSelect = document.getElementById('style');
                if (styleSelect && userPrefs.most_used_style !== 'educational') {
                    // Only change if it's different from default
                    styleSelect.value = userPrefs.most_used_style;
                    
                    // Update user preferences to reflect this
                    this.userPrefs.preferredStyle = userPrefs.most_used_style;
                    this.saveUserPreferences();
                }
            }
        } catch (error) {
            console.log('Could not load user stats for style pre-selection:', error.message);
            // This is not critical, so we just log and continue
        }
    }

    async generateThread() {
        try {
            const formData = new FormData(this.form);
            const data = Object.fromEntries(formData.entries());
            
            data.includeHashtags = document.getElementById('includeHashtags').checked;
            data.includeImages = document.getElementById('includeImages').checked;
            data.maxTweets = parseInt(data.maxTweets);

            if (!data.text.trim()) {
                this.showError('Please enter some content to generate a thread.');
                return;
            }

            // Track style usage
            if (data.style) {
                this.updateStyleMemory(data.style);
            }

            // Add personal note to data if exists
            if (this.userPrefs.personalNote) {
                data.personalNote = this.userPrefs.personalNote;
            }

            this.setLoadingState(true);

            const response = await fetch('/api/generate-thread', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate thread');
            }

            if (result.error) {
                this.showError(`Generation failed: ${result.error}`);
            } else {
                this.currentThread = result;
                this.displayThread(result);
                this.showSuccess('Thread generated successfully!');
            }

        } catch (error) {
            this.showError(`Failed to generate thread: ${error.message}`);
        } finally {
            this.setLoadingState(false);
        }
    }

    displayThread(threadData) {
        const { metadata, thread, thread_summary, estimated_engagement_score } = threadData;
        
        let html = `
            <div class="metadata">
                <div class="metadata-item">
                    <span><strong>Language:</strong></span>
                    <span>${metadata.language} (${metadata.direction})</span>
                </div>
                <div class="metadata-item">
                    <span><strong>Tweets:</strong></span>
                    <span>${metadata.tweets_generated}/${metadata.max_tweets_requested}</span>
                </div>
                <div class="metadata-item">
                    <span><strong>Score:</strong></span>
                    <span>${estimated_engagement_score ? estimated_engagement_score.toFixed(1) : 'N/A'}/10</span>
                </div>
            </div>
        `;

        if (thread_summary) {
            html += `<div class="success"><strong>Structure:</strong> ${thread_summary}</div>`;
        }

        html += '<div class="thread-preview">';
        
        thread.forEach((tweet) => {
            const isRTL = metadata.direction === 'rtl';
            const charCountClass = tweet.char_count > 280 ? 'error' : 
                                 tweet.char_count > 260 ? 'warning' : '';

            html += `
                <div class="tweet ${isRTL ? 'rtl' : ''}">
                    <div class="tweet-header">
                        <span>Tweet ${tweet.index}</span>
                        <span class="char-count ${charCountClass}">${tweet.char_count}/280</span>
                    </div>
                    <div class="tweet-content">${this.formatTweetText(tweet.text)}</div>
                    ${tweet.hashtags?.length ? `<div class="hashtags">${tweet.hashtags.join(' ')}</div>` : ''}
                    ${tweet.emoji_suggestions?.length ? `<div class="emojis">${tweet.emoji_suggestions.join(' ')}</div>` : ''}
                    ${tweet.cta ? `<div class="tweet-meta"><strong>CTA:</strong> ${tweet.cta}</div>` : ''}
                </div>
            `;
        });

        html += `</div>${this.generateActionButtons()}`;
        this.output.innerHTML = html;
    }

    generateActionButtons() {
        return `
            <div class="action-buttons">
                <button class="btn btn-primary copy-btn" data-content="json" data-type="JSON">
                    📋 Copy JSON
                </button>
                <button class="btn btn-secondary copy-btn" data-content="text" data-type="Thread Text">
                    📝 Copy Thread
                </button>
                <button class="btn btn-success copy-plain-btn">
                    📄 Copy as Plain Text
                </button>
                <button class="btn btn-info preview-btn">
                    👁️ Preview Thread
                </button>
                <button class="btn btn-success" onclick="threadGen.saveThread()">
                    💾 Save
                </button>
            </div>
        `;
    }

    formatTweetText(text) {
        return text.replace(/\n/g, '<br>').replace(/(#\w+)/g, '<span style="color: #1da1f2;">$1</span>');
    }

    async copyToClipboard(type, label) {
        try {
            let content = '';
            if (type === 'json') {
                content = JSON.stringify(this.currentThread, null, 2);
            } else {
                content = this.currentThread.thread.map(tweet => tweet.text).join('\n\n');
            }
            
            await navigator.clipboard.writeText(content);
            const copiedMessage = window.languageManager ? 
                window.languageManager.getText('messages.copied') : 
                `${label} copied to clipboard!`;
            this.showSuccess(copiedMessage);
        } catch (error) {
            const errorMessage = window.languageManager ? 
                window.languageManager.getText('messages.copyError') : 
                'Failed to copy to clipboard';
            this.showError(errorMessage);
        }
    }

    setLoadingState(loading) {
        this.generateBtn.disabled = loading;
        this.loading.style.display = loading ? 'block' : 'none';
        this.generateBtn.textContent = loading ? 'Generating...' : '🚀 Generate Thread';
    }

    showError(message) {
        const localizedMessage = window.languageManager ? 
            window.languageManager.getText('messages.error') : message;
        const displayMessage = message.includes('Error') ? localizedMessage : message;
        this.output.innerHTML = `<div class="error">${displayMessage}</div>`;
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success';
        const localizedMessage = window.languageManager ? 
            window.languageManager.getText('messages.success') : message;
        const displayMessage = message.includes('success') ? localizedMessage : message;
        successDiv.textContent = displayMessage;
        this.output.insertBefore(successDiv, this.output.firstChild);
        setTimeout(() => successDiv.remove(), 3000);
    }

    saveThread() {
        if (!this.currentThread) {
            this.showError('No thread to save');
            return;
        }

        // Save to localStorage
        this.saveToLocalStorage(this.currentThread);

        const blob = new Blob([JSON.stringify(this.currentThread, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thread-${Date.now()}.json`;
        a.click();
         URL.revokeObjectURL(url);
     }

    // User Preferences Management
    loadUserPreferences() {
        const defaultPrefs = {
            preferredStyle: 'educational',
            alwaysUseArabicHashtags: true,
            emojiPreference: ['💡', '📚', '✨'],
            autoAddCTA: true,
            darkMode: false,
            styleMemory: {
                educational: 0,
                technical: 0,
                concise: 0,
                engaging: 0,
                professional: 0
            },
            lastUsedLanguage: 'auto',
            defaultMaxTweets: 5,
            personalNote: '',
            autoSaveToLocalStorage: true
        };
        
        const saved = localStorage.getItem('threadgen_userprefs');
        return saved ? { ...defaultPrefs, ...JSON.parse(saved) } : defaultPrefs;
    }

    saveUserPreferences() {
        localStorage.setItem('threadgen_userprefs', JSON.stringify(this.userPrefs));
    }

    loadFormPreferences() {
        // Set form defaults from preferences
        const styleSelect = document.getElementById('style');
        const languageSelect = document.getElementById('language');
        const maxTweetsInput = document.getElementById('maxTweets');
        const personalNoteField = document.getElementById('personalNote');
        const darkModeToggle = document.getElementById('darkMode');
        
        if (styleSelect) styleSelect.value = this.userPrefs.preferredStyle;
        if (languageSelect) languageSelect.value = this.userPrefs.lastUsedLanguage;
        if (maxTweetsInput) maxTweetsInput.value = this.userPrefs.defaultMaxTweets;
        if (personalNoteField) personalNoteField.value = this.userPrefs.personalNote;
        if (darkModeToggle) darkModeToggle.checked = this.userPrefs.darkMode;
        
        // Apply dark mode if enabled
        if (this.userPrefs.darkMode) {
            document.body.classList.add('dark-mode');
        }
    }

    updateStyleMemory(style) {
        this.userPrefs.styleMemory[style]++;
        
        // Check if style used 5 times in a row
        const otherStyles = Object.keys(this.userPrefs.styleMemory).filter(s => s !== style);
        const allOthersZero = otherStyles.every(s => this.userPrefs.styleMemory[s] === 0);
        
        if (this.userPrefs.styleMemory[style] >= 5 && allOthersZero) {
            this.showSuccess(`Style "${style}" suggested as your preferred choice!`);
            this.userPrefs.preferredStyle = style;
        }
        
        this.saveUserPreferences();
    }

    // LocalStorage Thread Management
    loadSavedThreads() {
        const saved = localStorage.getItem('threadgen_saved_threads');
        return saved ? JSON.parse(saved) : [];
    }

    saveToLocalStorage(thread) {
        if (!this.userPrefs.autoSaveToLocalStorage) return;
        
        const threadData = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            thread: thread,
            preview: thread.thread ? thread.thread[0]?.text?.substring(0, 100) + '...' : 'Generated thread'
        };
        
        this.savedThreads.unshift(threadData);
        
        // Keep only last 5 threads
        if (this.savedThreads.length > 5) {
            this.savedThreads = this.savedThreads.slice(0, 5);
        }
        
        localStorage.setItem('threadgen_saved_threads', JSON.stringify(this.savedThreads));
        this.showSuccess('Thread saved to browser storage');
    }

    // Copy as Plain Text
    copyAsPlainText() {
        if (!this.currentThread || !this.currentThread.thread) {
            this.showError('No thread to copy');
            return;
        }
        
        const totalTweets = this.currentThread.thread.length;
        let plainText = '';
        
        this.currentThread.thread.forEach((tweet, index) => {
            plainText += `${index + 1}/${totalTweets}: ${tweet.text}`;
            if (tweet.hashtags && tweet.hashtags.length > 0) {
                plainText += ` ${tweet.hashtags.join(' ')}`;
            }
            if (tweet.cta) {
                plainText += ` ${tweet.cta}`;
            }
            plainText += '\n\n';
        });
        
        // Add personal note if exists
        if (this.userPrefs.personalNote) {
            plainText += `\n${this.userPrefs.personalNote}`;
        }
        
        navigator.clipboard.writeText(plainText.trim()).then(() => {
            this.showSuccess('Thread copied as plain text!');
        }).catch(() => {
            this.showError('Failed to copy to clipboard');
        });
    }

    // Preview Modal
    showPreviewModal() {
        if (!this.currentThread || !this.currentThread.thread) {
            this.showError('No thread to preview');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'preview-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Thread Preview</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    ${this.generatePreviewHTML()}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal handlers
        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    generatePreviewHTML() {
        return this.currentThread.thread.map((tweet, index) => `
            <div class="tweet-preview">
                <div class="tweet-header">
                    <strong>Tweet ${index + 1}/${this.currentThread.thread.length}</strong>
                    <span class="char-count">${tweet.char_count}/280</span>
                </div>
                <div class="tweet-content">${this.formatTweetText(tweet.text)}</div>
                ${tweet.hashtags?.length ? `<div class="tweet-hashtags">${tweet.hashtags.join(' ')}</div>` : ''}
                ${tweet.cta ? `<div class="tweet-cta">${tweet.cta}</div>` : ''}
            </div>
        `).join('');
     }

    // Dark Mode Toggle
    toggleDarkMode(enabled) {
        this.userPrefs.darkMode = enabled;
        this.saveUserPreferences();
        
        if (enabled) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    // Update generateThread to track style usage
    async generateThreadWithTracking() {
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());
        
        // Track style usage
        if (data.style) {
            this.updateStyleMemory(data.style);
        }
        
        // Add personal note to data if exists
        if (this.userPrefs.personalNote) {
            data.personalNote = this.userPrefs.personalNote;
        }
        
        return this.generateThread();
    }

    // History Management Methods
    async showHistory() {
        this.historySection.style.display = 'block';
        this.showHistoryBtn.style.display = 'none';
        await this.loadHistory();
        
        // Scroll to history section
        this.historySection.scrollIntoView({ behavior: 'smooth' });
    }

    hideHistory() {
        this.historySection.style.display = 'none';
        this.showHistoryBtn.style.display = 'block';
    }

    async loadHistory() {
        try {
            this.historyList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Loading history...</p>';
            
            const response = await fetch('/api/history?limit=5');
            if (!response.ok) {
                throw new Error('Failed to fetch history');
            }
            
            const data = await response.json();
            this.displayHistory(data.history);
        } catch (error) {
            console.error('Error loading history:', error);
            this.historyList.innerHTML = '<p class="history-empty">Failed to load history. Please try again.</p>';
        }
    }

    displayHistory(historyItems) {
        if (!historyItems || historyItems.length === 0) {
            const noHistoryMessage = window.languageManager ? 
                window.languageManager.getText('messages.noHistory') : 
                'No threads found. Generate your first thread to see it here!';
            this.historyList.innerHTML = `<p class="history-empty">${noHistoryMessage}</p>`;
            return;
        }

        const historyHTML = historyItems.map(item => {
            const date = new Date(item.timestamp).toLocaleDateString();
            const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const preview = this.getThreadPreview(item.thread);
            const language = item.metadata?.language || 'auto';
            const style = item.metadata?.style_requested || 'educational';
            const tweetCount = item.thread?.length || 0;
            
            return `
                <div class="history-item" data-thread-id="${item.id}" onclick="threadGenerator.loadHistoryItem('${item.id}')">
                    <div class="history-header">
                        <strong>${style.charAt(0).toUpperCase() + style.slice(1)} Thread</strong>
                        <span class="history-meta">${date} at ${time}</span>
                    </div>
                    <div class="history-preview">${preview}</div>
                    <div class="history-stats">
                        <span>📊 ${tweetCount} tweets</span>
                        <span>🌐 ${language.toUpperCase()}</span>
                        <span>📝 ${style}</span>
                    </div>
                </div>
            `;
        }).join('');

        this.historyList.innerHTML = historyHTML;
    }

    getThreadPreview(thread) {
        if (!thread || thread.length === 0) {
            return 'No content available';
        }
        
        // Get the first tweet's text (usually the hook or main content)
        const firstTweet = thread[0];
        let preview = firstTweet.text || '';
        
        // Remove thread numbering if present
        preview = preview.replace(/^\d+\/\d+\s*/, '');
        
        // Truncate if too long
        if (preview.length > 120) {
            preview = preview.substring(0, 120) + '...';
        }
        
        return preview || 'Thread content';
    }

    async loadHistoryItem(threadId) {
        try {
            const response = await fetch(`/api/history/${threadId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch thread details');
            }
            
            const threadData = await response.json();
            this.populateFormFromHistory(threadData);
            this.hideHistory();
            
            // Show success message
            const successMessage = window.languageManager ? 
                window.languageManager.getText('messages.historyLoaded') : 
                'Thread loaded from history! You can modify and regenerate it.';
            this.showSuccess(successMessage);
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error('Error loading thread:', error);
            this.showError('Failed to load thread from history.');
        }
    }

    populateFormFromHistory(threadData) {
        // Extract original parameters from metadata or make educated guesses
        const metadata = threadData.metadata || {};
        const thread = threadData.thread || [];
        
        // Try to reconstruct original text from thread
        let originalText = '';
        if (thread.length > 0) {
            // Combine all tweet texts, removing numbering and CTAs
            originalText = thread.map(tweet => {
                let text = tweet.text || '';
                // Remove thread numbering
                text = text.replace(/^\d+\/\d+\s*/, '');
                return text;
            }).join(' ').trim();
            
            // Remove common CTAs and hooks
            const commonCTAs = [
                'What are your thoughts?', 'Share your experiences', 'Let me know',
                'ما رأيكم', 'شاركوني', 'أخبروني'
            ];
            
            commonCTAs.forEach(cta => {
                originalText = originalText.replace(new RegExp(cta + '.*$', 'i'), '');
            });
        }
        
        // Populate form fields
        document.getElementById('text').value = originalText;
        document.getElementById('language').value = metadata.language || 'auto';
        document.getElementById('style').value = metadata.style_requested || 'educational';
        document.getElementById('maxTweets').value = metadata.max_tweets_requested || thread.length || 5;
        
        // Update character counter
        this.updateCharacterCounter();
        
        // Auto-resize textarea
        this.textArea.style.height = 'auto';
        this.textArea.style.height = this.textArea.scrollHeight + 'px';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.threadGen = new ThreadGenerator();
});