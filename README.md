# goHiking

FIT5120 monorepo for hiking safety platform.

## Repository Structure

```text
goHiking/
├── frontend/          # Frontend app (Vercel)
├── backend/           # Main backend API (Railway)
├── ai-service/        # AI recommendations / risk analysis (Railway)
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

## Services

- Frontend details: `frontend/README.md`
- Backend scaffold: `backend/README.md`
- AI service scaffold: `ai-service/README.md`
- Worker scaffold: `worker/README.md`
- Shared package notes: `shared/README.md`
