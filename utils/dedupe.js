/**
 * Hashtag and emoji deduplication utility
 * Removes duplicates and balances distribution across thread
 */

/**
 * Remove duplicate hashtags from an array
 * @param {Array<string>} hashtags - Array of hashtags
 * @returns {Array<string>} Deduplicated hashtags
 */
function dedupeHashtags(hashtags) {
  if (!Array.isArray(hashtags)) {
    return [];
  }

  // Normalize hashtags (remove #, convert to lowercase, then add # back)
  const normalized = hashtags
    .filter(tag => typeof tag === 'string' && tag.trim())
    .map(tag => {
      const clean = tag.replace(/^#+/, '').trim().toLowerCase();
      return clean ? `#${clean}` : null;
    })
    .filter(Boolean);

  // Remove duplicates
  return [...new Set(normalized)];
}

/**
 * Remove duplicate emojis from an array
 * @param {Array<string>} emojis - Array of emojis
 * @returns {Array<string>} Deduplicated emojis
 */
function dedupeEmojis(emojis) {
  if (!Array.isArray(emojis)) {
    return [];
  }

  const validEmojis = emojis
    .filter(emoji => typeof emoji === 'string' && emoji.trim())
    .map(emoji => emoji.trim());

  return [...new Set(validEmojis)];
}

/**
 * Balance hashtags across multiple tweets in a thread
 * @param {Array<Object>} tweets - Array of tweet objects with hashtags property
 * @param {number} maxPerTweet - Maximum hashtags per tweet (default 3)
 * @returns {Array<Object>} Tweets with balanced hashtags
 */
function balanceHashtagsAcrossThread(tweets, maxPerTweet = 3) {
  if (!Array.isArray(tweets) || tweets.length === 0) {
    return tweets;
  }

  // Collect all hashtags from all tweets
  const allHashtags = [];
  tweets.forEach(tweet => {
    if (tweet.hashtags && Array.isArray(tweet.hashtags)) {
      allHashtags.push(...tweet.hashtags);
    }
  });

  // Deduplicate all hashtags
  const uniqueHashtags = dedupeHashtags(allHashtags);
  
  // If no hashtags, return original tweets
  if (uniqueHashtags.length === 0) {
    return tweets.map(tweet => ({
      ...tweet,
      hashtags: []
    }));
  }

  // Distribute hashtags evenly across tweets
  const result = tweets.map((tweet, index) => {
    const startIndex = (index * maxPerTweet) % uniqueHashtags.length;
    const tweetHashtags = [];
    
    for (let i = 0; i < maxPerTweet && tweetHashtags.length < maxPerTweet; i++) {
      const hashtagIndex = (startIndex + i) % uniqueHashtags.length;
      const hashtag = uniqueHashtags[hashtagIndex];
      
      if (hashtag && !tweetHashtags.includes(hashtag)) {
        tweetHashtags.push(hashtag);
      }
    }

    return {
      ...tweet,
      hashtags: tweetHashtags
    };
  });

  return result;
}

/**
 * Extract hashtags from text content
 * @param {string} text - Text to extract hashtags from
 * @returns {Array<string>} Extracted hashtags
 */
function extractHashtagsFromText(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Match hashtags supporting Arabic characters
  const hashtagRegex = /#[a-zA-Z0-9_\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFE70-\uFEFF]+/g;
  const matches = text.match(hashtagRegex);
  
  return matches ? dedupeHashtags(matches) : [];
}

/**
 * Extract emojis from text content
 * @param {string} text - Text to extract emojis from
 * @returns {Array<string>} Extracted emojis
 */
function extractEmojisFromText(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Enhanced emoji regex
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]/gu;
  const matches = text.match(emojiRegex);
  
  return matches ? dedupeEmojis(matches) : [];
}

/**
 * Remove hashtags and emojis from text content
 * @param {string} text - Text to clean
 * @returns {string} Text with hashtags and emojis removed
 */
function removeHashtagsAndEmojis(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let cleaned = text;

  // Remove hashtags
  cleaned = cleaned.replace(/#[a-zA-Z0-9_\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFE70-\uFEFF]+/g, '');
  
  // Remove emojis
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]/gu, '');
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Validate hashtag format
 * @param {string} hashtag - Hashtag to validate
 * @returns {boolean} Whether hashtag is valid
 */
function isValidHashtag(hashtag) {
  if (!hashtag || typeof hashtag !== 'string') {
    return false;
  }

  // Must start with # and contain valid characters
  const hashtagRegex = /^#[a-zA-Z0-9_\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFE70-\uFEFF]+$/;
  return hashtagRegex.test(hashtag) && hashtag.length > 1 && hashtag.length <= 100;
}

/**
 * Deduplicate hashtags and emojis in a thread while preserving balance
 * @param {Array<Object>} tweets - Thread tweets
 * @returns {Array<Object>} Processed tweets
 */
function dedupeHashtagsAndEmojis(tweets) {
  if (!Array.isArray(tweets)) {
    return [];
  }

  // First pass: extract hashtags and emojis from text
  const processedTweets = tweets.map(tweet => {
    const textHashtags = extractHashtagsFromText(tweet.text);
    const textEmojis = extractEmojisFromText(tweet.text);
    
    // Combine with existing hashtags and emojis
    const allHashtags = [...(tweet.hashtags || []), ...textHashtags];
    const allEmojis = [...(tweet.emoji_suggestions || []), ...textEmojis];

    return {
      ...tweet,
      hashtags: dedupeHashtags(allHashtags),
      emoji_suggestions: dedupeEmojis(allEmojis)
    };
  });

  // Second pass: balance hashtags across thread
  return balanceHashtagsAcrossThread(processedTweets);
}

module.exports = {
  dedupeHashtags,
  dedupeEmojis,
  balanceHashtagsAcrossThread,
  extractHashtagsFromText,
  extractEmojisFromText,
  removeHashtagsAndEmojis,
  isValidHashtag,
  dedupeHashtagsAndEmojis
};