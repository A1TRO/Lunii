# Lunii Troubleshooting Guide

## SSL Certificate Issues

### Error: "unable to get local issuer certificate"
This is the most common SSL error when connecting to Discord's API.

**Automatic Fix:**
Lunii automatically handles this error by:
- Setting `NODE_TLS_REJECT_UNAUTHORIZED=0`
- Using a custom HTTPS agent with certificate validation bypass
- Enforcing TLS 1.2 protocol
- Setting appropriate timeouts

**Manual Fix:**
If the automatic fix doesn't work:

1. **Check Environment Variables:**
   ```bash
   NODE_TLS_REJECT_UNAUTHORIZED=0
   ```

2. **Verify SSL Configuration:**
   ```json
   {
     "ssl": {
       "rejectUnauthorized": false,
       "timeout": 30000,
       "secureProtocol": "TLSv1_2_method"
     }
   }
   ```

3. **Test Discord Connection:**
   - Use the built-in connection test in Settings
   - Check logs for SSL-related errors
   - Verify firewall/antivirus isn't blocking connections

**Corporate Networks:**
If you're on a corporate network:
- Contact IT about SSL certificate policies
- Request whitelist for Discord domains
- Consider using a VPN

### Error: "CERT_HAS_EXPIRED" or "CERT_AUTHORITY_INVALID"
**Solution:**
1. Update your system's certificate store
2. Restart Lunii
3. If issue persists, the SSL bypass will handle it automatically

### Error: "ECONNRESET" or "ENOTFOUND"
**Solutions:**
1. Check internet connection
2. Verify DNS settings
3. Try different DNS servers (8.8.8.8, 1.1.1.1)
4. Disable VPN temporarily
5. Check if Discord is down (discordstatus.com)

## Login Issues

### Error: "Invalid token or login failed"
**Causes & Solutions:**

1. **Incorrect Token:**
   - Verify token is complete and correct
   - Ensure no extra spaces or characters
   - Try generating a new token

2. **Account Issues:**
   - Check if account is locked/suspended
   - Verify account isn't flagged for suspicious activity
   - Ensure 2FA isn't causing issues

3. **Rate Limiting:**
   - Wait 10-15 minutes before retrying
   - Avoid rapid login attempts
   - Check Discord's rate limit status

**Getting a New Token:**
1. Open Discord in browser
2. Press F12 → Network tab
3. Send any message
4. Find "messages" request
5. Copy Authorization header value

### Error: "Connection timeout"
**Solutions:**
1. Increase timeout in configuration:
   ```json
   {
     "ssl": {
       "timeout": 60000
     }
   }
   ```
2. Check network stability
3. Try different network connection
4. Restart router/modem

## Feature-Specific Issues

### Auto Giveaway Not Working
**Troubleshooting Steps:**

1. **Verify Configuration:**
   ```json
   {
     "giveaway": {
       "enabled": true,
       "keywords": ["🎉", "giveaway"],
       "verifiedBotsOnly": true
     }
   }
   ```

2. **Check Logs:**
   - Look for giveaway detection messages
   - Verify keyword matching is working
   - Check for rate limiting messages

3. **Common Issues:**
   - Keywords too restrictive
   - Channel blacklist blocking giveaways
   - Hourly limit reached
   - Bot verification failing

**Solutions:**
- Expand keyword list
- Review channel filters
- Increase hourly limit
- Disable bot verification temporarily

### AFK System Not Responding
**Troubleshooting:**

1. **Check AFK Status:**
   - Verify timeout duration is appropriate
   - Ensure auto-detection is enabled
   - Check activity monitoring

2. **AI Integration Issues:**
   - Verify Gemini API key is valid
   - Check API quota/billing
   - Review AI prompt configuration

3. **Response Limit:**
   - Check if response limit per user is reached
   - Clear response counters if needed

### Status Animation Not Working
**Common Issues:**

1. **Empty Message Array:**
   ```json
   {
     "statusAnimation": {
       "messages": [
         {"text": "Test Status", "type": "PLAYING"}
       ]
     }
   }
   ```

2. **Invalid Activity Types:**
   - Use: PLAYING, WATCHING, LISTENING, STREAMING
   - STREAMING requires URL parameter

3. **Interval Too Short:**
   - Minimum recommended: 30 seconds
   - Discord may rate limit frequent changes

## Performance Issues

### High Memory Usage
**Solutions:**

1. **Reduce Cache Sizes:**
   ```json
   {
     "performance": {
       "cacheSize": 500,
       "memoryOptimization": true
     }
   }
   ```

2. **Clear Logs Regularly:**
   ```json
   {
     "messageLogger": {
       "maxLogs": 500
     },
     "antiGhostPing": {
       "maxLogs": 50
     }
   }
   ```

