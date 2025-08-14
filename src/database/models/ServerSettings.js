const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ServerSettings = sequelize.define('ServerSettings', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    serverId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      references: {
        model: 'servers',
        key: 'id'
      }
    },
    
    // Auto Moderation Settings
    autoModeration: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    moderationRules: {
      type: DataTypes.JSON,
      defaultValue: {
        spam: { enabled: false, threshold: 5, action: 'warn' },
        caps: { enabled: false, threshold: 70, action: 'warn' },
        links: { enabled: false, whitelist: [], action: 'delete' },
        mentions: { enabled: false, threshold: 5, action: 'warn' }
      }
    },
    
    // Logging Settings
    logging: {
      type: DataTypes.JSON,
      defaultValue: {
        messages: true,
        edits: true,
        deletions: true,
        joins: true,
        leaves: true,
        bans: true,
        kicks: true,
        roleChanges: true,
        channelChanges: true
      }
    },
    logChannel: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    // Welcome Settings
    welcomeEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    welcomeChannel: {
      type: DataTypes.STRING,
      allowNull: true
    },
    welcomeMessage: {
      type: DataTypes.TEXT,
      defaultValue: 'Welcome to the server, {user}!'
    },
    welcomeRole: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    // Auto Role Settings
    autoRole: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    autoRoleId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    autoRoleDelay: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    // Command Settings
    commandPrefix: {
      type: DataTypes.STRING,
      defaultValue: '!',
      validate: {
        len: [1, 5]
      }
    },
    disabledCommands: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    commandCooldowns: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    
    // Permission Settings
    permissions: {
      type: DataTypes.JSON,
      defaultValue: {
        adminRoles: [],
        modRoles: [],
        restrictedChannels: [],
        allowedChannels: []
      }
    },
    
    // Backup Settings
    autoBackup: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    backupInterval: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
      defaultValue: 'weekly'
    },
    backupRetention: {
      type: DataTypes.INTEGER,
      defaultValue: 30
    },
    backupTypes: {
      type: DataTypes.JSON,
      defaultValue: {
        channels: true,
        roles: true,
        emojis: true,
        webhooks: true,
        settings: true,
        members: false
      }
    },
    
    // Anti-Raid Settings
    antiRaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    raidProtection: {
      type: DataTypes.JSON,
      defaultValue: {
        joinThreshold: 10,
        timeWindow: 60000,
        action: 'kick',
        lockdown: false
      }
    },
    
    // Custom Settings
    customSettings: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'server_settings',
    timestamps: true,
    indexes: [
      {
        fields: ['serverId']
      },
      {
        fields: ['autoModeration']
      },
      {
        fields: ['welcomeEnabled']
      },
      {
        fields: ['autoRole']
      },
      {
        fields: ['autoBackup']
      }
    ]
  });

  return ServerSettings;
};