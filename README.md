# Super Reasoning

Deterministic AI Engineering Platform -- build high-quality master prompts using 7 strategic frameworks including KERNEL, CO-STAR, and RISEN (PEA-2026 + MPA v2.2 + SP-A1 + S).

## Overview

Super Reasoning is a full-stack SaaS platform that treats prompts as code. It lets you version, optimize, and CI/CD-integrate your prompts through a unified API. The platform supports multiple LLM providers (Groq, Gemini, Hugging Face, Claude, OpenRouter, DeepSeek, OpenAI) and provides tooling for prompt engineering at scale.

### Key Features

- **Multi-provider prompt generation** -- route requests across Groq, Gemini, Claude, OpenAI, OpenRouter, DeepSeek, and Hugging Face
- **Prompt-as-Code API** -- version, store, and manage prompts with full CRUD and history tracking
- **Genetic algorithm optimization** -- evolve prompts using tournament selection, crossover, and mutation
- **IR (Intermediate Representation) pipeline** -- extract structured intent from raw prompts and compile back to optimized text
- **Standards compliance dashboard** -- real-time monitoring for WCAG 2.1 AA, OWASP Top 10, Core Web Vitals, and GDPR
- **Multi-tenant architecture** -- organization-based isolation with role-based access (owner/admin/member)
- **BYOK (Bring Your Own Key)** -- users can supply their own API keys for any supported provider
- **Semantic caching** -- vector-similarity-based cache to reduce redundant LLM calls
- **RAG pipeline** -- pgvector-powered retrieval-augmented generation with hybrid search
- **Judge ensemble** -- multi-model evaluation and scoring of generated prompts
- **A/B testing** -- run controlled experiments across prompt variants
- **Prompt linting** -- static analysis to catch injection risks, ambiguity, and anti-patterns
- **OpenTelemetry tracing** -- distributed tracing and observability out of the box
- **Stripe payment integration** -- subscription management with free/pro/team plans
- **i18n support** -- Turkish and English localization
- **VS Code extension** -- prompt snippets and tooling directly in your editor

## Architecture

```
Client (Vite/React)  -->  CDN (Vercel/Netlify)  -->  Express API (:4000)
                                                        |
                                          +-------------+-------------+
                                          |             |             |
                                     Auth/RBAC    Rate Limit    Generate Adapter
                                                                     |
                                                    +--------+-------+--------+
                                                    |        |       |        |
                                                  Groq    Gemini  Claude  OpenRouter ...
                                                    
PostgreSQL (Supabase) <-- Prompt Store / pgvector / RLS
```

For detailed architecture diagrams, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick Start

### Prerequisites

- Node.js >= 18
- PostgreSQL (or a Supabase instance)
- At least one LLM provider API key

### Installation

```bash
# Clone the repository
git clone https://github.com/turkmen-coder/superreasoning.git
cd superreasoning

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the project root. Minimal example:

```env
# LLM Provider keys (at least one required)
VITE_GROQ_API_KEY=your-groq-key
GEMINI_API_KEY=your-gemini-key
ANTHROPIC_API_KEY=your-anthropic-key
OPENROUTER_API_KEY=your-openrouter-key
VITE_HUGGING_FACE_HUB_TOKEN=your-hf-token

# API authentication
API_KEYS=your-api-key-here

# Database (optional -- falls back to file store)
DATABASE_URL=postgresql://user:pass@localhost:5432/superreasoning
SR_USE_DB_STORE=true
SR_DEFAULT_ORG_ID=<org-uuid>
```

See [docs/KURULUM.md](docs/KURULUM.md) for the full list of environment variables and setup instructions.

### Database Setup

```bash
# Apply schema
psql -U user -d superreasoning -f server/db/schema.sql
psql -U user -d superreasoning -f server/db/schema-rls.sql

# Or use the automated setup script
npm run db:setup

# Seed default organization
npm run db:seed
```

### Running

```bash
# Start the API server
npm run api

