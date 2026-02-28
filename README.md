# AI Roundtable

An interactive application that orchestrates structured deliberation among multiple AI models. Pose a question, pick your models, and watch them debate, vote, and try to reach consensus in real time.

## How It Works

1. **Setup** — Define a question, voting options, and select which AI models participate
2. **Debate rounds** — Each round, all models argue their position and cast a vote. They can see prior arguments and change their minds
3. **Consensus** — Rounds continue until a configurable threshold is met (majority, supermajority, or unanimous) or the max rounds are reached
4. **Transcript** — Every round's reasoning, vote changes, and summaries are captured and can be downloaded as Markdown

The frontend visualizes models as a roundtable, with live updates via SSE as models respond.

## Architecture

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Express + TypeScript
- **LLM integration**: Pluggable `LLMClient` interface — the default implementation uses [Opper](https://opper.ai), but you can swap in any provider by implementing the interface in `backend/src/llm-client.ts`

## Running Locally

```bash
# Install dependencies
npm install

# Set your API key
cp .env.example .env
# Edit .env with your OPPER_API_KEY

# Start both frontend and backend in dev mode
npm run dev -w backend &
npm run dev -w frontend
```

The frontend runs on `http://localhost:5173` and proxies API calls to the backend on port 3001.
