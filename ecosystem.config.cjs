/**
 * PM2 Ecosystem Configuration — Super Reasoning API
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 start ecosystem.config.cjs --env production
 *
 * Setup auto-start on reboot:
 *   pm2 startup systemd
 *   pm2 save
 */

module.exports = {
  apps: [
    {
      name: 'super-reasoning-api',
      script: 'npx',
      args: 'tsx server/index.ts',
      cwd: '/opt/super-reasoning',
      interpreter: 'none',

      // Environment
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
        SR_API_PORT: 4000,
      },

      // Process management
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',

      // Restart policy
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/super-reasoning/error.log',
      out_file: '/var/log/super-reasoning/out.log',
      merge_logs: true,
      log_type: 'json',

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
