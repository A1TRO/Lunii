const { Sequelize } = require('sequelize');
const config = require('../../config');
const logger = require('../../utils/logger');

// Initialize Sequelize
const sequelize = new Sequelize(config.database.url, {
  dialect: config.database.dialect,
  storage: config.database.storage,
  logging: config.database.logging ? logger.debug.bind(logger) : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  retry: {
    match: [
      /SQLITE_BUSY/,
      /SQLITE_LOCKED/,
      /database is locked/,
      /connection timeout/
    ],
    max: 3
  }
});

// Import models
const User = require('./User')(sequelize);
const Server = require('./Server')(sequelize);
const Command = require('./Command')(sequelize);
const Backup = require('./Backup')(sequelize);
const ActivityLog = require('./ActivityLog')(sequelize);
const AIUsage = require('./AIUsage')(sequelize);
const UserSettings = require('./UserSettings')(sequelize);
const ServerSettings = require('./ServerSettings')(sequelize);

// Define associations
User.hasMany(Command, { foreignKey: 'userId', as: 'commands' });
Command.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Backup, { foreignKey: 'userId', as: 'backups' });
Backup.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Server.hasMany(Backup, { foreignKey: 'serverId', as: 'backups' });
Backup.belongsTo(Server, { foreignKey: 'serverId', as: 'server' });

User.hasMany(ActivityLog, { foreignKey: 'userId', as: 'activities' });
ActivityLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(AIUsage, { foreignKey: 'userId', as: 'aiUsage' });
AIUsage.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(UserSettings, { foreignKey: 'userId', as: 'settings' });
UserSettings.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Server.hasOne(ServerSettings, { foreignKey: 'serverId', as: 'settings' });
ServerSettings.belongsTo(Server, { foreignKey: 'serverId', as: 'server' });

// Database connection test
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    return true;
  } catch (error) {
    logger.error('Unable to connect to database:', error);
    return false;
  }
};

// Database synchronization
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    logger.info(`Database synchronized ${force ? '(forced)' : ''}`);
    return true;
  } catch (error) {
    logger.error('Database synchronization failed:', error);
    return false;
  }
};

// Graceful shutdown
const closeConnection = async () => {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

module.exports = {
  sequelize,
  models: {
    User,
    Server,
    Command,
    Backup,
    ActivityLog,
    AIUsage,
    UserSettings,
    ServerSettings
  },
  testConnection,
  syncDatabase,
  closeConnection
};