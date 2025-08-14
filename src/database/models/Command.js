const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Command = sequelize.define('Command', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 32],
        is: /^[\w-]{1,32}$/
      }
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100]
      }
    },
    type: {
      type: DataTypes.ENUM('slash', 'user', 'message'),
      defaultValue: 'slash'
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [1, 50]
      }
    },
    options: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    permissions: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    cooldown: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      validate: {
        min: 0,
        max: 300
      }
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    guildOnly: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    ownerOnly: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    nsfw: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    code: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    aiGenerated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastUsed: {
      type: DataTypes.DATE,
      allowNull: true
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'commands',
    timestamps: true,
    indexes: [
      {
        fields: ['name']
      },
      {
        fields: ['type']
      },
      {
        fields: ['category']
      },
      {
        fields: ['enabled']
      },
      {
        fields: ['userId']
      },
      {
        unique: true,
        fields: ['name', 'userId']
      }
    ]
  });

  return Command;
};