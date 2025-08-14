const { GoogleGenerativeAI } = require('@google/generative-ai');
const safeEval = require('safe-eval');
const acorn = require('acorn');
const EventEmitter = require('events');
const logger = require('../utils/logger');
const { AIServiceError, RateLimitError } = require('../utils/errors');
const { models } = require('../database/models');
const config = require('../config');

/**
 * AI Service for Gemini integration with code generation and safety
 */
class AIService extends EventEmitter {
  constructor() {
    super();
    this.genAI = null;
    this.model = null;
    this.isEnabled = config.ai.enabled;
    this.rateLimits = new Map(); // userId -> { count, resetTime }
    this.maxRequestsPerMinute = config.ai.rateLimit;
    this.rateWindowMs = config.ai.rateWindow;
    
    if (this.isEnabled && config.ai.apiKey) {
      this.initialize();
    }
  }

  /**
   * Initialize Gemini AI
   */
  initialize() {
    try {
      this.genAI = new GoogleGenerativeAI(config.ai.apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      });
      
      logger.info('Gemini AI initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Gemini AI:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Check rate limits for user
   */
  checkRateLimit(userId) {
    const now = Date.now();
    const userLimit = this.rateLimits.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or create new rate limit window
      this.rateLimits.set(userId, {
        count: 1,
        resetTime: now + this.rateWindowMs
      });
      return true;
    }

    if (userLimit.count >= this.maxRequestsPerMinute) {
      const timeLeft = Math.ceil((userLimit.resetTime - now) / 1000);
      throw new RateLimitError(
        `AI rate limit exceeded. Try again in ${timeLeft} seconds.`,
        timeLeft
      );
    }

    userLimit.count++;
    return true;
  }

  /**
   * Generate Discord command code using AI
   */
  async generateCommand(userId, prompt, options = {}) {
    if (!this.isEnabled) {
      return this.getFallbackCommand(prompt);
    }

    // Check rate limits
    this.checkRateLimit(userId);

    const startTime = Date.now();
    let tokensUsed = 0;
    let success = false;
    let response = null;
    let error = null;

    try {
      const enhancedPrompt = this.buildCommandPrompt(prompt, options);
      
      logger.debug('Generating command with AI:', {
        userId,
        promptLength: enhancedPrompt.length,
        options
      });

      const result = await this.model.generateContent(enhancedPrompt);
      response = await result.response;
      const generatedCode = response.text();
      
      // Validate and sanitize the generated code
      const sanitizedCode = await this.sanitizeCode(generatedCode);
      
      tokensUsed = this.estimateTokens(enhancedPrompt + generatedCode);
      success = true;

      // Log usage
      await this.logUsage(userId, 'generate_command', prompt, generatedCode, {
        tokensUsed,
        duration: Date.now() - startTime,
        success,
        options
      });

      return {
        success: true,
        code: sanitizedCode,
        rawCode: generatedCode,
        metadata: {
          tokensUsed,
          duration: Date.now() - startTime,
          model: 'gemini-1.5-flash'
        }
      };

    } catch (err) {
      error = err;
      logger.error('AI command generation failed:', {
        userId,
        error: err.message,
        duration: Date.now() - startTime
      });

      // Log failed usage
      await this.logUsage(userId, 'generate_command', prompt, null, {
        tokensUsed,
        duration: Date.now() - startTime,
        success: false,
        error: err.message,
        options
      });

      // Return fallback
      return this.getFallbackCommand(prompt);
    }
  }

  /**
   * Build enhanced prompt for command generation
   */
  buildCommandPrompt(userPrompt, options) {
    const systemPrompt = `You are an expert Discord.js developer. Generate a complete, functional Discord slash command based on the user's request.

REQUIREMENTS:
- Use discord.js-selfbot-v13 syntax
- Include proper error handling
- Add input validation
- Use modern JavaScript (ES2022)
- Include JSDoc comments
- Follow the exact structure shown below

COMMAND STRUCTURE:
\`\`\`javascript
const { SlashCommandBuilder } = require('discord.js-selfbot-v13');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('commandname')
    .setDescription('Command description'),
  
  cooldown: 5, // seconds
  category: 'utility',
  permissions: [], // optional permissions array
  
  async execute(interaction) {
    try {
      // Command logic here
      await interaction.reply('Response message');
    } catch (error) {
      console.error('Command error:', error);
      await interaction.reply({ content: 'An error occurred!', ephemeral: true });
    }
  }
};
\`\`\`

SECURITY RULES:
- Never include file system operations
- No network requests to external APIs
- No eval() or similar dangerous functions
- No access to process or require beyond discord.js
- Validate all user inputs

USER REQUEST: ${userPrompt}

Generate ONLY the JavaScript code, no explanations:`;

    return systemPrompt;
  }

  /**
   * Sanitize generated code for security
   */
  async sanitizeCode(code) {
    try {
      // Extract JavaScript code from markdown if present
      const codeMatch = code.match(/```(?:javascript|js)?\n?([\s\S]*?)\n?```/);
      const cleanCode = codeMatch ? codeMatch[1] : code;

      // Parse AST to validate syntax and check for dangerous patterns
      const ast = acorn.parse(cleanCode, {
        ecmaVersion: 2022,
        sourceType: 'module'
      });

      // Check for dangerous patterns
      this.validateAST(ast);

      // Test compilation in safe environment
      const testContext = {
        require: (module) => {
          const allowedModules = ['discord.js-selfbot-v13'];
          if (!allowedModules.includes(module)) {
            throw new Error(`Module '${module}' not allowed`);
          }
          return {};
        },
        module: { exports: {} },
        console: { log: () => {}, error: () => {} }
      };

      safeEval(cleanCode, testContext);

      return cleanCode;

    } catch (error) {
      logger.warn('Code sanitization failed:', error.message);
      throw new AIServiceError(`Generated code failed security validation: ${error.message}`);
    }
  }

  /**
   * Validate AST for dangerous patterns
   */
  validateAST(ast) {
    const dangerousPatterns = [
      'eval',
      'Function',
      'setTimeout',
      'setInterval',
      'process',
      'child_process',
      'fs',
      'path',
      'os',
      'crypto',
      'http',
      'https',
      'net',
      'dgram',
      'dns'
    ];

    const walk = (node) => {
      if (!node) return;

      // Check for dangerous identifiers
      if (node.type === 'Identifier' && dangerousPatterns.includes(node.name)) {
        throw new Error(`Dangerous identifier detected: ${node.name}`);
      }

      // Check for require calls
      if (node.type === 'CallExpression' && 
          node.callee.name === 'require' &&
          node.arguments[0] &&
          node.arguments[0].type === 'Literal') {
        const moduleName = node.arguments[0].value;
        if (!moduleName.startsWith('discord.js')) {
          throw new Error(`Unauthorized module require: ${moduleName}`);
        }
      }

      // Recursively check child nodes
      for (const key in node) {
        if (key === 'parent') continue;
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(walk);
        } else if (child && typeof child === 'object') {
          walk(child);
        }
      }
    };

    walk(ast);
  }

