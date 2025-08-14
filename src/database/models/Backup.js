const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Backup = sequelize.define('Backup', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    serverId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'servers',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0
    },
    checksum: {
      type: DataTypes.STRING,
      allowNull: false
    },
    compressionType: {
      type: DataTypes.ENUM('none', 'gzip', 'zip'),
      defaultValue: 'gzip'
    },
    backupType: {
      type: DataTypes.ENUM('full', 'incremental', 'differential'),
      defaultValue: 'full'
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'failed', 'deleted'),
      defaultValue: 'pending'
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    includedData: {
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
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'backups',
    timestamps: true,
    indexes: [
      {
        fields: ['serverId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['backupType']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['expiresAt']
      }
    ]
  });

  return Backup;
};