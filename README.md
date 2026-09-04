# iWDC-1

A monorepo containing a Next.js frontend and a FastAPI backend for AI features (OCR, embedding, RAG).

## Directory structure

```
iWDC-1/
├── web/                    ← Next.js
│   ├── app/                # App Router
│   ├── components/         # Shared UI components
│   ├── public/
│   ├── package.json
│   └── ...
├── ai/                     ← FastAPI
│   ├── app/
│   │   ├── main.py         # FastAPI entry point
│   │   ├── config.py       # Settings loaded from environment variables
│   │   ├── routers/        # Endpoints
│   │   ├── services/       # OCR, embedding and RAG logic
│   │   ├── db/             # PostgreSQL and ChromaDB connections
│   │   └── schemas/        # Request / response models
│   ├── requirements.txt
│   └── Dockerfile
├── docs/
└── README.md
```

## Prerequisites

- [Node.js](https://nodejs.org) 20.9.0 or later (verified on v24.15.0)
- npm (bundled with Node.js; this repository is managed with `package-lock.json`)
- Python 3.12 or later (to run `ai/`)
- Git

```bash
node -v
npm -v
python3 --version
```

## Setup

```bash
git clone https://github.com/Seigo2058/iWDC-1.git
cd iWDC-1
```

### web (Next.js)

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Edit `web/app/page.tsx` and the page updates automatically.

| Command         | Description                                            |
| --------------- | ------------------------------------------------------ |
| `npm run dev`   | Start the development server                            |
| `npm run build` | Create a production build                               |
| `npm run start` | Serve the production build (run `npm run build` first)  |
| `npm run lint`  | Check the code with ESLint                              |

### ai (FastAPI)

```bash
cd ai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # Set the database connection and other values
uvicorn app.main:app --reload
```

Swagger UI is at [http://localhost:8000/docs](http://localhost:8000/docs); `GET /health` is a quick connectivity check.

To run it with Docker:

```bash
cd ai
docker build -t iwdc-ai .
docker run --rm -p 8000:8000 --env-file .env iwdc-ai
```

#### Implementation status

The endpoints and wiring are in place, but the following are still unimplemented pending
technology choices, and raise `NotImplementedError` when called:

- `app/services/ocr.py` — no OCR engine chosen yet
- `embed()` in `app/services/embedding.py` — no embedding model chosen yet
- `generate_answer()` in `app/services/rag.py` — generation model call not implemented

## Troubleshooting

- **Port 3000 is already in use**: specify another port, e.g. `npm run dev -- -p 3001`.
- **Dependency installation fails**: try a clean install with `rm -rf node_modules && npm install`.
- **Stale build output**: remove the build cache with `rm -rf .next` and run the command again.
