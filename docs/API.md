# Lunii API Documentation

## Overview
This document covers the internal API structure of Lunii, including IPC communication, feature systems, and extension points.

## IPC Communication

### Authentication
```javascript
// Login with Discord token
const result = await window.electronAPI.invoke('login', token, saveToken);

// Logout
window.electronAPI.send('logout');
```

### User Data
```javascript
// Get current user data
const userData = await window.electronAPI.invoke('discord-get-user-data');

// Get bot statistics
const stats = await window.electronAPI.invoke('discord-get-stats');
```

### Configuration Management
```javascript
// Get full configuration
const config = await window.electronAPI.invoke('discord-get-config');

// Update configuration
await window.electronAPI.invoke('discord-update-config', {
  giveaway: { enabled: true }
});

// Update specific setting
await window.electronAPI.invoke('discord-update-setting', 'customStatus', 'New Status');
```

### Giveaway System
```javascript
// Update giveaway settings
await window.electronAPI.invoke('discord-set-giveaway-settings', {
  enabled: true,
  maxPerHour: 5,
  keywords: ['giveaway', '🎉']
});

// Get giveaway logs
const logs = await window.electronAPI.invoke('discord-get-giveaway-logs');
```

### AFK System
```javascript
// Configure AFK system
await window.electronAPI.invoke('discord-set-afk', {
  enabled: true,
  timeout: 300000,
  aiEnabled: true
});
```

### Status Animation
```javascript
// Configure status animation
await window.electronAPI.invoke('discord-set-status-animation', {
  enabled: true,
  interval: 30000,
  messages: [
    { text: 'Custom Status', type: 'PLAYING' }
  ]
});
```

### AI Integration
```javascript
// Setup Gemini AI
await window.electronAPI.invoke('discord-setup-gemini', 'your-api-key');

// Get AI assistance
const response = await window.electronAPI.invoke('discord-ai-assist', 'Your prompt here');
```

### Messaging
```javascript
// Send message
await window.electronAPI.invoke('discord-send-message', {
  channelId: '123456789',
  content: 'Hello World!',
  embed: null,
  tts: false
});
```

### Logging
```javascript
// Get message logs
const messageLogs = await window.electronAPI.invoke('discord-get-message-logs');

// Clear message logs
await window.electronAPI.invoke('discord-clear-message-logs');

// Get ghost ping logs
const ghostPings = await window.electronAPI.invoke('discord-get-ghost-ping-logs');

// Clear ghost ping logs
await window.electronAPI.invoke('discord-clear-ghost-ping-logs');
```

## Feature System Architecture

### Base Feature Class
```javascript
class BaseFeature {
  constructor(client, config, logger) {
    this.client = client;
    this.config = config;
    this.logger = logger;
    this.enabled = config.enabled;
  }

  isEnabled() {
    return this.enabled && this.config.enabled;
  }

  updateConfig(config) {
    this.config = config;
    this.enabled = config.enabled;
  }

  stop() {
    this.enabled = false;
  }
}
```

### Giveaway System API
```javascript
class GiveawaySystem extends BaseFeature {
  async handleMessage(message) {
    // Process potential giveaway message
  }

  async isGiveaway(message) {
    // Determine if message is a giveaway
  }

  async joinGiveaway(message) {
    // Join the giveaway
  }

  getLogs() {
    // Return giveaway logs
  }
}
```

### AFK System API
```javascript
class AFKSystem extends BaseFeature {
  startActivityMonitoring() {
    // Begin monitoring user activity
  }

  checkAFKStatus() {
    // Check if user should be marked AFK
  }

  setAFK(afk) {
    // Set AFK status
  }

  async sendAFKResponse(message) {
    // Send AFK auto-reply
  }
}
```

### Status Animation API
```javascript
class StatusAnimationSystem extends BaseFeature {
  startAnimation() {
    // Begin status rotation
  }

  async updateStatus() {
    // Update Discord status
  }

  getActivityType(type) {
    // Convert string type to Discord activity type
  }
}
```

## Event System

### Discord Events
```javascript
// Message events
client.on('messageCreate', (message) => {
  // Handle new messages
});

client.on('messageDelete', (message) => {
  // Handle deleted messages (ghost pings)
});

// Client events
client.on('ready', () => {
  // Bot is ready
});

client.on('error', (error) => {
  // Handle errors
});
```

### Custom Events
```javascript
// Notification system
client.emit('notification', {
  type: 'mention',
  title: 'New Mention',
  content: 'Message content',
  timestamp: Date.now()
});
```

## Data Structures

### User Data
```javascript
{
  id: 'string',
  username: 'string',
  discriminator: 'string',
  displayName: 'string',
  formattedName: 'string',
  avatar: 'string (URL)',
  badges: ['array of strings'],
  servers: 'number',
  friends: 'number'
}
```