  /**
   * Get fallback command when AI is unavailable
   */
  getFallbackCommand(prompt) {
    const commandName = this.extractCommandName(prompt) || 'mycommand';
    
    const fallbackCode = `const { SlashCommandBuilder } = require('discord.js-selfbot-v13');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('${commandName}')
    .setDescription('Generated command: ${prompt.substring(0, 100)}'),
  
  cooldown: 5,
  category: 'generated',
  
  async execute(interaction) {
    try {
      await interaction.reply({
        content: 'This is a generated command. Please customize the functionality.',
        ephemeral: true
      });
    } catch (error) {
      console.error('Command error:', error);
      await interaction.reply({ 
        content: 'An error occurred while executing this command!', 
        ephemeral: true 
      });
    }
  }
};`;

    return {
      success: true,
      code: fallbackCode,
      rawCode: fallbackCode,
      metadata: {
        source: 'fallback',
        reason: 'AI service unavailable'
      }
    };
  }

  /**
   * Extract command name from prompt
   */
  extractCommandName(prompt) {
    const matches = prompt.match(/(?:command|cmd)\s+(?:called|named)\s+(\w+)/i) ||
                   prompt.match(/create\s+(?:a\s+)?(\w+)\s+command/i) ||
                   prompt.match(/(\w+)\s+command/i);
    
    return matches ? matches[1].toLowerCase() : null;
  }

