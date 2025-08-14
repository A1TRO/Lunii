const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AIUsage = sequelize.define('AIUsage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    service: {
      type: DataTypes.ENUM('gemini', 'openai', 'claude'),
      defaultValue: 'gemini'
    },
    operation: {
      type: DataTypes.ENUM('generate_command', 'chat', 'analyze', 'moderate'),
      allowNull: false
    },
    prompt: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    response: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tokensUsed: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    cost: {
      type: DataTypes.DECIMAL(10, 6),
      defaultValue: 0.0
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Duration in milliseconds'
    },
    success: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'ai_usage',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['service']
      },
      {
        fields: ['operation']
      },
      {
        fields: ['success']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['userId', 'createdAt']
      }
    ]
  });

  return AIUsage;
};