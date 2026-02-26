const { WebClient } = require('@slack/web-api');
const axios = require('axios');

// Configuration
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SUPER_REASONING_API_URL = process.env.SUPER_REASONING_API_URL || 'http://localhost:4000';
const SUPER_REASONING_API_KEY = process.env.SUPER_REASONING_API_KEY;

// Initialize Slack app
const slackClient = new WebClient(SLACK_BOT_TOKEN);

// Store active sessions
const activeSessions = new Map();

class SuperReasoningSlackBot {
  constructor() {
    this.commands = {
      generate: this.generatePrompt.bind(this),
      collaborate: this.startCollaboration.bind(this),
      analytics: this.showAnalytics.bind(this),
      evolve: this.startEvolution.bind(this),
      help: this.showHelp.bind(this),
      status: this.showStatus.bind(this)
    };
  }

  async generatePrompt(message, say) {
    try {
      await say('🤖 Generating prompt...');

      const response = await axios.post(`${SUPER_REASONING_API_URL}/v1/generate`, {
        intent: message.text,
        framework: 'AUTO',
        provider: 'auto',
        language: 'en'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': SUPER_REASONING_API_KEY
        }
      });

      const { masterPrompt, reasoning, framework, provider } = response.data;

      // Format response for Slack
      const formattedResponse = this.formatPromptResponse({
        masterPrompt,
        reasoning,
        framework,
        provider
      });

      // Send as a file for better readability
      await say({
        text: '✅ *Prompt Generated Successfully!*',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: formattedResponse
            }
          }
        ]
      });

    } catch (error) {
      console.error('Error generating prompt:', error);
      await say('❌ Failed to generate prompt. Please try again later.');
    }
  }

  async startCollaboration(message, say) {
    const sessionId = this.generateSessionId();
    const user = message.user;
    
    activeSessions.set(sessionId, {
      user,
      participants: [user],
      startTime: new Date()
    });

    const joinUrl = `${SUPER_REASONING_API_URL}/collaboration?sessionId=${sessionId}`;
    
    await say({
      text: `🤝 *Collaboration Session Started*`,
      blocks: [
        {
          type: 'section',
          text: `Hey <@${user}>! I've started a real-time collaboration session for you.`,
          fields: [
            {
              title: 'Session ID',
              value: sessionId,
              short: true
            },
            {
              title: 'Join URL',
              value: joinUrl,
              short: false
            }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: 'Join Session',
              url: joinUrl
            }
          ]
        }
      ]
    });
  }

  async showAnalytics(message, say) {
    try {
      const response = await axios.get(`${SUPER_REASONING_API_URL}/v1/analytics`, {
        headers: {
          'x-api-key': SUPER_REASONING_API_KEY
        }
      });

      const analytics = response.data;
      
      await say({
        text: '📊 *Analytics Dashboard*',
        blocks: [
          {
            type: 'section',
            text: 'Here are your recent analytics:',
            fields: [
              {
                title: 'Total Prompts',
                value: analytics.totalPrompts?.toLocaleString() || 'N/A',
                short: true
              },
              {
                title: 'Average Quality Score',
                value: analytics.avgQuality?.toFixed(2) || 'N/A',
                short: true
              },
              {
                title: 'Total Cost',
                value: `$${analytics.totalCost?.toFixed(2) || 'N/A'}`,
                short: true
              },
              {
                title: 'Active Users',
                value: analytics.activeUsers?.toLocaleString() || 'N/A',
                short: true
              }
            ]
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: 'View Full Analytics',
                url: `${SUPER_REASONING_API_URL}/analytics`
              }
            ]
          }
        ]
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      await say('❌ Failed to fetch analytics. Please try again later.');
    }
  }

  async startEvolution(message, say) {
    const sessionId = this.generateSessionId();
    
    await say({
      text: '🧬 *Prompt Evolution Engine*',
      blocks: [
        {
          type: 'section',
          text: `Starting AI-powered prompt evolution session...`,
          fields: [
            {
              title: 'Session ID',
              value: sessionId,
              short: true
            }
          ]
        },
        {
          type: 'section',
          text: 'Please provide your initial prompt to begin the evolution process. The engine will automatically generate and optimize multiple generations to find the best possible prompt.',
          accessory: {
            type: 'button',
            text: 'Open Evolution Engine',
            url: `${SUPER_REASONING_API_URL}/evolution`
          }
        }
      ]
    });
  }

  async showHelp(message, say) {
    await say({
      text: '🤖 *Super Reasoning Bot Commands*',
      blocks: [
        {
          type: 'section',
          text: 'Available commands:',
          fields: [
            {
              title: '📝 Generate Prompt',
              value: '/generate <your intent>',
              short: true
            },
            {
              title: '🤝 Start Collaboration',
              value: '/collaborate',
              short: true
            },
            {
              title: '📊 Show Analytics',
              value: '/analytics',
              short: true
            },
            {
              title: '🧬 Start Evolution',
              value: '/evolve',
              short: true
            },
            {
              title: '❓ Show Help',
              value: '/help',
              short: true
            },
            {
              title: '📈 Show Status',
              value: '/status',
              short: true
            }
          ]
        },
        {
          type: 'section',
          text: '💡 *Tips:*',
          fields: [
            {
              title: 'Quick Generate',
              value: 'Just type your intent after the command',
              short: true
            },
            {
              title: 'Framework Options',
              value: 'Use /generate with framework: KERNEL, CO_STAR, RISEN, etc.',
              short: true
            },
            {
              title: 'Provider Options',
              value: 'Use /generate with provider: groq, claude, openai, etc.',
              short: true
            }
          ]
        }
      ]
    });
  }

  async showStatus(message, say) {
    try {
      const response = await axios.get(`${SUPER_REASONING_API_URL}/v1/health`);
      
      await say({
        text: '🟢 *System Status*',
        blocks: [
          {
            type: 'section',
            fields: [
              {
                title: 'API Status',
                value: '✅ Online',
                short: true
              },
              {
                title: 'Response Time',
                value: `${response.data.responseTime || '< 100ms'}`,
                short: true
              },
              {
                title: 'Active Sessions',
                value: activeSessions.size.toString(),
                short: true
              }
            ]
          }
        ]
      });

    } catch (error) {
      await say('❌ System is currently unavailable. Please try again later.');
    }
  }

  formatPromptResponse(data) {
    const { masterPrompt, reasoning, framework, provider } = data;
    
    return `*Framework:* ${framework}\n*Provider:* ${provider}\n\n*Reasoning:*\n${reasoning.slice(0, 200)}${reasoning.length > 200 ? '...' : ''}\n\n*Master Prompt:*\n\`\`\`${masterPrompt.slice(0, 500)}${masterPrompt.length > 500 ? '...' : ''}\`\`\`\n\n---\n*Generated by Super Reasoning*`;
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async handleMessage(event) {
    const { text, user, channel, ts } = event;
    
    // Ignore bot messages
    if (event.bot_id) return;

    // Parse command
    const [command, ...args] = text.toLowerCase().split(' ');
    
    if (this.commands[command]) {
      await this.commands[command]({ text, user, channel, ts, args }, (msg) => {
        if (typeof msg === 'string') {
          this.slackClient.chat.postMessage({
            channel: channel.id,
            text: msg
          });
        } else {
          this.slackClient.chat.postMessage(msg);
        }
      });
    } else {
      // Unknown command, try to generate prompt
      await this.generatePrompt({ text, user, channel, ts }, (msg) => {
        this.slackClient.chat.postMessage({
          channel: channel.id,
          text: msg
        });
      });
    }
  }
}

// Initialize bot
const bot = new SuperReasoningSlackBot();

module.exports = {
  handleMessage: bot.handleMessage.bind(bot),
  commands: bot.commands
};
