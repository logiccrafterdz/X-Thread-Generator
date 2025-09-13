# Contributing to X Thread Generator

We welcome contributions from developers worldwide! This document provides guidelines for contributing to the X Thread Generator project.

## 🌟 Ways to Contribute

- **🐛 Bug Reports**: Help us identify and fix issues
- **✨ Feature Requests**: Suggest new functionality
- **📝 Documentation**: Improve guides and examples
- **🔧 Code Contributions**: Submit bug fixes and new features
- **🌍 Translations**: Help expand language support
- **🧪 Testing**: Write tests and improve coverage

## 🚀 Getting Started

### Prerequisites

- **Node.js** 16.0.0 or higher
- **npm** 8.0.0 or higher
- **Git** for version control
- Basic knowledge of JavaScript, Node.js, and web development

### Development Setup

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/yourusername/x-thread-generator.git
   cd x-thread-generator
   ```

2. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/originalowner/x-thread-generator.git
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up environment**
   ```bash
   cp .env.template .env
   # Edit .env with your configuration
   ```

5. **Run the application**
   ```bash
   npm start
   # Development mode: npm run dev
   ```

6. **Run tests**
   ```bash
   npm test
   ```

## 📋 Development Guidelines

### Code Style

- **ESLint**: Follow the existing ESLint configuration
- **Formatting**: Use consistent indentation (2 spaces)
- **Naming**: Use camelCase for variables and functions, PascalCase for classes
- **Comments**: Write clear, concise comments for complex logic

```javascript
// Good
function generateThreadHashtags(thread, options = {}) {
  const { maxHashtags = 4, englishRatio = 0.7 } = options;
  // Implementation...
}

// Avoid
function gen_hashtags(t,o) {
  // Implementation...
}
```

### File Organization

```
├── 📁 services/        # Core business logic
├── 📁 utils/           # Utility functions
├── 📁 config/          # Configuration files
├── 📁 tests/           # Test files
├── 📁 public/          # Frontend assets
└── 📁 schemas/         # JSON schemas
```

### Testing Requirements

- **Unit Tests**: All utility functions must have unit tests
- **Integration Tests**: API endpoints require integration tests
- **Coverage**: Maintain minimum 80% test coverage
- **Test Naming**: Use descriptive test names

```javascript
// Good test naming
describe('hashtagGenerator', () => {
  describe('generateThreadHashtags', () => {
    it('should generate hashtags with 70% English distribution', () => {
      // Test implementation
    });
    
    it('should avoid duplicate hashtags across thread', () => {
      // Test implementation
    });
  });
});
```

## 🔄 Contribution Workflow

### 1. Create a Feature Branch

```bash
# Update your fork
git checkout main
git pull upstream main
git push origin main

# Create feature branch
git checkout -b feature/amazing-feature
# or
git checkout -b fix/bug-description
```

### 2. Make Your Changes

- Write clean, well-documented code
- Add tests for new functionality
- Update documentation as needed
- Follow the existing code style

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run linting
npm run lint

# Check test coverage
npm run test:coverage

# Test the application manually
npm start
```

### 4. Commit Your Changes

Use conventional commit messages:

```bash
# Format: type(scope): description
git commit -m "feat(hashtags): add dynamic hashtag generation"
git commit -m "fix(api): resolve character counting issue"
git commit -m "docs(readme): update installation instructions"
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 5. Push and Create Pull Request

```bash
# Push your branch
git push origin feature/amazing-feature

# Create pull request on GitHub
# Fill out the PR template completely
```

## 📝 Pull Request Guidelines

### PR Title Format

```
type(scope): Brief description of changes

# Examples:
feat(hashtags): Add dynamic hashtag generation system
fix(api): Resolve Unicode character counting issue
docs(contributing): Add development setup instructions
```

### PR Description Template

```markdown
## 📋 Description
Brief description of what this PR does.

## 🔧 Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## 🧪 Testing
- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Manual testing completed

## 📚 Documentation
- [ ] Code is self-documenting
- [ ] README updated (if needed)
- [ ] API documentation updated (if needed)

## ✅ Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] No console.log statements left in code
- [ ] No sensitive information exposed
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs tests and linting
2. **Code Review**: Maintainers review code quality and functionality
3. **Testing**: Manual testing of new features
4. **Approval**: At least one maintainer approval required
5. **Merge**: Squash and merge into main branch

## 🐛 Bug Reports

When reporting bugs, please include:

### Bug Report Template

```markdown
## 🐛 Bug Description
A clear description of what the bug is.

## 🔄 Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## ✅ Expected Behavior
What you expected to happen.

## ❌ Actual Behavior
What actually happened.

## 🖼️ Screenshots
If applicable, add screenshots.

## 🌐 Environment
- OS: [e.g. Windows 10, macOS 12.0, Ubuntu 20.04]
- Browser: [e.g. Chrome 96, Firefox 95, Safari 15]
- Node.js Version: [e.g. 16.14.0]
- Project Version: [e.g. 1.2.0]

## 📋 Additional Context
Any other context about the problem.
```

## ✨ Feature Requests

### Feature Request Template

```markdown
## 🚀 Feature Description
A clear description of the feature you'd like to see.

## 💡 Motivation
Why is this feature needed? What problem does it solve?

## 📋 Detailed Description
Detailed description of how the feature should work.

## 🎯 Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## 🔧 Implementation Ideas
Any ideas on how this could be implemented.

## 📚 Additional Context
Any other context, mockups, or examples.
```

## 🌍 Internationalization

We welcome contributions to expand language support:

### Adding New Languages

1. **Update Language Manager**
   ```javascript
   // In public/languageManager.js
   this.translations = {
     ar: { /* Arabic translations */ },
     en: { /* English translations */ },
     fr: { /* French translations */ }, // New language
   };
   ```

2. **Add Language Detection**
   ```javascript
   // Update detectInitialLanguage method
   if (browserLang.startsWith('fr')) {
     return 'fr';
   }
   ```

3. **Update Configuration**
   ```javascript
   // In config/languages.js
   // Add new language configuration
   ```

4. **Test Thoroughly**
   - Test UI elements
   - Test RTL/LTR layouts
   - Test character counting
   - Test hashtag generation

## 🔒 Security Guidelines

- **Never commit sensitive data** (API keys, passwords, etc.)
- **Validate all inputs** on both client and server side
- **Use environment variables** for configuration
- **Follow OWASP guidelines** for web security
- **Report security issues privately** via email

### Security Checklist

- [ ] No hardcoded secrets or API keys
- [ ] Input validation implemented
- [ ] XSS protection in place
- [ ] CSRF protection implemented
- [ ] Rate limiting configured
- [ ] Error messages don't expose sensitive info

## 📞 Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Code Review**: Ask questions in PR comments
- **Documentation**: Check the README and wiki first

## 🏆 Recognition

Contributors are recognized in:

- **README.md**: Major contributors listed
- **CHANGELOG.md**: Contributions noted in releases
- **GitHub**: Contributor graphs and statistics
- **Releases**: Contributors thanked in release notes

## 📄 License

By contributing to X Thread Generator, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to X Thread Generator!** 🎉

Your contributions help make this tool better for content creators worldwide.