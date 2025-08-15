# Lunii Configuration Examples

## Complete Configuration Examples

### Basic Setup (Recommended for New Users)
```json
{
  "ssl": {
    "rejectUnauthorized": false,
    "timeout": 30000,
    "secureProtocol": "TLSv1_2_method"
  },
  "giveaway": {
    "enabled": true,
    "keywords": ["🎉", "giveaway", "react", "win"],
    "reactionEmojis": ["🎉", "🎊"],
    "minDelay": 2000,
    "maxDelay": 8000,
    "maxPerHour": 5,
    "verifiedBotsOnly": true,
    "requireKeywords": true
  },
  "afk": {
    "enabled": true,
    "timeout": 300000,
    "message": "I'm currently AFK. I'll get back to you soon!",
    "aiEnabled": false,
    "responseLimit": 2
  },
  "statusAnimation": {
    "enabled": true,
    "interval": 45000,
    "messages": [
      {"text": "Discord Self-Bot", "type": "PLAYING"},
      {"text": "with Lunii", "type": "PLAYING"}
    ]
  },
  "messageLogger": {
    "enabled": true,
    "maxLogs": 500,
    "logDMs": true,
    "logGuilds": true
  },
  "antiGhostPing": {
    "enabled": true,
    "maxLogs": 50,
    "notifyOnDetection": true
  }
}
```

### Advanced Power User Setup
```json
{
  "ssl": {
    "rejectUnauthorized": false,
    "timeout": 30000,
    "secureProtocol": "TLSv1_2_method",
    "keepAlive": true,
    "maxSockets": 15
  },
  "giveaway": {
    "enabled": true,
    "keywords": [
      "🎉", "🎊", "🎁", "giveaway", "react", "win", "prize",
      "enter", "participate", "free", "contest", "drop",
      "nitro", "boost", "premium", "gift"
    ],
    "reactionEmojis": ["🎉", "🎊", "🎁", "✨", "🏆", "💎"],
    "channelWhitelist": [],
    "channelBlacklist": ["123456789012345678"],
    "minDelay": 1500,
    "maxDelay": 12000,
    "maxPerHour": 15,
    "verifiedBotsOnly": true,
    "requireKeywords": true
  },
  "afk": {
    "enabled": true,
    "timeout": 180000,
    "message": "I'm currently away from my computer. I'll respond when I return!",
    "aiEnabled": true,
    "aiPrompt": "You are a helpful assistant responding while the user is away. Be friendly, brief, and professional. Always mention the user is currently away.",
    "responseLimit": 5,
    "autoDetection": true
  },
  "statusAnimation": {
    "enabled": true,
    "interval": 30000,
    "messages": [
      {"text": "Managing Discord", "type": "PLAYING"},
      {"text": "server activities", "type": "WATCHING"},
      {"text": "lo-fi beats", "type": "LISTENING"},
      {"text": "Lunii Dashboard", "type": "PLAYING"},
      {"text": "your notifications", "type": "WATCHING"},
      {"text": "development streams", "type": "STREAMING", "url": "https://twitch.tv/coding"}
    ],
    "randomOrder": true,
    "smoothTransitions": true
  },
  "messageLogger": {
    "enabled": true,
    "maxLogs": 2000,
    "logDMs": true,
    "logGuilds": true,
    "logAttachments": true
  },
  "antiGhostPing": {
    "enabled": true,
    "maxLogs": 200,
    "notifyOnDetection": true
  },
  "ai": {
    "enabled": true,
    "rateLimit": 20,
    "rateLimitWindow": 60000
  },
  "performance": {
    "cacheSize": 2000,
    "cleanupInterval": 1800000,
    "memoryOptimization": true
  }
}
```

### Conservative/Stealth Setup
```json
{
  "ssl": {
    "rejectUnauthorized": false,
    "timeout": 45000,
    "secureProtocol": "TLSv1_2_method"
  },
  "giveaway": {
    "enabled": true,
    "keywords": ["🎉", "giveaway"],
    "reactionEmojis": ["🎉"],
    "minDelay": 8000,
    "maxDelay": 25000,
    "maxPerHour": 3,
    "verifiedBotsOnly": true,
    "requireKeywords": true
  },
  "afk": {
    "enabled": false
  },
  "statusAnimation": {
    "enabled": false
  },
  "messageLogger": {
    "enabled": true,
    "maxLogs": 200,
    "logDMs": false,
    "logGuilds": true,
    "logAttachments": false
  },
  "antiGhostPing": {
    "enabled": true,
    "maxLogs": 25,
    "notifyOnDetection": false
  },
  "security": {
    "rateLimitProtection": true,
    "suspiciousActivityDetection": true
  }
}
```

