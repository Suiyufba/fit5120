# HikeShield

FIT5120 monorepo for hiking safety platform.

## Repository Structure

```text
hikeshield/
├── frontend/          # Frontend app (Vercel)
├── backend/           # Main backend API (Railway)
├── ai-service/        # AI recommendations / risk analysis (Railway)
├── llama-server/      # GGUF inference service via llama.cpp (Railway)
├── worker/            # Async jobs (optional)
├── shared/            # Shared types / helpers (optional)
├── docs/              # UML / report assets
├── .env.example
├── README.md
└── package.json       # Monorepo workspace scripts
```

## Quick Start

```bash
npm install
npm run dev:frontend
```

For the local route intro microservice:

```bash
npm run dev:ai-service
```

## Services

- Frontend details: `frontend/README.md`
- Backend scaffold: `backend/README.md`
- AI service scaffold: `ai-service/README.md`
- GGUF inference service: `llama-server/README.md`
- Worker scaffold: `worker/README.md`
- Shared package notes: `shared/README.md`