# Start the frontend dev server
npm run dev

# Or run both concurrently
npm run dev:all
```

The API runs on `http://localhost:4000` and the frontend on `http://localhost:5173` by default.

## API

The API follows REST conventions under `/v1` (aliased as `/api/v1`). Authentication is via `x-api-key` header.

Key endpoints:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/auth/validate` | Validate API key |
| POST | `/v1/generate` | Generate a master prompt |
| GET | `/v1/prompts` | List stored prompts |
| POST | `/v1/prompts` | Create a prompt |
| PUT | `/v1/prompts/:id` | Update a prompt |
| DELETE | `/v1/prompts/:id` | Delete a prompt |

Full API specification is available in [openapi.yaml](openapi.yaml).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run api` | Start Express API server |
| `npm run dev:all` | Run frontend + API concurrently |
| `npm run build` | Production build |
| `npm run test` | Run tests (Vitest, watch mode) |
| `npm run test:run` | Run tests once |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run format` | Prettier format |
| `npm run typecheck` | TypeScript type check |
| `npm run db:setup` | Automated database setup |
| `npm run db:seed` | Seed default organization |
| `npm run import:all-datasets` | Import all prompt datasets |
| `npm run regression` | Run prompt regression tests |

## Project Structure

```
superreasoning/
  src/                  # React frontend (Vite + Tailwind)
  server/               # Express API backend
    db/                 # Schema, migrations, RLS policies
    lib/                # Core libraries (embeddings, vector store, enrichment, compilers)
    routes/             # API route handlers
    store/              # Prompt storage layer (file + DB)
    scripts/            # CLI scripts (import, migrate, seed)
  services/             # Shared business logic (providers, optimizer, genetic, RAG, etc.)
  components/           # Shared UI components
  tests/                # Test suites (unit, API security, compliance, performance)
  docs/                 # Architecture, setup, and roadmap documentation
  extensions/           # VS Code extension
  integrations/         # Slack bot and other integrations
  sdk/                  # TypeScript client SDK
  sk-service/           # Python RAG pipeline (Semantic Kernel)
  prompts/              # Prompt template files
  deploy/               # Deployment configs
```

## Testing

```bash
# Run all tests
npm run test:run

# Run tests in watch mode
npm run test

# Run with UI
npx vitest --ui
```

Tests cover prompt linting, semantic caching, contract validation, i18n, IR extraction, budget optimization, security, and standards compliance.

## Documentation

Detailed documentation lives in the [docs/](docs/) directory:

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) -- system architecture and diagrams
- [KURULUM.md](docs/KURULUM.md) -- full setup guide
- [MULTI_TENANCY_AND_KEYS.md](docs/MULTI_TENANCY_AND_KEYS.md) -- multi-tenant design and key management
- [PAYMENT_INTEGRATION.md](docs/PAYMENT_INTEGRATION.md) -- Stripe/iyzico payment setup
- [SECURITY_TEST_PLAN.md](docs/SECURITY_TEST_PLAN.md) -- security testing plan
- [IR_PIPELINE.md](docs/IR_PIPELINE.md) -- intermediate representation pipeline
- [OPTIMIZATION_ARCHITECTURE.md](docs/OPTIMIZATION_ARCHITECTURE.md) -- prompt optimization architecture
- [ROADMAP_V32.md](docs/ROADMAP_V32.md) -- version 3.2 roadmap

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Express 5, TypeScript, tsx
- **Database**: PostgreSQL, Supabase, pgvector
- **LLM Providers**: Groq, Gemini, Claude, OpenAI, OpenRouter, DeepSeek, Hugging Face
- **Testing**: Vitest, Supertest
- **Observability**: OpenTelemetry
- **Payments**: Stripe
- **Validation**: Zod
- **Linting**: ESLint, Prettier

## License

Proprietary. See [openapi.yaml](openapi.yaml) for license information.
