const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserSettings = sequelize.define('UserSettings', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    // Auto Giveaway Settings
    autoGiveaway: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    giveawayKeywords: {
      type: DataTypes.JSON,
      defaultValue: ['free', 'giveaway', 'nitro', 'gift', 'win']
    },
    giveawayDelay: {
      type: DataTypes.JSON,
      defaultValue: { min: 1000, max: 10000 }
    },
    giveawayWhitelist: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    giveawayBlacklist: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    
    // AFK Settings
    afkEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    afkMessage: {
      type: DataTypes.TEXT,
      defaultValue: "I'm currently AFK. I'll get back to you soon!"
    },
    afkStartTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    afkCooldown: {
      type: DataTypes.INTEGER,
      defaultValue: 3600000 // 1 hour in milliseconds
    },
    afkResponseType: {
      type: DataTypes.ENUM('mentions', 'dms', 'both'),
      defaultValue: 'mentions'
    },
    
    // Status Animation Settings
    statusAnimation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    statusMessages: {
      type: DataTypes.JSON,
      defaultValue: [
        { text: 'with Discord API', type: 'PLAYING' },
        { text: 'your messages', type: 'WATCHING' },
        { text: 'to your commands', type: 'LISTENING' }
      ]
    },
    statusInterval: {
      type: DataTypes.INTEGER,
      defaultValue: 30000 // 30 seconds
    },
    statusTransition: {
      type: DataTypes.INTEGER,
      defaultValue: 3000 // 3 seconds
    },
    
    // Notification Settings
    notifications: {
      type: DataTypes.JSON,
      defaultValue: {
        mentions: true,
        dms: true,
        giveaways: true,
        ghostPings: true,
        friendRequests: true
      }
    },
    
    // Privacy Settings
    privacy: {
      type: DataTypes.JSON,
      defaultValue: {
        showOnlineStatus: true,
        allowDMs: true,
        logMessages: true,
        shareUsageStats: false
      }
    },
    
    // Theme Settings
    theme: {
      type: DataTypes.JSON,
      defaultValue: {
        mode: 'dark',
        accentColor: '#4F46E5',
        fontSize: 'medium',
        compactMode: false
      }
    },
    
    // Rate Limiting
    rateLimits: {
      type: DataTypes.JSON,
      defaultValue: {
        commands: { count: 0, resetTime: null },
        ai: { count: 0, resetTime: null },
        api: { count: 0, resetTime: null }
      }
    }
  }, {
    tableName: 'user_settings',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['autoGiveaway']
      },
      {
        fields: ['afkEnabled']
      },
      {
        fields: ['statusAnimation']
      }
    ]
  });

  return UserSettings;
};