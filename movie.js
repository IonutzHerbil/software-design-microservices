const express = require('express');
const axios = require('axios');
const circuitBreaker = require('opossum');

const app = express();
const PORT = process.env.PORT || 3001;
const RECOMMENDATION_SERVICE_URL = 'http://localhost:3002/recommendations';

const MOVIE_DB = {
  101: { id: 101, title: 'Dune: Part Two',            description: 'Paul Atreides unites with the Fremen on Arrakis to wage war against House Harkonnen.' },
  102: { id: 102, title: 'Oppenheimer',                description: 'The story of J. Robert Oppenheimer and the invention of the atomic bomb.' },
  103: { id: 103, title: 'Poor Things',                description: 'The fantastical evolution of Bella Baxter, brought back to life by a brilliant scientist.' },
  104: { id: 104, title: 'Killers of the Flower Moon', description: 'Members of the Osage Nation are murdered under mysterious circumstances in 1920s Oklahoma.' },
  105: { id: 105, title: 'Past Lives',                 description: 'Two childhood sweethearts are separated, then reunite in New York decades later.' },
  106: { id: 106, title: 'The Zone of Interest',       description: 'The commandant of Auschwitz and his wife build a life right beside the camp.' },
  107: { id: 107, title: 'Saltburn',                   description: 'A student becomes fascinated by his charming classmate and enters his aristocratic world.' },
  108: { id: 108, title: 'American Fiction',           description: 'A novelist frustrated by racial stereotypes in publishing writes a parody that becomes a bestseller.' },
};

const FALLBACK_MOVIES = [
  { id: 1, title: 'Inception',       description: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task.' },
  { id: 2, title: 'The Dark Knight', description: 'Batman raises the stakes in his war on crime with the emergence of the Joker.' },
  { id: 3, title: 'Interstellar',    description: 'A team of explorers travel through a wormhole in search of a new home for humanity.' },
  { id: 4, title: 'Pulp Fiction',    description: 'The lives of two mob hitmen, a boxer, and a pair of bandits intertwine in four tales.' },
  { id: 5, title: 'The Matrix',      description: 'A programmer discovers that reality is a simulation and joins a rebellion against its controllers.' },
];

async function fetchRecommendations() {
  const response = await axios.get(RECOMMENDATION_SERVICE_URL, { timeout: 1500 });
  const ids = response.data.recommended_ids;
  const movies = ids.map(id => MOVIE_DB[id] || { id, title: `Movie ${id}`, description: 'No description available.' });
  return { source: 'live', movies };
}

const breakerOptions = {
  timeout: 1500,                 
  errorThresholdPercentage: 50,
  resetTimeout: 10000,
  volumeThreshold: 2,          
};

const breaker = new circuitBreaker(fetchRecommendations, breakerOptions);
breaker.fallback(() => ({ source: 'trending', movies: FALLBACK_MOVIES })); 

breaker.on('open',     () => console.warn('[CB] OPEN -> serving fallback'));
breaker.on('halfOpen', () => console.info('[CB] HALF-OPEN -> probing service'));
breaker.on('close',    () => console.info('[CB] CLOSED -> service recovered'));
breaker.on('fallback', () => console.warn('[CB] Fallback -> returning trending movies'));
breaker.on('timeout',  () => console.warn('[CB] Timeout -> exceeded 1500ms'));
breaker.on('reject',   () => console.warn('[CB] Rejected -> circuit is open'));

app.get('/movies', async (req, res) => {
  try {
    const result = await breaker.fire();
    res.json(result);
  } catch (err) {
    console.error('[Movie Service] Uncaught:', err.message);
    res.json({ source: 'trending', movies: FALLBACK_MOVIES });
  }
});

app.get('/health', (_req, res) => {
  const state = breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed';
  res.json({
    service: 'movie-service',
    status: 'ok',
    circuitBreaker: { state },
  });
});

app.listen(PORT, () => console.log(`Movie Service running on port ${PORT}`));