## Feature-Specific Examples

### Giveaway System Configurations

#### Server-Specific Giveaways
```json
{
  "giveaway": {
    "enabled": true,
    "channelWhitelist": [
      "123456789012345678",
      "987654321098765432",
      "456789012345678901"
    ],
    "keywords": ["🎉", "giveaway", "nitro", "boost"],
    "maxPerHour": 8,
    "minDelay": 3000,
    "maxDelay": 10000
  }
}
```

#### High-Volume Giveaway Setup
```json
{
  "giveaway": {
    "enabled": true,
    "keywords": [
      "🎉", "🎊", "🎁", "giveaway", "react", "win", "prize",
      "enter", "participate", "free", "contest", "drop",
      "nitro", "boost", "premium", "gift", "steam", "game"
    ],
    "reactionEmojis": ["🎉", "🎊", "🎁", "✨", "🏆", "💎", "🔥", "⭐"],
    "minDelay": 1000,
    "maxDelay": 6000,
    "maxPerHour": 25,
    "verifiedBotsOnly": false,
    "requireKeywords": false
  }
}
```

#### Selective Giveaway Joining
```json
{
  "giveaway": {
    "enabled": true,
    "keywords": ["nitro", "boost", "premium", "steam", "game"],
    "channelBlacklist": [
      "spam_channel_id",
      "test_channel_id"
    ],
    "minDelay": 5000,
    "maxDelay": 15000,
    "maxPerHour": 5,
    "verifiedBotsOnly": true,
    "requireKeywords": true
  }
}
```

### AFK System Configurations

#### Professional AFK Setup
```json
{
  "afk": {
    "enabled": true,
    "timeout": 600000,
    "message": "I'm currently in a meeting and will respond to messages when I return. For urgent matters, please contact my colleague @username.",
    "aiEnabled": true,
    "aiPrompt": "You are a professional assistant. The user is in a meeting. Be polite, brief, and direct urgent matters to colleagues. Always mention the user is currently unavailable.",
    "responseLimit": 3,
    "autoDetection": true
  }
}
```

#### Gaming AFK Setup
```json
{
  "afk": {
    "enabled": true,
    "timeout": 300000,
    "message": "I'm currently in-game and might not see messages immediately. I'll get back to you soon! 🎮",
    "aiEnabled": true,
    "aiPrompt": "You're responding for a gamer who is currently playing. Be casual and friendly. Mention they're gaming and will respond when they can.",
    "responseLimit": 4,
    "autoDetection": true
  }
}
```

#### Study/Work AFK Setup
```json
{
  "afk": {
    "enabled": true,
    "timeout": 900000,
    "message": "I'm currently studying/working and have notifications disabled. I'll check messages periodically. 📚",
    "aiEnabled": true,
    "aiPrompt": "The user is studying or working and needs to focus. Be supportive and understanding. Encourage patience and mention they'll respond when they take a break.",
    "responseLimit": 2,
    "autoDetection": true
  }
}
```

### Status Animation Examples

#### Developer Theme
```json
{
  "statusAnimation": {
    "enabled": true,
    "interval": 35000,
    "messages": [
      {"text": "with code", "type": "PLAYING"},
      {"text": "Stack Overflow", "type": "WATCHING"},
      {"text": "lo-fi programming", "type": "LISTENING"},
      {"text": "coding tutorials", "type": "STREAMING", "url": "https://twitch.tv/programming"},
      {"text": "debugging", "type": "PLAYING"},
      {"text": "GitHub commits", "type": "WATCHING"},
      {"text": "mechanical keyboards", "type": "LISTENING"}
    ],
    "randomOrder": false
  }
}
```

#### Gaming Theme
```json
{
  "statusAnimation": {
    "enabled": true,
    "interval": 40000,
    "messages": [
      {"text": "Valorant", "type": "PLAYING"},
      {"text": "Minecraft", "type": "PLAYING"},
      {"text": "gaming streams", "type": "WATCHING"},
      {"text": "epic gaming music", "type": "LISTENING"},
      {"text": "League of Legends", "type": "PLAYING"},
      {"text": "Twitch streams", "type": "STREAMING", "url": "https://twitch.tv/gaming"},
      {"text": "Discord with friends", "type": "PLAYING"}
    ],
    "randomOrder": true
  }
}
```

