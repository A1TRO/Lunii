const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ActivityLog = sequelize.define('ActivityLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100]
      }
    },
    category: {
      type: DataTypes.ENUM(
        'command',
        'message',
        'server',
        'user',
        'backup',
        'clone',
        'ai',
        'system',
        'security'
      ),
      allowNull: false
    },
    severity: {
      type: DataTypes.ENUM('info', 'warn', 'error', 'critical'),
      defaultValue: 'info'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    serverId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    channelId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    messageId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    correlationId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration in milliseconds'
    },
    success: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'activity_logs',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['action']
      },
      {
        fields: ['category']
      },
      {
        fields: ['severity']
      },
      {
        fields: ['serverId']
      },
      {
        fields: ['channelId']
      },
      {
        fields: ['correlationId']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['success']
      }
    ]
  });

  return ActivityLog;
};