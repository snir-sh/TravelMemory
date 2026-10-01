require('dotenv').config();
require('dotenv').config();
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

/**
 * Proxy endpoint for Google Maps Places Autocomplete (New)
 * Uses the new Places API instead of deprecated legacy API
 * Avoids CORS issues by proxying through backend
 */
app.get('/api/google/autocomplete', async (req, res) => {
  try {
    const { input, limit = 5 } = req.query;
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error('[Backend] Google Maps API key not found in environment');
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }

    if (!input) {
      return res.status(400).json({ error: 'Missing input parameter' });
    }

    // Use new Places API with sessionToken for better performance
    const url = `https://places.googleapis.com/v1/places:autocomplete`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input: input,
      }),
    });

    const data = await response.json();

    if (!data.suggestions || data.suggestions.length === 0) {
      console.log('[GoogleMapsProvider] No suggestions returned');
      return res.json({ predictions: [] });
    }

    // For each suggestion, we need to get coordinates via geocoding
    const predictions = [];
    
    for (let i = 0; i < Math.min(data.suggestions.length, limit); i++) {
      const suggestion = data.suggestions[i];
      const placeText = suggestion.placePrediction?.text?.text || 
                       suggestion.mainText || 
                       suggestion.description || '';
      
      // Geocode to get coordinates
      if (placeText) {
        try {
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(placeText)}&key=${apiKey}`;
          const geocodeRes = await fetch(geocodeUrl);
          const geocodeData = await geocodeRes.json();
          
          if (geocodeData.results && geocodeData.results.length > 0) {
            const result = geocodeData.results[0];
            const location = result.geometry.location;
            
            predictions.push({
              lat: location.lat,
              lon: location.lng,
              display_name: result.formatted_address,
              place_id: suggestion.placePrediction?.placeId || '',
            });
          }
        } catch (error) {
          console.error('Error geocoding suggestion:', error);
          // Continue to next suggestion
        }
      }
    }

    res.json({ predictions });
  } catch (error) {
    console.error('Google Maps autocomplete error:', error);
    res.status(500).json({ error: 'Failed to fetch from Google Maps', details: error.message });
  }
});

/**
 * Proxy endpoint for Google Maps Geocoding
 * Convert address to coordinates
 */
app.get('/api/google/geocode', async (req, res) => {
  try {
    const { address } = req.query;
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }

    if (!address) {
      return res.status(400).json({ error: 'Missing address parameter' });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;

      return res.json({
        lat: location.lat,
        lon: location.lng,
        display_name: result.formatted_address,
      });
    }

    res.json({ error: 'Address not found' });
  } catch (error) {
    console.error('Google Maps geocoding error:', error);
    res.status(500).json({ error: 'Failed to fetch from Google Maps' });
  }
});

/**
 * Proxy endpoint for Google Maps Reverse Geocoding
 * Get polygon boundaries for a location
 */
app.get('/api/google/reverse-geocode', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing lat or lon parameters' });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const geometry = result.geometry;
      
      // Try to get bounds, fallback to viewport if bounds not available
      let bounds = geometry.bounds || geometry.viewport;

      if (bounds) {
        const ne = bounds.northeast;
        const sw = bounds.southwest;

        // Convert bounds rectangle to polygon coordinates
        const polygonCoords = [
          [sw.lat, sw.lng],
          [ne.lat, sw.lng],
          [ne.lat, ne.lng],
          [sw.lat, ne.lng],
          [sw.lat, sw.lng],
        ];

        return res.json({
          name: result.formatted_address,
          coords: polygonCoords,
        });
      }
    }

    res.json({ error: 'No bounds found' });
  } catch (error) {
    console.error('Google Maps reverse geocoding error:', error);
    res.status(500).json({ error: 'Failed to fetch from Google Maps' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🗺️  TravelMemory API Proxy running on http://localhost:${PORT}`);
  console.log(`   Nominatim proxy ready at /api/nominatim/*`);
  console.log(`   Google Maps proxy ready at /api/google/*`);
});