3. **Restart Application:**
   - Restart Lunii every 24-48 hours
   - Enable automatic cleanup intervals

### Slow Response Times
**Optimizations:**

1. **Network Settings:**
   ```json
   {
     "ssl": {
       "keepAlive": true,
       "maxSockets": 10,
       "timeout": 15000
     }
   }
   ```

2. **Reduce Feature Load:**
   - Disable unused features
   - Lower animation intervals
   - Reduce log retention

3. **System Resources:**
   - Close unnecessary applications
   - Ensure adequate RAM available
   - Check CPU usage

## Discord API Issues

### Rate Limiting
**Error:** "You are being rate limited"

**Solutions:**
1. **Enable Rate Limit Protection:**
   ```json
   {
     "security": {
       "rateLimitProtection": true
     }
   }
   ```

2. **Increase Delays:**
   ```json
   {
     "giveaway": {
       "minDelay": 5000,
       "maxDelay": 15000
     }
   }
   ```

3. **Reduce Activity:**
   - Lower automation frequency
   - Spread actions over time
   - Monitor API usage

### API Errors
**Common Discord API Errors:**

- **50001**: Missing Access
- **50013**: Missing Permissions
- **50035**: Invalid Form Body
- **40001**: Unauthorized

**Solutions:**
- Verify bot permissions
- Check message format
- Ensure valid channel/user IDs
- Review Discord API documentation

## Configuration Issues

### Configuration Not Saving
**Causes:**
1. File permissions
2. Disk space
3. Antivirus interference

**Solutions:**
1. Run as administrator
2. Check available disk space
3. Add Lunii to antivirus exceptions
4. Verify config file location

### Settings Reset on Restart
**Troubleshooting:**
1. Check if config file exists
2. Verify file permissions
3. Look for backup config files
4. Check logs for save errors

## Logging and Debugging

### Enable Debug Mode
1. Go to Settings → Advanced
2. Enable Debug Mode
3. Restart application
4. Check detailed logs

### Log Locations
- **Windows:** `%APPDATA%/Lunii/logs/`
- **macOS:** `~/Library/Application Support/Lunii/logs/`
- **Linux:** `~/.config/Lunii/logs/`

### Log Files
- `discord.log`: Discord API interactions
- `error.log`: Error messages and stack traces
- `giveaway.log`: Giveaway system activities
- `afk.log`: AFK system activities

### Reading Logs
**Important Log Patterns:**
```
ERROR: SSL certificate error
INFO: Successfully logged in
WARN: Rate limit approaching
DEBUG: Giveaway detected in channel
```

## Network Diagnostics

### Connection Test
```bash
# Test Discord API connectivity
curl -I https://discord.com/api/v9/gateway

# Test with SSL bypass
curl -k -I https://discord.com/api/v9/gateway
```

### DNS Issues
**Test DNS Resolution:**
```bash
nslookup discord.com
nslookup gateway.discord.gg
```

**Alternative DNS Servers:**
- Google: 8.8.8.8, 8.8.4.4
- Cloudflare: 1.1.1.1, 1.0.0.1
- OpenDNS: 208.67.222.222, 208.67.220.220

## System Requirements

### Minimum Requirements
- **OS:** Windows 10, macOS 10.14, Ubuntu 18.04
- **RAM:** 4GB
- **Storage:** 500MB free space
- **Network:** Stable internet connection

### Recommended Requirements
- **OS:** Latest versions
- **RAM:** 8GB or more
- **Storage:** 1GB free space
- **Network:** High-speed broadband

## Getting Help

### Before Reporting Issues
1. Check this troubleshooting guide
2. Review configuration settings
3. Check logs for error messages
4. Try basic solutions (restart, etc.)

### Reporting Bugs
Include the following information:
1. Operating system and version
2. Lunii version
3. Error messages from logs
4. Steps to reproduce
5. Configuration (remove sensitive data)

### Support Channels
1. GitHub Issues (preferred)
2. Discord support server
3. Email support (for sensitive issues)

### Emergency Recovery

### Reset Configuration
1. Close Lunii completely
2. Navigate to config directory
3. Rename `config.json` to `config.json.backup`
4. Restart Lunii (will create default config)

### Clean Installation
1. Uninstall Lunii
2. Delete configuration directory
3. Clear application data
4. Reinstall latest version
5. Reconfigure settings

### Backup and Restore
**Backup Important Files:**
- Configuration: `config.json`
- Logs: `logs/` directory
- Custom commands/templates

**Restore Process:**
1. Install Lunii
2. Replace config file
3. Verify settings
4. Test functionality

This troubleshooting guide covers the most common issues users encounter with Lunii. For additional help, consult the documentation or contact support.