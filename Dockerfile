# Super Reasoning — Production image (API + frontend)
# Build: docker build -t super-reasoning .
# Run:  docker run -p 4000:4000 --env-file .env super-reasoning

FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --legacy-peer-deps
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_KEY
ARG VITE_API_BASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_KEY=$VITE_API_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --omit=dev --legacy-peer-deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/types ./types
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/services ./services
COPY --from=builder /app/utils ./utils
COPY --from=builder /app/data ./data
COPY --from=builder /app/contexts ./contexts
COPY --from=builder /app/locales.ts ./
COPY --from=builder /app/types.ts ./
COPY --from=builder /app/tsconfig.json ./
RUN npm install tsx --save-dev --legacy-peer-deps

ENV NODE_ENV=production
ENV SR_API_PORT=4000
EXPOSE 4000

CMD ["npx", "tsx", "server/index.ts"]