  /**
   * Estimate token usage (rough approximation)
   */
  estimateTokens(text) {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Log AI usage for monitoring and billing
   */
  async logUsage(userId, operation, prompt, response, metadata) {
    try {
      await models.AIUsage.create({
        userId,
        service: 'gemini',
        operation,
        prompt: prompt.substring(0, 1000), // Limit prompt length
        response: response ? response.substring(0, 2000) : null,
        tokensUsed: metadata.tokensUsed || 0,
        cost: this.calculateCost(metadata.tokensUsed || 0),
        duration: metadata.duration,
        success: metadata.success,
        errorMessage: metadata.error || null,
        metadata: {
          model: metadata.model || 'gemini-1.5-flash',
          options: metadata.options || {},
          source: metadata.source || 'ai'
        }
      });
    } catch (error) {
      logger.error('Failed to log AI usage:', error);
    }
  }

  /**
   * Calculate estimated cost (placeholder - adjust based on actual pricing)
   */
  calculateCost(tokens) {
    // Gemini pricing example: $0.00015 per 1K tokens
    return (tokens / 1000) * 0.00015;
  }

  /**
   * Get AI usage statistics for user
   */
  async getUserUsageStats(userId, timeframe = '24h') {
    const timeframeMappings = {
      '1h': 1 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const timeframeMs = timeframeMappings[timeframe] || timeframeMappings['24h'];
    const since = new Date(Date.now() - timeframeMs);

    const stats = await models.AIUsage.findAll({
      where: {
        userId,
        createdAt: {
          [models.Sequelize.Op.gte]: since
        }
      },
      attributes: [
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'totalRequests'],
        [models.sequelize.fn('SUM', models.sequelize.col('tokensUsed')), 'totalTokens'],
        [models.sequelize.fn('SUM', models.sequelize.col('cost')), 'totalCost'],
        [models.sequelize.fn('AVG', models.sequelize.col('duration')), 'avgDuration'],
        [models.sequelize.fn('COUNT', models.sequelize.literal("CASE WHEN success = true THEN 1 END")), 'successfulRequests']
      ],
      raw: true
    });

    return stats[0] || {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      avgDuration: 0,
      successfulRequests: 0
    };
  }

  /**
   * Chat with AI (general purpose)
   */
  async chat(userId, message, context = {}) {
    if (!this.isEnabled) {
      return {
        success: false,
        response: 'AI service is currently unavailable. Please try again later.',
        metadata: { source: 'fallback' }
      };
    }

    this.checkRateLimit(userId);

    const startTime = Date.now();
    let success = false;
    let response = null;

    try {
      const chatPrompt = `You are a helpful Discord bot assistant. Respond to the user's message in a friendly and informative way. Keep responses concise and relevant.

Context: ${JSON.stringify(context)}
User message: ${message}

Response:`;

      const result = await this.model.generateContent(chatPrompt);
      response = await result.response;
      const responseText = response.text();
      
      success = true;

      await this.logUsage(userId, 'chat', message, responseText, {
        tokensUsed: this.estimateTokens(chatPrompt + responseText),
        duration: Date.now() - startTime,
        success,
        context
      });

      return {
        success: true,
        response: responseText,
        metadata: {
          tokensUsed: this.estimateTokens(chatPrompt + responseText),
          duration: Date.now() - startTime,
          model: 'gemini-1.5-flash'
        }
      };

    } catch (error) {
      logger.error('AI chat failed:', { userId, error: error.message });

      await this.logUsage(userId, 'chat', message, null, {
        duration: Date.now() - startTime,
        success: false,
        error: error.message,
        context
      });

      return {
        success: false,
        response: 'I apologize, but I encountered an error processing your request. Please try again later.',
        metadata: { source: 'fallback', error: error.message }
      };
    }
  }

  /**
   * Analyze content for moderation
   */
  async analyzeContent(userId, content, type = 'message') {
    if (!this.isEnabled) {
      return { safe: true, confidence: 0, reason: 'AI service unavailable' };
    }

    try {
      const analysisPrompt = `Analyze the following ${type} content for potential policy violations, spam, or harmful content. Respond with a JSON object containing:
- safe: boolean (true if content is safe)
- confidence: number (0-1, confidence in the assessment)
- reason: string (brief explanation)
- categories: array of detected issue categories

Content to analyze: "${content}"

Response (JSON only):`;

      const result = await this.model.generateContent(analysisPrompt);
      const response = await result.response;
      const analysisText = response.text();

      // Parse JSON response
      const analysis = JSON.parse(analysisText);

      await this.logUsage(userId, 'analyze', content.substring(0, 200), analysisText, {
        tokensUsed: this.estimateTokens(analysisPrompt + analysisText),
        duration: Date.now() - Date.now(),
        success: true,
        contentType: type
      });

      return analysis;

    } catch (error) {
      logger.error('Content analysis failed:', error);
      return { safe: true, confidence: 0, reason: 'Analysis failed' };
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      enabled: this.isEnabled,
      model: this.model ? 'gemini-1.5-flash' : null,
      rateLimit: {
        maxRequestsPerMinute: this.maxRequestsPerMinute,
        windowMs: this.rateWindowMs
      },
      activeUsers: this.rateLimits.size
    };
  }

  /**
   * Clear rate limits (admin function)
   */
  clearRateLimits(userId = null) {
    if (userId) {
      this.rateLimits.delete(userId);
    } else {
      this.rateLimits.clear();
    }
  }
}

module.exports = AIService;