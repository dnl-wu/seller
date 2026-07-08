# Seller

A web-based conversational selling agent. A seller describes an item in chat; the
backend extracts structured attributes, deterministically checks for missing
required fields, and once complete, generates a title, description, and
suggested price for the seller to review and approve.

## Architectural rules

- MongoDB is the source of truth.
- The LLM never controls workflow state — required-field checks and state
  transitions are deterministic logic on the server.
- Item facts (`shared`'s `ItemAttributes`) are stored separately from the raw
  conversation message log.
- The frontend renders backend state; it does not compute workflow state
  itself.

## Workspace layout

- `client/` — React + Vite + TypeScript frontend
- `server/` — Node.js + Express + TypeScript backend
- `shared/` — Zod schemas and inferred TypeScript types used by both

## Setup

Requires Node.js 20+ and npm 10+.

```sh
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Fill in `server/.env` with a MongoDB connection string and an OpenAI API key
as those integrations land (not required yet — the current scaffold only
exposes a health check).

## Scripts (run from the repo root)

```sh
npm run dev         # builds shared, then runs server + client concurrently
npm run build        # builds shared, server, and client for production
npm run typecheck    # type-checks all workspaces
npm run test          # runs tests in all workspaces (none yet)
```

`client` runs on http://localhost:5173, `server` on http://localhost:4000.
The client's landing page pings `GET /api/health` to confirm it can reach the
backend.

## Status

This is the initial scaffold: workspace wiring, shared domain contracts
(`ConversationState`, `MessageRole`, `ItemAttributes`, `ListingDraft`,
conversation-creation request/response schemas), a bare Express app with a
health endpoint, and a minimal client page. No MongoDB models, FSM, or LLM
calls yet — those come next.
