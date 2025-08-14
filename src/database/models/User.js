const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      comment: 'Discord user ID'
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 32]
      }
    },
    discriminator: {
      type: DataTypes.STRING(4),
      allowNull: true,
      validate: {
        is: /^\d{4}$/
      }
    },
    globalName: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [1, 32]
      }
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bot: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    system: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    mfaEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    flags: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    premiumType: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    publicFlags: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastSeen: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    indexes: [
      {
        fields: ['username']
      },
      {
        fields: ['lastSeen']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  return User;
};