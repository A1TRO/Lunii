# Lunii Configuration Guide

## Overview
This guide covers all configuration options available in Lunii, including SSL settings, feature configurations, and advanced options.

## Configuration File Location
- **Windows**: `%APPDATA%/Lunii/config.json`
- **macOS**: `~/Library/Application Support/Lunii/config.json`
- **Linux**: `~/.config/Lunii/config.json`

## SSL Configuration

### Automatic SSL Bypass
Lunii automatically handles SSL certificate issues with Discord's API by:

```json
{
  "ssl": {
    "rejectUnauthorized": false,
    "timeout": 30000,
    "secureProtocol": "TLSv1_2_method",
    "keepAlive": true,
    "maxSockets": 10
  }
}
```

### Environment Variables
The following environment variables are automatically set:
- `NODE_TLS_REJECT_UNAUTHORIZED=0`

### Custom HTTPS Agent
Lunii creates a custom HTTPS agent for all Discord API requests with:
- Certificate validation bypass
- TLS 1.2 protocol enforcement
- 30-second timeout
- Connection keep-alive
- Socket pooling

## Auto Giveaway Join System

### Basic Configuration
```json
{
  "giveaway": {
    "enabled": false,
    "keywords": [
      "🎉", "giveaway", "react", "win", "prize",
      "enter", "participate", "free", "contest"
    ],
    "reactionEmojis": ["🎉", "🎊", "🎁", "✨", "🏆"],
    "channelWhitelist": [],
    "channelBlacklist": [],
    "minDelay": 1000,
    "maxDelay": 5000,
    "maxPerHour": 10,
    "verifiedBotsOnly": true,
    "requireKeywords": true
  }
}
```

### Configuration Options

#### Keywords
Array of strings/emojis that identify giveaway messages:
- Case-insensitive matching
- Supports Unicode emojis
- Checks both message content and embeds

#### Reaction Emojis
Array of emojis to use for reactions:
- Randomly selected for each giveaway
- Supports Unicode emojis
- Custom server emojis not supported

#### Channel Management
- **channelWhitelist**: Only join giveaways in these channels (empty = all channels)
- **channelBlacklist**: Never join giveaways in these channels

#### Safety Features
- **minDelay/maxDelay**: Random delay range in milliseconds
- **maxPerHour**: Maximum giveaways to join per hour
- **verifiedBotsOnly**: Only join giveaways from bot accounts
- **requireKeywords**: Require keyword match (recommended)

### Usage Examples

#### Server-Specific Giveaways
```json
{
  "giveaway": {
    "enabled": true,
    "channelWhitelist": ["123456789012345678", "987654321098765432"],
    "keywords": ["🎉", "giveaway", "nitro"],
    "maxPerHour": 5
  }
}
```

#### Conservative Settings
```json
{
  "giveaway": {
    "enabled": true,
    "minDelay": 5000,
    "maxDelay": 15000,
    "maxPerHour": 3,
    "verifiedBotsOnly": true,
    "requireKeywords": true
  }
}
```

## AFK Auto Reply System

### Basic Configuration
```json
{
  "afk": {
    "enabled": false,
    "timeout": 300000,
    "message": "I'm currently AFK. I'll get back to you soon!",
    "aiEnabled": false,
    "aiPrompt": "You are helping respond to messages while the user is away. Be friendly, brief, and helpful. Mention that the user is currently away.",
    "responseLimit": 3,
    "autoDetection": true
  }
}
```

### Configuration Options

#### Basic Settings
- **enabled**: Enable/disable AFK system
- **timeout**: Time in milliseconds before considered AFK (default: 5 minutes)
- **message**: Default AFK response message
- **responseLimit**: Maximum responses per user while AFK
- **autoDetection**: Automatically detect when user returns

#### AI Integration
- **aiEnabled**: Use AI for generating responses
- **aiPrompt**: System prompt for AI responses

### AI Response Examples

#### Professional Prompt
```json
{
  "aiPrompt": "You are a professional assistant responding to messages while the user is away from their computer. Be polite, brief, and helpful. Always mention that the user is currently away and will respond when they return."
}
```

#### Casual Prompt
```json
{
  "aiPrompt": "You're helping respond to messages while your friend is AFK. Be friendly and casual, but let them know the person will be back soon. Keep responses short and natural."
}
```

#### Custom Context Prompt
```json
{
  "aiPrompt": "You are responding for a Discord server moderator who is temporarily away. Be helpful with basic questions, direct complex issues to other staff, and maintain a professional but friendly tone."
}
```

## Status Animation System

