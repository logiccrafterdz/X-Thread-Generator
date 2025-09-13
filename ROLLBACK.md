# Rollback Procedures

This document provides emergency rollback procedures for the Twitter Thread Generator service.

## 🚨 Emergency Rollback Actions

### 1. Instant Gemini API Disable

If Gemini API is causing issues, disable it immediately:

```bash
# Method 1: Environment variable
export GEMINI_ENABLED=false

# Method 2: Edit .env file
echo "GEMINI_ENABLED=false" >> .env

# Method 3: Restart with override
GEMINI_ENABLED=false npm start
```

**Effect**: Service immediately switches to local fallback generation.

### 2. Enable Fallback as Default

Ensure fallback generation is working:

```bash
# Enable fallback mode
export FALLBACK_ENABLED=true
export FALLBACK_LOG_EVENTS=true

# Restart service
npm restart
```

### 3. Git Version Rollback

Roll back to previous working version:

```bash
# View recent commits
git log --oneline -10

# Rollback to specific commit
git reset --hard <commit-hash>

# Force restart
npm install
npm start
```

### 4. Service Restart

Simple service restart to clear any memory issues:

```bash
# Stop current process (Ctrl+C or kill PID)
# Then restart
npm start

# Or using PM2 (if configured)
pm2 restart xtweet-generator
```

## 📊 Health Check Commands

Monitor service health during rollback:

```bash
# Check service status
curl http://localhost:3000/api/health

# Check if API is responding
curl -X POST http://localhost:3000/api/generate-thread \
  -H "Content-Type: application/json" \
  -d '{"text":"test","maxTweets":1}'
```

## 🔧 Configuration Rollback

### Reset to Default Configuration

```bash
# Backup current config
cp .env .env.backup

# Use template defaults
cp .env.template .env

# Edit only essential settings
nano .env
```

Essential settings for basic operation:
```env
PORT=3000
NODE_ENV=production
GEMINI_ENABLED=false
FALLBACK_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=50
MAX_INPUT_LENGTH=5000
```

### Restore Known Good Configuration

```bash
# If you have a backup
cp .env.good .env

# Or restore from git
git checkout HEAD~1 -- .env
```

## 📝 Fallback Event Logging

Monitor fallback usage to understand issues:

```bash
# Enable fallback logging
export FALLBACK_LOG_EVENTS=true

# Watch logs for fallback events
tail -f logs/server.log | grep "FALLBACK"

# Count fallback occurrences
grep "FALLBACK" logs/server.log | wc -l
```

## 🗂️ Data Recovery

### Recover Lost History

History files are in `history/` directory:

```bash
# List history files
ls -la history/

# Check for corrupted files
find history/ -name "*.json" -exec jq . {} \; 2>&1 | grep -v "parse error"

# Backup history before rollback
tar -czf history-backup-$(date +%Y%m%d).tar.gz history/
```

### Clear Corrupted Data

```bash
# Remove corrupted history files
find history/ -name "*.json" -exec sh -c 'jq . "$1" > /dev/null 2>&1 || rm "$1"' _ {} \;

# Reset quota if stuck
# (requires service restart)
export GEMINI_QUOTA_LIMIT=0
```

## 🚦 Step-by-Step Emergency Response

### Priority 1: Service Down

1. **Check if process is running**
   ```bash
   ps aux | grep node
   netstat -tulnp | grep :3000
   ```

2. **Restart with minimal config**
   ```bash
   GEMINI_ENABLED=false FALLBACK_ENABLED=true npm start
   ```

3. **Verify basic functionality**
   ```bash
   curl http://localhost:3000/api/health
   ```

### Priority 2: Service Degraded

1. **Disable Gemini immediately**
   ```bash
   export GEMINI_ENABLED=false
   ```

2. **Check fallback functionality**
   ```bash
   curl -X POST http://localhost:3000/api/generate-thread \
     -H "Content-Type: application/json" \
     -d '{"text":"Emergency test content for fallback verification","maxTweets":2}'
   ```

3. **Monitor logs for errors**
   ```bash
   tail -f logs/server.log
   ```

### Priority 3: Data Issues

1. **Backup current state**
   ```bash
   cp -r history/ history-backup-$(date +%Y%m%d)/
   cp .env .env-backup-$(date +%Y%m%d)
   ```

2. **Reset to clean state**
   ```bash
   rm -rf history/*.json
   cp .env.template .env
   ```

3. **Restart and verify**

## 📞 Troubleshooting Common Issues

### Gemini API Quota Exceeded

```bash
# Immediate: Disable Gemini
export GEMINI_ENABLED=false

# Check quota usage
curl http://localhost:3000/api/stats

# Reset quota (next day)
# Edit .env: GEMINI_QUOTA_LIMIT=100
```

### Memory Leaks

```bash
# Check memory usage
ps aux | grep node
free -h

# Restart with memory monitoring
node --max-old-space-size=512 server.js
```

### Port Conflicts

```bash
# Find process using port 3000
lsof -i :3000
netstat -tulnp | grep :3000

# Kill conflicting process
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

### Disk Space Issues

```bash
# Check disk usage
df -h

# Clear old logs
find logs/ -name "*.log" -mtime +7 -delete

# Clear old history (optional)
find history/ -name "*.json" -mtime +30 -delete
```

## 🔍 Post-Rollback Verification

After any rollback, verify these functions:

1. **Health Endpoint**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Thread Generation**
   ```bash
   curl -X POST http://localhost:3000/api/generate-thread \
     -H "Content-Type: application/json" \
     -d '{"text":"Test content","maxTweets":1}'
   ```

3. **Web Interface**
   - Open http://localhost:3000
   - Test form submission
   - Verify thread display

4. **Character Counting**
   - Test with emojis: "Hello 👋 World"
   - Test with Arabic: "مرحبا بالعالم"
   - Verify 280 character limit enforcement

## 📋 Rollback Checklist

- [ ] Service is responding to health checks
- [ ] Basic thread generation works
- [ ] Character counting is accurate
- [ ] Arabic text displays correctly (RTL)
- [ ] Fallback generation is functional
- [ ] No memory leaks detected
- [ ] Logs are being written correctly
- [ ] Web interface loads and functions
- [ ] API endpoints return valid JSON
- [ ] Security headers are present

## 📞 Emergency Contacts

This is a personal project, but document any external dependencies:

- **Gemini API Status**: Check Google Cloud Status page
- **Node.js Issues**: Check Node.js GitHub issues
- **System Resources**: Monitor server/local machine health

## 📅 Recovery Timeline

- **Immediate (0-5 min)**: Disable problematic features
- **Short-term (5-30 min)**: Implement temporary fixes
- **Medium-term (30+ min)**: Full rollback and verification
- **Long-term (hours/days)**: Root cause analysis and permanent fix

---

**Remember**: The service is designed to degrade gracefully. When in doubt, disable Gemini and rely on local fallback generation.