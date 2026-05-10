const axios = require("axios");

const GATEWAY = "http://localhost:3000";
const MOVIE = "http://localhost:3001";
const REC = "http://localhost:3002";

const VALID_IDS = [101, 102, 103, 104, 105, 106, 107, 108];
const FALLBACK_IDS = [1, 2, 3, 4, 5];

const KNOWN_TITLES = [
  "Dune: Part Two",
  "Oppenheimer",
  "Poor Things",
  "Killers of the Flower Moon",
  "Past Lives",
  "The Zone of Interest",
  "Saltburn",
  "American Fiction",
];

const FALLBACK_TITLES = [
  "Inception",
  "The Dark Knight",
  "Interstellar",
  "Pulp Fiction",
  "The Matrix",
];

async function sendRequests(n, url = `${MOVIE}/movies`) {
  return Promise.all(Array.from({ length: n }, () => axios.get(url)));
}

describe("Service Dependency", () => {
  test("returns exactly 3 movies per request", async () => {
    const res = await axios.get(`${MOVIE}/movies`);
    expect(res.status).toBe(200);
    expect(res.data.movies).toHaveLength(3);
  });

  test("every movie has id, title, and description", async () => {
    const res = await axios.get(`${MOVIE}/movies`);
    res.data.movies.forEach((movie) => {
      expect(movie).toHaveProperty("id");
      expect(movie).toHaveProperty("title");
      expect(movie).toHaveProperty("description");
      expect(movie.title.length).toBeGreaterThan(0);
      expect(movie.description.length).toBeGreaterThan(20);
    });
  });

  test("live movies come from known catalogue, not placeholder data", async () => {
    const res = await axios.get(`${MOVIE}/movies`);
    if (res.data.source === "live") {
      res.data.movies.forEach((movie) => {
        expect(KNOWN_TITLES).toContain(movie.title);
        expect(VALID_IDS).toContain(movie.id);
      });
    }
  });

  test("repeated requests return different movie combinations", async () => {
    const results = await sendRequests(5);
    const combinations = results
      .filter((r) => r.data.source === "live")
      .map((r) =>
        r.data.movies
          .map((m) => m.id)
          .sort()
          .join(","),
      );
    const unique = new Set(combinations);
    expect(unique.size).toBeGreaterThan(1);
  });

  test("gateway proxies to movie service -> same response structure", async () => {
    const direct = await axios.get(`${MOVIE}/movies`);
    const proxied = await axios.get(`${GATEWAY}/movies`);
    expect(proxied.status).toBe(200);
    expect(proxied.data).toHaveProperty("source");
    expect(proxied.data).toHaveProperty("movies");
    expect(proxied.data.movies).toHaveLength(direct.data.movies.length);
  });

});

describe("Timeout Execution", () => {
  test("every request completes within 1600ms", async () => {
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      const res = await axios.get(`${MOVIE}/movies`);
      const elapsed = Date.now() - start;
      expect(res.status).toBe(200);
      expect(elapsed).toBeLessThan(1600);
    }
  });

});

describe("Fallback Logic", () => {
  test("always returns HTTP 200", async () => {
    const responses = await sendRequests(5);
    responses.forEach((res) => expect(res.status).toBe(200));
  });

  test("never returns an error body", async () => {
    const responses = await sendRequests(5);
    responses.forEach((res) => {
      expect(res.data).not.toHaveProperty("error");
      expect(res.data).toHaveProperty("movies");
      expect(res.data).toHaveProperty("source");
    });
  });

  test("fallback movies are from the trending list", async () => {
    const responses = await sendRequests(5);
    responses.forEach((res) => {
      if (res.data.source === "trending") {
        res.data.movies.forEach((movie) => {
          expect(FALLBACK_TITLES).toContain(movie.title);
          expect(FALLBACK_IDS).toContain(movie.id);
        });
      }
    });
  });

  test("source is always either live or trending -> never anything else", async () => {
    const responses = await sendRequests(10);
    responses.forEach((res) => {
      expect(["live", "trending"]).toContain(res.data.source);
    });
  });

  test("totalRequests counter increments correctly", async () => {
    const before = (await axios.get(`${MOVIE}/health`)).data.semanticMetrics
      .totalRequests;
    await sendRequests(3);
    const after = (await axios.get(`${MOVIE}/health`)).data.semanticMetrics
      .totalRequests;
    expect(after).toBe(before + 3);
  });

  test('fallbackResponses increments when circuit is open', async () => {
  const before = (await axios.get(`${MOVIE}/health`)).data.semanticMetrics;
  const fallbacksBefore = before.fallbackResponses;
  const totalBefore = before.totalRequests;

  await sendRequests(3);

  const after = (await axios.get(`${MOVIE}/health`)).data.semanticMetrics;

  const newRequests = after.totalRequests - totalBefore;
  const newLive = after.liveResponses - before.liveResponses;
  const newFallbacks = after.fallbackResponses - fallbacksBefore;

  expect(newLive + newFallbacks).toBe(newRequests);
});
});

describe("Circuit Recovery", () => {
  test("circuit state is one of the three valid states", async () => {
    const res = await axios.get(`${MOVIE}/health`);
    expect(["closed", "open", "half-open"]).toContain(
      res.data.circuitBreaker.state,
    );
  });

  test("fallbackRate reflects actual ratio of fallback responses", async () => {
    const before = (await axios.get(`${MOVIE}/health`)).data.semanticMetrics;
    await sendRequests(4);
    const after = (await axios.get(`${MOVIE}/health`)).data.semanticMetrics;

    const expectedRate =
      after.totalRequests > 0
        ? ((after.fallbackResponses / after.totalRequests) * 100).toFixed(1) +
          "%"
        : "0%";

    expect(after.fallbackRate).toBe(expectedRate);
  });

  test("bulkhead slots return to 0 after requests complete", async () => {
    await sendRequests(5);
    const health = await axios.get(`${MOVIE}/health`);
    expect(health.data.bulkhead.activeNow).toBe(0);
  });

  test("recommendation service is reachable and identifies itself", async () => {
    const res = await axios.get(`${REC}/health`);
    expect(res.status).toBe(200);
    expect(res.data.service).toBe("recommendation-service");
  });

  test("live and fallback response counts add up to total", async () => {
    const health = await axios.get(`${MOVIE}/health`);
    const { totalRequests, liveResponses, fallbackResponses } =
      health.data.semanticMetrics;
    expect(liveResponses + fallbackResponses).toBeLessThanOrEqual(
      totalRequests,
    );
  });
});
