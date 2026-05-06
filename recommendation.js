const express = require('express');
const app = express();

const PORT = process.env.PORT || 3002;
const CHAOS_MODE = process.env.CHAOS_MODE === 'true';

app.get('/recommendations', async (req, res) => {
    if (CHAOS_MODE) {
        if (Math.random() < 0.3) {
            console.error('[Chaos] Triggering 503 Service Unavailable');
            return res.status(503).json({ error: 'Service Unavailable' });
        }

        const jitter = Math.floor(Math.random() * (10000 - 3000 + 1)) + 3000;
        console.warn(`[Chaos] Triggering latency spike of ${jitter}ms`);
        if (CHAOS_MODE) {
        if (Math.random() < 0.3) {
            console.error('[Chaos] Triggering 503 Service Unavailable');
            return res.status(503).json({ error: 'Service Unavailable' });
        }
        await new Promise(resolve => setTimeout(resolve, jitter));
    }
    }
    res.json({ recommended_ids: [101, 102, 103] });
});

app.listen(PORT, () => {
    console.log(`Recommendation Service running on port ${PORT} | Chaos Mode: ${CHAOS_MODE}`);
});