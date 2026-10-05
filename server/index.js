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
      const placeText = suggestion.placePrediction?.text?.text || '';
      
      // Geocode to get coordinates - use the original text (which preserves language)
      if (placeText) {
        try {
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(placeText)}&key=${apiKey}`;
          const geocodeRes = await fetch(geocodeUrl);
          const geocodeData = await geocodeRes.json();
          
          if (geocodeData.results && geocodeData.results.length > 0) {
            const result = geocodeData.results[0];
            const location = result.geometry.location;
            const bounds = result.geometry.bounds || result.geometry.viewport;
            
            // Use generic 'Place' type for autocomplete - will get real type from Nominatim when added
            let locationType = 'Place';
            if (result.address_components && result.address_components.length > 0) {
              const firstComponent = result.address_components[0];
              const allTypes = firstComponent.types || [];
              
              if (allTypes.includes('country')) {
                locationType = 'Country';
              } else if (allTypes.includes('administrative_area_level_1')) {
                locationType = 'State/Province';
              } else if (allTypes.includes('administrative_area_level_2')) {
                locationType = 'Region';
              } else if (allTypes.includes('administrative_area_level_3')) {
                locationType = 'District';
              } else if (allTypes.includes('locality')) {
                locationType = 'City';
              } else if (allTypes.includes('postal_town')) {
                locationType = 'Town';
              }
            }
            
            predictions.push({
              lat: location.lat,
              lon: location.lng,
              display_name: placeText,
              place_id: suggestion.placePrediction?.placeId || '',
              type: locationType,
              bounds: bounds ? {
                northeast: bounds.northeast,
                southwest: bounds.southwest,
              } : null,
            });
          }
        } catch (error) {
          console.error('Error geocoding suggestion:', error);
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
      const bounds = result.geometry.bounds || result.geometry.viewport;

      return res.json({
        lat: location.lat,
        lon: location.lng,
        display_name: result.formatted_address,
        bounds: bounds ? {
          northeast: bounds.northeast,
          southwest: bounds.southwest,
        } : null,
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

/**
 * Get location type from Nominatim
 * Maps Nominatim type to human-readable label
 */
app.get('/api/location-type', async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name) {
      return res.status(400).json({ error: 'Missing name parameter' });
    }
    
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TravelMemory-App (https://github.com/snir-sh/TravelMemory)',
      },
    });
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return res.json({ type: 'Place' });
    }
    
    const result = data[0];
    const osmType = result.type || '';
    
    // Map Nominatim types to display labels
    let locationType = 'Place';
    if (osmType === 'country') locationType = 'Country';
    else if (osmType === 'state') locationType = 'State/Province';
    else if (osmType === 'province') locationType = 'Province';
    else if (osmType === 'region') locationType = 'Region';
    else if (osmType === 'county') locationType = 'County';
    else if (osmType === 'district') locationType = 'District';
    else if (osmType === 'city') locationType = 'City';
    else if (osmType === 'town') locationType = 'Town';
    else if (osmType === 'village') locationType = 'Village';
    else if (osmType === 'hamlet') locationType = 'Hamlet';
    else if (osmType === 'settlement') locationType = 'Settlement';
    else if (osmType === 'kibbutz') locationType = 'Kibbutz';
    else if (osmType === 'moshav') locationType = 'Moshav';
    
    res.json({ type: locationType });
  } catch (error) {
    console.error('Location type lookup error:', error);
    res.json({ type: 'Place' });
  }
});

/**
 * Get location type from Wikidata
 * Queries Wikidata SPARQL API for settlement type (Kibbutz, Moshav, Village, etc.)
 */
app.get('/api/wikidata/settlement-type', async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name) {
      return res.status(400).json({ error: 'Missing name parameter' });
    }

    // Escape quotes for SPARQL
    const escapedName = name.replace(/"/g, '\\"');
    
    // Query Wikidata SPARQL API - search by Hebrew or English label
    // Filters to avoid disambiguation pages and redirects, only accepts settlement types
    const sparqlQuery = `
      SELECT DISTINCT ?typeLabel WHERE {
        ?item rdfs:label "${escapedName}"@he .
        ?item wdt:P31 ?type .
        
        # Exclude disambiguation pages (P31 = wd:Q4167410)
        FILTER (?type != wd:Q4167410) .
        # Exclude redirect pages (P31 = wd:Q15241385)
        FILTER (?type != wd:Q15241385) .
        
        # Only accept settlement-related types
        VALUES ?type {
          wd:Q515     # city
          wd:Q3957    # town
          wd:Q7930    # kibbutz
          wd:Q521286  # moshav
          wd:Q486972  # settlement
          wd:Q16970   # hamlet
          wd:Q532     # village
          wd:Q6256    # country
          wd:Q2081671 # region
        } .
        
        SERVICE wikibase:label { bd:serviceParam wikibase:language "he" }
      }
      LIMIT 1
    `;

    const url = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(sparqlQuery) + '&format=json';
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'TravelMemory-App (https://github.com/snir-sh/TravelMemory)',
      },
    });

    const data = await response.json();

    if (!data.results || data.results.bindings.length === 0) {
      console.log('[Wikidata] No results found for:', name);
      return res.json({ type: 'Place', source: 'wikidata' });
    }

    const binding = data.results.bindings[0];
    let typeLabel = binding.typeLabel?.value || 'Place';

    // Map Wikidata labels to our display types
    const typeMapping = {
      'קיבוץ': 'Kibbutz',
      'מושב': 'Moshav',
      'עיר': 'City',
      'כפר': 'Village',
      'עיר קטנה': 'Town',
      'יישוב': 'Settlement',
      'מקום מיושב': 'Settlement',
      'כפר קולקטיבי': 'Kibbutz',
      'כפר חקלאי': 'Moshav',
    };

    // Check for direct mapping
    let displayType = typeMapping[typeLabel] || typeLabel;

    // Also handle English labels if returned
    const englishMapping = {
      'kibbutz': 'Kibbutz',
      'moshav': 'Moshav',
      'city': 'City',
      'village': 'Village',
      'town': 'Town',
      'settlement': 'Settlement',
    };
    
    displayType = englishMapping[displayType.toLowerCase()] || displayType;

    console.log('[Wikidata] Found type for', name, ':', displayType);
    res.json({ type: displayType, source: 'wikidata' });
  } catch (error) {
    console.error('[Wikidata] Query error:', error);
    res.json({ type: 'Place', source: 'wikidata', error: error.message });
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
