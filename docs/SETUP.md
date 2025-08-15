# Lunii Discord Self-Bot Setup Guide

## Table of Contents
1. [Installation](#installation)
2. [Configuration](#configuration)
3. [SSL Certificate Setup](#ssl-certificate-setup)
4. [Feature Configuration](#feature-configuration)
5. [Troubleshooting](#troubleshooting)

## Installation

### Prerequisites
- Node.js 16.x or higher
- Discord account
- Discord token (see [Getting Your Token](#getting-your-token))

### Getting Your Token
1. Open Discord in your web browser
2. Press F12 to open Developer Tools
3. Go to the Network tab
4. Send a message in any channel
5. Look for a request to "messages"
6. In the request headers, find "Authorization"
7. Copy the value after "Authorization: "

⚠️ **Warning**: Never share your token with others! Your token gives full access to your Discord account.

### Installation Steps
1. Download the latest release from GitHub
2. Extract the files to your desired location
3. Run the installer or launch the executable
4. Enter your Discord token when prompted

## Configuration

### Default Configuration
Lunii creates a configuration file at `%APPDATA%/Lunii/config.json` with the following structure:

```json
{
  "ssl": {
    "rejectUnauthorized": false,
    "timeout": 30000,
    "secureProtocol": "TLSv1_2_method"
  },
  "giveaway": {
    "enabled": false,
    "keywords": ["🎉", "giveaway", "react", "win", "prize"],
    "reactionEmojis": ["🎉", "🎊", "🎁"],
    "minDelay": 1000,
    "maxDelay": 5000,
    "maxPerHour": 10
  },
  "afk": {
    "enabled": false,
    "timeout": 300000,
    "aiEnabled": false,
    "responseLimit": 3
  },
  "statusAnimation": {
    "enabled": false,
    "interval": 30000,
    "messages": []
  }
}
```

## SSL Certificate Setup

### Automatic SSL Configuration
Lunii automatically handles SSL certificate issues by:
- Bypassing certificate validation for Discord API requests
- Using TLS 1.2 protocol
- Setting appropriate timeouts
- Configuring custom HTTPS agents

### Manual SSL Configuration
If you encounter SSL issues, you can manually configure SSL settings:

1. Open the configuration file
2. Modify the SSL section:
```json
{
  "ssl": {
    "rejectUnauthorized": false,
    "timeout": 30000,
    "secureProtocol": "TLSv1_2_method"
  }
}
```

### Environment Variables
You can also set SSL configuration via environment variables:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0
HTTPS_PROXY=your_proxy_if_needed
```

## Feature Configuration

### Auto Giveaway Join System

#### Basic Setup
1. Navigate to Automation → Auto Giveaway
2. Enable the feature
3. Configure keywords and emojis
4. Set delay ranges to avoid detection

#### Advanced Configuration
```json
{
  "giveaway": {
    "enabled": true,
    "keywords": [
      "🎉", "giveaway", "react", "win", "prize", 
      "enter", "participate", "free", "contest"
    ],
    "reactionEmojis": ["🎉", "🎊", "🎁", "✨", "🏆"],
    "channelWhitelist": [],
    "channelBlacklist": ["123456789"],
    "minDelay": 2000,
    "maxDelay": 8000,
    "maxPerHour": 15,
    "verifiedBotsOnly": true,
    "requireKeywords": true
  }
}
```

#### Channel Management
- **Whitelist**: Only join giveaways in specified channels
- **Blacklist**: Never join giveaways in specified channels
- Leave both empty to join giveaways in all channels

#### Safety Features
- **Rate Limiting**: Maximum giveaways per hour
- **Random Delays**: Prevents detection patterns
- **Verified Bots**: Only join giveaways from known bots
- **Keyword Filtering**: Additional content verification

### AFK Auto Reply System

#### Basic Setup
1. Navigate to Automation → AFK Auto Reply
2. Enable the feature
3. Set timeout duration
4. Configure response message

#### AI Integration
1. Get a Gemini API key from Google AI Studio
2. Navigate to Settings → Gemini AI Integration
3. Enter your API key
4. Enable AI assistance in AFK settings

#### Configuration Options
```json
{
  "afk": {
    "enabled": true,
    "timeout": 300000,
    "message": "I'm currently AFK. I'll get back to you soon!",
    "aiEnabled": true,
    "aiPrompt": "You are helping respond to messages while the user is away. Be friendly, brief, and helpful.",
    "responseLimit": 3,
    "autoDetection": true
  }
}
```

#### AI Prompts
Customize AI responses by modifying the `aiPrompt` field:
- Keep responses brief and natural
- Include context about being away
- Maintain a helpful tone
- Avoid revealing it's an AI response

### Status Animation System

#### Basic Setup
1. Navigate to Automation → Status Animation
2. Enable the feature
3. Add custom status messages
4. Set rotation interval

#### Status Types
- **PLAYING**: "Playing [status]"
- **WATCHING**: "Watching [status]"
- **LISTENING**: "Listening to [status]"
- **STREAMING**: "Streaming [status]" (requires URL)

#### Configuration Example
```json
{
  "statusAnimation": {
    "enabled": true,
    "interval": 30000,
    "messages": [
      {
        "text": "Discord Self-Bot",
        "type": "PLAYING"
      },
      {
        "text": "with Lunii Dashboard",
        "type": "PLAYING"
      },
      {
        "text": "your messages",
        "type": "WATCHING"
      },
      {
        "text": "to music",
        "type": "LISTENING"
      },
      {
        "text": "Lunii.dev",
        "type": "STREAMING",
        "url": "https://twitch.tv/lunii"
      }
    ],
    "randomOrder": false,
    "smoothTransitions": true
  }
}
```

## Troubleshooting

### Common Issues

#### SSL Certificate Errors
**Error**: "unable to get local issuer certificate"
**Solution**: 
1. Ensure SSL bypass is enabled in config
2. Check firewall/antivirus settings
3. Try running as administrator

#### Login Failures
**Error**: "Invalid token or login failed"
**Solutions**:
1. Verify token is correct and complete
2. Check if account has 2FA enabled
3. Ensure account isn't locked or suspended
4. Try generating a new token

#### High Memory Usage
**Solutions**:
1. Reduce cache size in configuration
2. Enable memory optimization
3. Restart the application periodically
4. Clear logs regularly

#### Rate Limiting
**Error**: "Rate limited by Discord"
**Solutions**:
1. Increase delays between actions
2. Reduce automation frequency
3. Enable rate limit protection
4. Wait for rate limit to reset

### Debug Mode
Enable debug mode for detailed logging:
1. Navigate to Settings → Advanced Settings
2. Enable Debug Mode
3. Check logs in `%APPDATA%/Lunii/logs/`

### Log Files
Lunii creates several log files:
- `main.log`: General application logs
- `discord.log`: Discord API interactions
- `error.log`: Error messages and stack traces
- `giveaway.log`: Giveaway join attempts
- `afk.log`: AFK system activities

### Performance Optimization

#### Memory Management
```json
{
  "performance": {
    "cacheSize": 1000,
    "cleanupInterval": 3600000,
    "memoryOptimization": true
  }
}
```

#### Network Optimization
```json
{
  "ssl": {
    "timeout": 15000,
    "keepAlive": true,
    "maxSockets": 10
  }
}
```

### Security Considerations

#### Token Security
- Never share your Discord token
- Use auto-save token feature carefully
- Enable encryption for stored data
- Regularly rotate your token

#### Detection Avoidance
- Use random delays for all actions
- Don't exceed rate limits
- Vary automation patterns
- Monitor for suspicious activity warnings

### Support

If you encounter issues not covered in this guide:
1. Check the GitHub Issues page
2. Join the Discord support server
3. Review the FAQ section
4. Submit a detailed bug report

### Updates

Lunii includes an automatic updater:
1. Updates are checked every 30 minutes
2. Notifications appear when updates are available
3. Updates can be installed automatically
4. Manual updates are available from GitHub releases

For manual updates:
1. Download the latest release
2. Close Lunii completely
3. Replace the old files
4. Restart the application
5. Your configuration will be preserved