### Basic Configuration
```json
{
  "statusAnimation": {
    "enabled": false,
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

### Status Types
- **PLAYING**: "Playing [text]"
- **WATCHING**: "Watching [text]"
- **LISTENING**: "Listening to [text]"
- **STREAMING**: "Streaming [text]" (requires URL)
- **COMPETING**: "Competing in [text]"

### Advanced Options
- **interval**: Time between status changes (milliseconds)
- **randomOrder**: Randomize status order vs sequential
- **smoothTransitions**: Gradual status transitions

### Creative Status Examples

#### Gaming Theme
```json
{
  "messages": [
    {"text": "Minecraft", "type": "PLAYING"},
    {"text": "Valorant", "type": "PLAYING"},
    {"text": "game streams", "type": "WATCHING"},
    {"text": "epic gaming music", "type": "LISTENING"}
  ]
}
```

#### Developer Theme
```json
{
  "messages": [
    {"text": "with code", "type": "PLAYING"},
    {"text": "Stack Overflow", "type": "WATCHING"},
    {"text": "lo-fi hip hop", "type": "LISTENING"},
    {"text": "coding tutorials", "type": "STREAMING", "url": "https://twitch.tv/coding"}
  ]
}
```

## Message Logger

### Configuration
```json
{
  "messageLogger": {
    "enabled": true,
    "maxLogs": 1000,
    "logDMs": true,
    "logGuilds": true,
    "logAttachments": true
  }
}
```

### Options
- **maxLogs**: Maximum number of messages to store
- **logDMs**: Log direct messages
- **logGuilds**: Log server messages
- **logAttachments**: Include attachment information

## Anti Ghost Ping

### Configuration
```json
{
  "antiGhostPing": {
    "enabled": true,
    "maxLogs": 100,
    "notifyOnDetection": true
  }
}
```

### Options
- **maxLogs**: Maximum ghost pings to store
- **notifyOnDetection**: Show notifications for ghost pings

## AI Integration (Gemini)

### Configuration
```json
{
  "ai": {
    "geminiApiKey": "",
    "enabled": false,
    "rateLimit": 10,
    "rateLimitWindow": 60000
  }
}
```

### Setup Instructions
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add key to configuration
3. Enable AI features in AFK system

### Rate Limiting
- **rateLimit**: Maximum AI requests per window
- **rateLimitWindow**: Time window in milliseconds

## Security Settings

### Configuration
```json
{
  "security": {
    "autoSaveToken": true,
    "encryptData": true,
    "rateLimitProtection": true,
    "suspiciousActivityDetection": true
  }
}
```

### Options
- **autoSaveToken**: Automatically save Discord token
- **encryptData**: Encrypt stored configuration data
- **rateLimitProtection**: Automatic rate limit handling
- **suspiciousActivityDetection**: Monitor for unusual patterns

## Performance Settings

### Configuration
```json
{
  "performance": {
    "cacheSize": 1000,
    "cleanupInterval": 3600000,
    "memoryOptimization": true
  }
}
```

### Options
- **cacheSize**: Maximum cached items
- **cleanupInterval**: Memory cleanup frequency (milliseconds)
- **memoryOptimization**: Enable memory optimization features

## Notifications

### Configuration
```json
{
  "notifications": {
    "mentions": true,
    "giveaways": true,
    "ghostPings": true,
    "friendRequests": true,
    "serverEvents": true
  }
}
```

## Troubleshooting

### SSL Issues
If you encounter SSL certificate errors:

1. Verify SSL configuration is applied
2. Check firewall/antivirus settings
3. Try running as administrator
4. Ensure `NODE_TLS_REJECT_UNAUTHORIZED=0` is set

### Rate Limiting
If you're being rate limited:

1. Increase delays in giveaway system
2. Reduce automation frequency
3. Enable rate limit protection
4. Monitor Discord API status

### Memory Issues
For high memory usage:

1. Reduce cache sizes
2. Lower log retention limits
3. Enable memory optimization
4. Restart application periodically

### AI Issues
For AI-related problems:

1. Verify Gemini API key is valid
2. Check rate limit settings
3. Monitor API quota usage
4. Review AI prompt configuration

## Best Practices

### Security
- Never share your Discord token
- Use strong, unique passwords
- Enable 2FA on Discord account
- Regularly rotate API keys

### Performance
- Monitor resource usage
- Adjust cache sizes based on usage
- Clean logs regularly
- Use appropriate delays for automation

### Detection Avoidance
- Use random delays
- Vary automation patterns
- Don't exceed reasonable limits
- Monitor for warnings

### Maintenance
- Keep Lunii updated
- Backup configuration regularly
- Monitor logs for errors
- Test features after updates