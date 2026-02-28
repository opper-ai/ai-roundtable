import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { OpperClient } from "./clients/opper.js";
import { createSessionsRouter } from "./routes/sessions.js";
import { createSSERouter } from "./routes/sse.js";
import { enableRunLogging } from "./run-logger.js";

const PORT = process.env.PORT ?? 3001;

if (process.argv.includes("--log-runs") || process.env.LOG_RUNS === "true") {
  enableRunLogging();
}
const apiKey = process.env.OPPER_API_KEY;

if (!apiKey) {
  console.error("OPPER_API_KEY is required in .env");
  process.exit(1);
}

const client = new OpperClient(apiKey);

const app = express();
app.use(cors());
app.use(express.json());

app.use(createSessionsRouter(client));
app.use(createSSERouter());

// Serve frontend static files in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`AI Roundtable backend running on http://localhost:${PORT}`);
});
