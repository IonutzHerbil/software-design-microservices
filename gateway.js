const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;
const MOVIE_SERVICE_URL = "http://localhost:3001";

app.use((req, _res, next) => {
  console.log(`[Gateway] ${req.method} ${req.path}`);
  next();
});

app.get("/movies", async (req, res) => {
  try {
    const response = await axios.get(`${MOVIE_SERVICE_URL}/movies`, {
      timeout: 5000,
      headers: { "x-request-id": Date.now().toString() },
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    const status = err.response?.status || 502;
    const message = err.response?.data || {
      error: "Movie Service unreachable",
    };
    console.error(`[Gateway] Upstream error (${status}):`, err.message);
    res.status(status).json(message);
  }
});

app.get("/health", async (_req, res) => {
  let movieServiceHealth = null;
  try {
    const r = await axios.get(`${MOVIE_SERVICE_URL}/health`, { timeout: 2000 });
    movieServiceHealth = r.data;
  } catch {
    movieServiceHealth = { status: "unreachable" };
  }
  res.json({
    service: "api-gateway",
    status: "ok",
    upstream: MOVIE_SERVICE_URL,
    movieService: movieServiceHealth,
  });
});
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(
    `API Gateway running on port ${PORT} → Movie Service at ${MOVIE_SERVICE_URL}`,
  );
});
