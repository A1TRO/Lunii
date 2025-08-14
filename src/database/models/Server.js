const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Server = sequelize.define('Server', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      comment: 'Discord guild ID'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100]
      }
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true
    },
    splash: {
      type: DataTypes.STRING,
      allowNull: true
    },
    discoverySplash: {
      type: DataTypes.STRING,
      allowNull: true
    },
    ownerId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    permissions: {
      type: DataTypes.STRING,
      allowNull: true
    },
    region: {
      type: DataTypes.STRING,
      allowNull: true
    },
    afkChannelId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    afkTimeout: {
      type: DataTypes.INTEGER,
      defaultValue: 300
    },
    widgetEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    widgetChannelId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    verificationLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    defaultMessageNotifications: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    explicitContentFilter: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    mfaLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    applicationId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    systemChannelId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    systemChannelFlags: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    rulesChannelId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    vanityUrlCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    banner: {
      type: DataTypes.STRING,
      allowNull: true
    },
    premiumTier: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    premiumSubscriptionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    preferredLocale: {
      type: DataTypes.STRING,
      defaultValue: 'en-US'
    },
    publicUpdatesChannelId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    maxVideoChannelUsers: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    approximateMemberCount: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    approximatePresenceCount: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    nsfwLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    premiumProgressBarEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'servers',
    timestamps: true,
    indexes: [
      {
        fields: ['name']
      },
      {
        fields: ['ownerId']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['lastUpdated']
      }
    ]
  });

  return Server;
};