### Server Data
```javascript
{
  id: 'string',
  name: 'string',
  icon: 'string (URL)',
  memberCount: 'number',
  owner: 'boolean'
}
```

### Message Log Entry
```javascript
{
  id: 'string',
  content: 'string',
  formattedContent: 'string',
  author: {
    id: 'string',
    name: 'string',
    avatar: 'string (URL)'
  },
  channel: {
    id: 'string',
    name: 'string'
  },
  guild: {
    id: 'string',
    name: 'string'
  } | null,
  timestamp: 'number',
  attachments: ['array of attachment objects']
}
```

### Giveaway Log Entry
```javascript
{
  id: 'string',
  messageId: 'string',
  channelId: 'string',
  channelName: 'string',
  guildId: 'string',
  guildName: 'string',
  authorId: 'string',
  authorName: 'string',
  content: 'string',
  emoji: 'string',
  timestamp: 'number'
}
```

### Notification Object
```javascript
{
  type: 'mention' | 'giveaway' | 'ghost-ping' | 'friend-request',
  title: 'string',
  content: 'string',
  author: 'string',
  guild: 'string',
  channel: 'string',
  timestamp: 'number'
}
```

## SSL Configuration API

### HTTPS Agent Creation
```javascript
const https = require('https');

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  secureProtocol: 'TLSv1_2_method',
  timeout: 30000,
  keepAlive: true,
  maxSockets: 10
});
```

### Axios Configuration
```javascript
const axios = require('axios');

axios.defaults.httpsAgent = httpsAgent;
axios.defaults.timeout = 30000;
```

## Error Handling

### Standard Error Response
```javascript
{
  success: false,
  error: 'Error message string'
}
```

### Success Response
```javascript
{
  success: true,
  data: 'any additional data'
}
```

### Logging Levels
- `error`: Critical errors that need attention
- `warn`: Warning messages for potential issues
- `info`: General information messages
- `debug`: Detailed debugging information

## Extension Points

### Custom Feature Development
```javascript
class CustomFeature extends BaseFeature {
  constructor(client, config, logger) {
    super(client, config, logger);
    this.setupCustomLogic();
  }

  setupCustomLogic() {
    // Initialize custom feature
  }

  async handleMessage(message) {
    if (!this.isEnabled()) return;
    // Custom message handling
  }
}
```

### Plugin Architecture
```javascript
// Register custom feature
discordClient.registerFeature('customFeature', CustomFeature);

// Access feature
const customFeature = discordClient.getFeature('customFeature');
```

## Rate Limiting

### Discord API Limits
- Global rate limit: 50 requests per second
- Per-route limits vary by endpoint
- Automatic retry with exponential backoff

### Internal Rate Limiting
```javascript
class RateLimiter {
  constructor(limit, window) {
    this.limit = limit;
    this.window = window;
    this.requests = [];
  }

  async checkLimit() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.window);
    
    if (this.requests.length >= this.limit) {
      throw new Error('Rate limit exceeded');
    }
    
    this.requests.push(now);
  }
}
```

## Security Considerations

### Token Handling
- Never log Discord tokens
- Store tokens securely
- Implement token rotation
- Monitor for token compromise

### SSL Security
- Certificate validation bypass only for Discord API
- Use TLS 1.2 minimum
- Implement proper timeout handling
- Monitor for SSL-related errors

### Data Protection
- Encrypt sensitive configuration data
- Implement secure storage
- Regular security audits
- User privacy protection

## Performance Optimization

### Memory Management
```javascript
// Implement cleanup intervals
setInterval(() => {
  this.cleanupOldLogs();
  this.clearExpiredCache();
}, this.config.performance.cleanupInterval);
```

### Caching Strategy
```javascript
class CacheManager {
  constructor(maxSize) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  get(key) {
    return this.cache.get(key);
  }
}
```

## Testing

### Unit Testing
```javascript
const { expect } = require('chai');
const GiveawaySystem = require('./giveaway-system');

describe('GiveawaySystem', () => {
  it('should detect giveaway messages', async () => {
    const system = new GiveawaySystem(mockClient, mockConfig, mockLogger);
    const isGiveaway = await system.isGiveaway(mockMessage);
    expect(isGiveaway).to.be.true;
  });
});
```

### Integration Testing
```javascript
describe('Discord Integration', () => {
  it('should handle SSL certificate issues', async () => {
    const client = new DiscordClient();
    const result = await client.login(testToken);
    expect(result.success).to.be.true;
  });
});
```

## Deployment

### Build Process
```bash
# Install dependencies
npm install

# Run tests
npm test

# Build application
npm run build

# Package for distribution
npm run dist
```

### Environment Variables
```bash
NODE_ENV=production
NODE_TLS_REJECT_UNAUTHORIZED=0
DISCORD_TOKEN=your_token_here
GEMINI_API_KEY=your_api_key_here
```

This API documentation provides a comprehensive overview of Lunii's internal architecture and extension points for developers who want to understand or extend the system.