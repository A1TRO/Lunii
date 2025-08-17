# Lunii - Discord Bot Dashboard

## Features
A modern Electron-based Discord bot management dashboard that uses the official Discord REST API.
- **Official Discord API**: Uses Discord's official REST API with bot tokens (compliant with ToS)
- **Server Management**: View and manage Discord servers your bot is in
- **Message Sending**: Send messages and embeds through your bot
- **Command Builder**: Create and save custom bot commands
- **AI Integration**: Gemini AI assistance for command generation
- **Server Backup**: Backup server configurations and settings
- **Message Logging**: Track messages and interactions
- **Modern UI**: Clean, responsive interface with dark theme
## Setup
1. **Create a Discord Bot**:
   - Go to https://discord.com/developers/applications
   - Create a new application
   - Go to the "Bot" section and create a bot
   - Copy the bot token
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Run the Application**:
   ```bash
   npm start
   ```
4. **Login**:
   - Enter your Discord bot token
   - The application will authenticate with Discord's API
## Bot Permissions
Make sure your bot has the necessary permissions:
- Send Messages
- Read Message History
- Manage Messages (for advanced features)
- View Channels
- Use Slash Commands (if implementing slash commands)
## Security
- Bot tokens are stored locally and encrypted
- Uses official Discord API endpoints
- Compliant with Discord's Terms of Service
- No user token scraping or selfbot functionality
## Development
```bash
# Development mode
npm run dev
# Build for production
npm run build
```
## License
MIT License - see LICENSE file for details.