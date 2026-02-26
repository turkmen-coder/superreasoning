187.77.34.104
# VPS Deployment Guide for Super Reasoning

**Operations Runbook (deploy + SSL + rollback + incident):** [deploy/OPS-RUNBOOK.md](deploy/OPS-RUNBOOK.md)

## Quick Deploy (Interactive)

```bash
# 1. Build the Docker image
docker build -t super-reasoning .

# 2. Run the container
docker run -d -p 4000:4000 --env-file .env --name super-reasoning super-reasoning
```

## Production Deploy with Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "4000:4000"
    env_file:
      - .env
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

```bash
# Deploy with compose
docker-compose up -d --build
```

## Server Requirements

- **OS:** Ubuntu 22.04+ / Debian 11+
- **RAM:** 4GB+ (8GB recommended)
- **Ports:** 4000 (API), 80/443 (optional reverse proxy)

## Nginx Reverse Proxy (Optional)

```nginx
server {
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Environment Variables Required

Create `.env` file:
```env
VITE_API_BASE_URL=/api/v1
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
# Add other required env vars
```

## Update & Restart

```bash
# Pull latest & redeploy
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```
