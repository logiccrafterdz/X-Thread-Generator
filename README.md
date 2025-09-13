# X Thread Generator

> A powerful, intelligent tool that transforms long-form content into engaging X (Twitter) threads with dual-language support and smart hashtag generation.

[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## 🌟 Overview

X Thread Generator is a sophisticated web application designed to convert long-form articles, blog posts, or notes into well-structured X (Twitter) threads. Built with a **dual-audience strategy**, it serves both Arabic-speaking developers interested in English tech content and global English-speaking users.

### Why X Thread Generator?

- **🤖 AI-Powered**: Integrates with Google Gemini AI for intelligent content segmentation
- **🌍 Dual-Language**: Native Arabic and English support with smart RTL/LTR handling
- **📱 Smart Hashtags**: Dynamic hashtag generation with 70% English / 30% Arabic distribution
- **🔒 Privacy-First**: No data collection, all processing happens locally
- **⚡ Reliable**: Comprehensive fallback system ensures 100% uptime
- **🎨 Modern UI**: Clean, responsive interface with dark mode support

## ✨ Key Features

### 🧠 Intelligent Content Processing
- **AI-Powered Segmentation**: Uses Gemini AI for smart content breakdown
- **Local Fallback**: Template-based generation when AI is unavailable
- **Unicode-Safe**: Proper emoji and special character counting
- **Smart Truncation**: Respects word and sentence boundaries

### 🌐 Dual-Language Architecture
- **Arabic Interface**: Native RTL support for Arabic-speaking users
- **English Interface**: Global accessibility with LTR layout
- **Technical Content**: APIs and documentation remain in English for consistency
- **Auto-Detection**: Intelligent language detection based on user preferences

### 🏷️ Dynamic Hashtag System
- **Content-Aware**: Analyzes text to suggest relevant hashtags
- **Topic Detection**: 11+ categories (AI, Programming, Business, Health, etc.)
- **Hybrid Distribution**: 70% English hashtags for global reach, 30% Arabic for local engagement
- **No Duplicates**: Thread-level deduplication ensures variety

### 🔧 Developer-Friendly
- **RESTful API**: Complete API for programmatic access
- **JSON Schema**: Validated responses and requests
- **Comprehensive Testing**: Unit and integration test coverage
- **Docker Ready**: Easy deployment and scaling

## 🚀 Quick Start

### Prerequisites

- **Node.js** 16.0.0 or higher
- **npm** 8.0.0 or higher
- **Google Gemini API Key** (optional, for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/x-thread-generator.git
   cd x-thread-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.template .env
   # Edit .env with your settings (see Configuration section)
   ```

4. **Start the application**
   ```bash
   npm start
   ```

5. **Access the application**
   ```
   Open http://localhost:3000 in your browser
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.template`:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# AI Integration (Optional)
GEMINI_ENABLED=true
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_QUOTA_LIMIT=100

# Security & Limits
RATE_LIMIT_MAX_REQUESTS=100
MAX_INPUT_LENGTH=10000
MAX_TWEETS_PER_THREAD=20

# Logging
LOG_LEVEL=info
LOG_FILE_MAX_SIZE=10m
```

### Gemini AI Setup (Recommended)

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Generate your API key
3. Add it to your `.env` file
4. Set `GEMINI_ENABLED=true`

> **Note**: The application works perfectly without Gemini AI using intelligent local templates.

## 📖 Usage Examples

### Web Interface

1. **Navigate** to http://localhost:3000
2. **Switch Language** using the 🌐 toggle (Arabic/English)
3. **Paste Content** in the text area
4. **Configure Options**:
   - Language: Auto-detect, Arabic, English, or Mixed
   - Style: Educational, Professional, Technical, Engaging, or Concise
   - Max Tweets: 1-20 tweets per thread
   - Include hashtags and image suggestions
5. **Generate Thread** and copy the results

### API Usage

#### Generate a Thread

```bash
curl -X POST http://localhost:3000/api/generate-thread \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Artificial Intelligence is revolutionizing how we work. Machine learning algorithms can now process vast amounts of data in seconds, enabling businesses to make data-driven decisions faster than ever before.",
    "language": "auto",
    "style": "educational",
    "maxTweets": 3,
    "includeHashtags": true
  }'
```

#### Response Example

```json
{
  "metadata": {
    "language": "en",
    "direction": "ltr",
    "tweets_generated": 3,
    "style": "educational"
  },
  "thread": [
    {
      "index": 1,
      "text": "🧵 Let's learn something new today: Artificial Intelligence is revolutionizing how we work.",
      "char_count": 95,
      "hashtags": ["#AI", "#MachineLearning", "#Thread"]
    },
    {
      "index": 2,
      "text": "2/3 Machine learning algorithms can now process vast amounts of data in seconds, enabling businesses to make data-driven decisions faster than ever before.",
      "char_count": 148,
      "hashtags": ["#DataScience", "#Business"]
    },
    {
      "index": 3,
      "text": "3/3 Did you learn something new? Share this with someone who needs it! #Education #Learning #TechTrends",
      "char_count": 103,
      "hashtags": ["#Education", "#Learning", "#TechTrends"]
    }
  ],
  "estimated_engagement_score": 8.5
}
```

## 🏗️ Architecture

### System Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Express API    │    │   AI Services   │
│                 │    │                  │    │                 │
│ • Dual Language │◄──►│ • RESTful API    │◄──►│ • Gemini AI     │
│ • Modern UI     │    │ • Input Validation│    │ • Local Fallback│
│ • Real-time     │    │ • Rate Limiting  │    │ • Smart Templates│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Utilities      │
                       │                  │
                       │ • Hashtag Gen    │
                       │ • Char Counter   │
                       │ • Lang Detection │
                       │ • Input Sanitizer│
                       └──────────────────┘
```

### Directory Structure

```
├── 📁 config/              # Configuration files
│   ├── constants.js         # Application constants
│   └── languages.js         # Language configurations
├── 📁 public/              # Frontend assets
│   ├── index.html          # Main UI
│   ├── main.js             # Frontend logic
│   └── languageManager.js  # Dual-language system
├── 📁 services/            # Core business logic
│   ├── geminiService.js    # AI integration
│   ├── hashtagGenerator.js # Dynamic hashtag system
│   └── localTemplates.js   # Fallback generation
├── 📁 utils/               # Utility functions
│   ├── charCounter.js      # Unicode-safe counting
│   ├── inputSanitizer.js   # Input validation
│   ├── langDetect.js       # Language detection
│   └── dedupe.js           # Deduplication logic
├── 📁 tests/               # Test suites
├── 📁 schemas/             # JSON schemas
└── server.js               # Express application
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch

# Lint code
npm run lint
```

### Test Coverage

- **API Endpoints**: Integration tests for all routes
- **Utility Functions**: Unit tests for character counting, language detection
- **Hashtag Generation**: Comprehensive testing of dynamic hashtag system
- **Security**: Input sanitization and validation tests

## 🗺️ Roadmap

### Version 2.0 (Q2 2025)
- [ ] **Multi-Platform Support**: LinkedIn, Instagram, Facebook thread generation
- [ ] **Advanced AI**: GPT-4 integration with custom fine-tuning
- [ ] **Analytics Dashboard**: Thread performance tracking
- [ ] **Team Collaboration**: Multi-user workspace

### Version 2.1 (Q3 2025)
- [ ] **Mobile App**: React Native application
- [ ] **Browser Extension**: Chrome/Firefox extension
- [ ] **Scheduling**: Automated thread posting
- [ ] **Templates**: Pre-built thread templates

### Version 3.0 (Q4 2025)
- [ ] **Enterprise Features**: SSO, team management
- [ ] **API Marketplace**: Third-party integrations
- [ ] **Advanced Analytics**: AI-powered insights
- [ ] **White-label Solution**: Customizable branding

## 🤝 Contributing

We welcome contributions from developers worldwide! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Quick Contribution Guide

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/x-thread-generator.git

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for intelligent content processing
- **Arabic Typography Community** for RTL layout guidance
- **Open Source Contributors** who make projects like this possible
- **LogicCrafterDZ** for project development and maintenance

## 📞 Support

- 🐦 Twitter: [@Arana_lib]
- 📱 Telegram: [t.me/LogicCrafterDZ]
- 📧 Email: [logiccrafterdz@gmail.com]
- **Issues**: Report bugs via [GitHub Issues](../../issues)
- **Discussions**: Join our [GitHub Discussions](../../discussions)
- **Security**: Report security issues privately via email

---

<div align="center">
  <strong>Built with ❤️ by LogicCrafterDZ</strong><br>
  <em>Empowering content creators worldwide</em>
</div>
