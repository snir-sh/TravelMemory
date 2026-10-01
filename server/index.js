const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Proxy endpoint for Nominatim reverse geocoding
 * Gets polygon boundaries for a location
 */
app.get('/api/nominatim/reverse', async (req, res) => {
  try {
    const { lat, lon, zoom = 10 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing lat or lon parameters' });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=${zoom}&polygon_geojson=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TravelMemory-App (https://github.com/snir-sh/TravelMemory)',
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Nominatim reverse geocoding error:', error);
    res.status(500).json({ error: 'Failed to fetch from Nominatim' });
  }
});

/**
 * Proxy endpoint for Nominatim search
 * Useful for future fallback if needed
 */
app.get('/api/nominatim/search', async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Missing q parameter' });
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      q
    )}&format=json&limit=${limit}&polygon_geojson=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TravelMemory-App (https://github.com/snir-sh/TravelMemory)',
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Nominatim search error:', error);
    res.status(500).json({ error: 'Failed to fetch from Nominatim' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🗺️  TravelMemory API Proxy running on http://localhost:${PORT}`);
  console.log(`   Nominatim proxy ready at /api/nominatim/*`);
});
