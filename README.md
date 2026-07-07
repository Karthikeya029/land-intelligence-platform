# AI Land Intelligence Platform

This project now contains only the files needed for the AI land advisor experience.

## What it does

- Collects buyer intent, budget, commute, loan preference, holding period, and land type
- Sends the buyer profile to the backend
- Searches the backend land inventory before calling AI
- Scores available lands by budget, type, purpose, commute, growth, infrastructure, liquidity, and risk
- Uses OpenAI only to explain retrieved database results when an API key is configured
- Falls back to database-ranked recommendations when OpenAI is not configured
- Returns investment score, available listings, demand drivers, risk level, and next checks

## RAG-style flow

```text
User questionnaire
  -> Express backend
  -> Land inventory retrieval
  -> Deterministic scoring
  -> AI explanation over retrieved listings only
  -> Area recommendations with matching property IDs
```

The current inventory lives in `server/src/data/landListings.json`. Replace that file-backed repository with PostgreSQL, MongoDB, real estate APIs, GIS feeds, HMDA data, or uploaded agent listings when the product grows. The frontend does not store place names.

## Run the project

Frontend:

```bash
cd "/Users/karthikeya/Downloads/build land project"
npm install
npm run dev
```

Backend:

```bash
cd "/Users/karthikeya/Downloads/build land project/server"
npm install
npm start
```

## Required backend env

Update `server/.env` with:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` optional
- `HOST` optional, defaults to `127.0.0.1`

The app still works without `OPENAI_API_KEY`; it returns database-ranked recommendations instead of AI-written explanations.

## Main files

- `src/pages/Home.jsx`
- `src/lib/api.js`
- `server/src/routes/landAdvisorRoutes.js`
- `server/src/controllers/landAdvisorController.js`
- `server/src/services/landAdvisorService.js`
- `server/src/services/landInventoryService.js`
- `server/src/data/landListings.json`