#### Music Theme
```json
{
  "statusAnimation": {
    "enabled": true,
    "interval": 25000,
    "messages": [
      {"text": "Spotify", "type": "LISTENING"},
      {"text": "lo-fi hip hop", "type": "LISTENING"},
      {"text": "music videos", "type": "WATCHING"},
      {"text": "live concerts", "type": "STREAMING", "url": "https://youtube.com/music"},
      {"text": "vinyl records", "type": "LISTENING"},
      {"text": "music production", "type": "PLAYING"},
      {"text": "SoundCloud", "type": "LISTENING"}
    ],
    "randomOrder": false
  }
}
```

#### Minimalist Theme
```json
{
  "statusAnimation": {
    "enabled": true,
    "interval": 60000,
    "messages": [
      {"text": "life", "type": "PLAYING"},
      {"text": "the world", "type": "WATCHING"},
      {"text": "silence", "type": "LISTENING"}
    ],
    "randomOrder": true
  }
}
```

## AI Integration Examples

### Gemini AI Prompts

#### Customer Support Style
```json
{
  "afk": {
    "aiPrompt": "You are a professional customer support representative responding while the user is away. Be helpful, polite, and provide useful information when possible. Always mention that the user will respond personally when they return."
  }
}
```

#### Casual Friend Style
```json
{
  "afk": {
    "aiPrompt": "You're responding for a friend who stepped away. Be casual, friendly, and conversational. Use a relaxed tone and maybe some light humor. Let people know your friend will be back soon."
  }
}
```

#### Technical Assistant Style
```json
{
  "afk": {
    "aiPrompt": "You are a technical assistant. The user is a developer/engineer who is currently away. Provide helpful technical information when appropriate, but always mention that detailed technical discussions should wait for the user's return."
  }
}
```

## Environment-Specific Configurations

### Home Setup
```json
{
  "giveaway": {
    "enabled": true,
    "maxPerHour": 10,
    "minDelay": 2000,
    "maxDelay": 8000
  },
  "afk": {
    "enabled": true,
    "timeout": 300000,
    "aiEnabled": true
  },
  "statusAnimation": {
    "enabled": true,
    "interval": 30000
  },
  "messageLogger": {
    "enabled": true,
    "logDMs": true,
    "logGuilds": true
  }
}
```

### Work/School Setup
```json
{
  "giveaway": {
    "enabled": false
  },
  "afk": {
    "enabled": true,
    "timeout": 600000,
    "message": "I'm currently working and will respond during my next break.",
    "responseLimit": 1
  },
  "statusAnimation": {
    "enabled": true,
    "messages": [
      {"text": "productivity apps", "type": "PLAYING"},
      {"text": "work documents", "type": "WATCHING"}
    ]
  },
  "messageLogger": {
    "enabled": true,
    "logDMs": false,
    "logGuilds": false
  }
}
```

### Public Computer Setup
```json
{
  "security": {
    "autoSaveToken": false,
    "encryptData": true
  },
  "giveaway": {
    "enabled": false
  },
  "afk": {
    "enabled": false
  },
  "messageLogger": {
    "enabled": false
  },
  "antiGhostPing": {
    "enabled": false
  }
}
```

## Performance Optimization Examples

### Low-End System
```json
{
  "performance": {
    "cacheSize": 200,
    "cleanupInterval": 1800000,
    "memoryOptimization": true
  },
  "messageLogger": {
    "maxLogs": 100
  },
  "antiGhostPing": {
    "maxLogs": 25
  },
  "statusAnimation": {
    "interval": 60000
  }
}
```

### High-End System
```json
{
  "performance": {
    "cacheSize": 5000,
    "cleanupInterval": 7200000,
    "memoryOptimization": false
  },
  "messageLogger": {
    "maxLogs": 5000,
    "logAttachments": true
  },
  "antiGhostPing": {
    "maxLogs": 500
  },
  "statusAnimation": {
    "interval": 15000
  }
}
```

## Security-Focused Examples

### Maximum Security
```json
{
  "security": {
    "autoSaveToken": false,
    "encryptData": true,
    "rateLimitProtection": true,
    "suspiciousActivityDetection": true
  },
  "giveaway": {
    "enabled": false
  },
  "messageLogger": {
    "enabled": false
  },
  "ai": {
    "enabled": false
  }
}
```

### Balanced Security
```json
{
  "security": {
    "autoSaveToken": true,
    "encryptData": true,
    "rateLimitProtection": true,
    "suspiciousActivityDetection": true
  },
  "giveaway": {
    "enabled": true,
    "maxPerHour": 5,
    "verifiedBotsOnly": true
  },
  "messageLogger": {
    "enabled": true,
    "maxLogs": 500
  }
}
```

These examples provide a comprehensive starting point for configuring Lunii based on different use cases and requirements. Adjust the values according to your specific needs and preferences.