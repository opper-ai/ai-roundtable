# AI Roundtable

An interactive application that orchestrates structured deliberation among multiple AI models. Pose a question, pick your models, and watch them debate, vote, and try to reach consensus in real time.

## How It Works

**Roundtable Discussion** — A multi-round debate where AI models argue positions and try to convince each other:

1. **Blind Round** — Each model answers independently, unaware of the other participants
2. **Informed Debate** — Models see all prior responses. They can change their mind, counter arguments, and address other models by name
3. **Final Round** (optional) — One last chance to make their case before consensus is checked

Consensus is reached when enough models agree — configurable as majority (50%), supermajority (67%), or unanimous (100%).

**Expert Panel** — Each model gives a single independent answer. No deliberation, no influence — just diverse perspectives side by side.

## Architecture

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Express + TypeScript
- **LLM integration**: All models called via the [Opper](https://opper.ai) platform with structured output (JSON schema)

## Getting Started

### Prerequisites

- Node.js 18+
- An [Opper](https://opper.ai) API key

### Setup

```bash
git clone https://github.com/opper-ai/ai-roundtable.git
cd ai-roundtable
npm install
```

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Then edit `.env` and add your Opper API key:

```
OPPER_API_KEY=your-api-key-here
```

### Run

```bash
# Start both frontend and backend in dev mode
npm run dev -w backend &
npm run dev -w frontend
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

The frontend proxies API calls to the backend automatically.

### Run with Docker

```bash
docker compose up --build
```

Same ports — frontend on http://localhost:5173, backend on http://localhost:3001. The `.env` file is picked up automatically.

## License

MIT
