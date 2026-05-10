const express = require("express");
const app = express();

const PORT = process.env.PORT || 3002;
const CHAOS_MODE = process.env.CHAOS_MODE === "true";
const CHAOS_FAILURE_RATE = parseFloat(process.env.CHAOS_FAILURE_RATE ?? "0.3");
const CHAOS_MIN_JITTER = parseInt(process.env.CHAOS_MIN_JITTER ?? "3000", 10);
const CHAOS_MAX_JITTER = parseInt(process.env.CHAOS_MAX_JITTER ?? "10000", 10);

const ALL_IDS = [101, 102, 103, 104, 105, 106, 107, 108];

function getRandomRecommendations(count = 3) {
  return [...ALL_IDS].sort(() => Math.random() - 0.5).slice(0, count);
}

app.get("/recommendations", async (req, res) => {
  if (CHAOS_MODE) {
    if (Math.random() < CHAOS_FAILURE_RATE) {
      console.error(
        `[Chaos] Triggering 503 (failure rate: ${CHAOS_FAILURE_RATE})`,
      );
      return res.status(503).json({ error: "Service Unavailable" });
    }

    const jitter =
      Math.floor(Math.random() * (CHAOS_MAX_JITTER - CHAOS_MIN_JITTER + 1)) +
      CHAOS_MIN_JITTER;
    console.warn(
      `[Chaos] Latency spike: ${jitter}ms (range: ${CHAOS_MIN_JITTER}–${CHAOS_MAX_JITTER}ms)`,
    );
    await new Promise((resolve) => setTimeout(resolve, jitter));
  }

  const recommended_ids = getRandomRecommendations(3);
  res.json({ recommended_ids });
});

app.get("/health", (_req, res) => {
  res.json({
    service: "recommendation-service",
    status: "ok",
    chaos: {
      enabled: CHAOS_MODE,
      failureRate: CHAOS_FAILURE_RATE,
      jitterRangeMs: `${CHAOS_MIN_JITTER}–${CHAOS_MAX_JITTER}`,
    },
  });
});

app.listen(PORT, () => {
  console.log(`Recommendation Service on port ${PORT} | Chaos: ${CHAOS_MODE}`);
  if (CHAOS_MODE) {
    console.warn(`  failure rate : ${(CHAOS_FAILURE_RATE * 100).toFixed(0)}%`);
    console.warn(
      `  jitter range : ${CHAOS_MIN_JITTER}ms – ${CHAOS_MAX_JITTER}ms`,
    );
  }
});
