const express = require("express");
const app = express();

const PORT = process.env.PORT || 3002;
const CHAOS_MODE = process.env.CHAOS_MODE === "true";

const ALL_IDS = [101, 102, 103, 104, 105, 106, 107, 108];

function getRandomRecommendations(count = 3) {
  return [...ALL_IDS].sort(() => Math.random() - 0.5).slice(0, count);
}

app.get("/recommendations", async (req, res) => {
  if (CHAOS_MODE) {
    if (Math.random() < 0.3) {
      console.error("[Chaos] Triggering 503 Service Unavailable");
      return res.status(503).json({ error: "Service Unavailable" });
    }

    const jitter = Math.floor(Math.random() * (10000 - 3000 + 1)) + 3000;
    console.warn(`[Chaos] Triggering latency spike of ${jitter}ms`);
    await new Promise((resolve) => setTimeout(resolve, jitter));
  }

  const recommended_ids = getRandomRecommendations(3);
  res.json({ recommended_ids });
});

app.get("/health", (_req, res) => {
  res.json({
    service: "recommendation-service",
    status: "ok",
    chaosMode: CHAOS_MODE,
  });
});

app.listen(PORT, () => {
  console.log(
    `Recommendation Service running on port ${PORT} | Chaos Mode: ${CHAOS_MODE}`,
  );
});
