import { MapProvider } from './MapProvider';

// Helper function to clean multilingual names (e.g., "ירושלים | القدس" -> "ירושלים")
const cleanLocationName = (name) => {
  if (!name) return name;
  // Take only the first part before pipe character
  return name.split('|')[0].trim();
};

/**
 * Google Maps Provider
 * Uses backend proxy to avoid CORS issues
 * 
 * Proxies all requests through http://localhost:3001/api/google/*
 */
export class GoogleMapsProvider extends MapProvider {
  constructor() {
    super();
    this.apiBaseUrl = 'http://localhost:3001/api/google';
  }

  getName() {
    return 'Google Maps';
  }

  async searchLocations(query, limit = 5) {
    try {
      console.log('[GoogleMapsProvider] Searching locations via proxy:', query);
      const response = await fetch(
        `${this.apiBaseUrl}/autocomplete?input=${encodeURIComponent(
          query
        )}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.predictions) {
        return [];
      }

      return data.predictions;
    } catch (error) {
      console.error('[GoogleMapsProvider] Search error:', error);
      return [];
    }
  }

  async geocodeLocation(locationName) {
    try {
      console.log('[GoogleMapsProvider] Geocoding location via proxy:', locationName);
      const response = await fetch(
        `${this.apiBaseUrl}/geocode?address=${encodeURIComponent(locationName)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        console.warn('[GoogleMapsProvider] Geocode error:', data.error);
        return null;
      }

      return {
        coords: [data.lat, data.lon],
        name: data.display_name,
      };
    } catch (error) {
      console.error('[GoogleMapsProvider] Geocoding error:', error);
      return null;
    }
  }

  async fetchPolygonBoundary(lat, lon, name, googleBounds) {
    try {
      console.log('[GoogleMapsProvider] Fetching polygon boundary for:', name);
      
      // Query Nominatim with multiple results and smart filtering
      const nominatimUrl = 'http://localhost:3001/api/nominatim/search';
      const response = await fetch(
        `${nominatimUrl}?q=${encodeURIComponent(name)}&limit=10`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || data.length === 0) {
        console.warn('[GoogleMapsProvider] No Nominatim results found');
        return null;
      }

      // Smart filtering: prefer administrative boundaries near the Google coordinates
      const candidatePolygons = data
        .filter(r => {
          // Must have polygon geometry
          if (!r.geojson || (r.geojson.type !== 'Polygon' && r.geojson.type !== 'MultiPolygon')) {
            return false;
          }
          
          // Strongly prefer: boundary/administrative (official boundaries)
          if (r.class === 'boundary' && r.type === 'administrative') return true;
          
          // Accept: place types that represent settlements
          if (r.class === 'place' && ['town', 'village', 'city', 'settlement', 'hamlet', 'borough'].includes(r.type)) {
            return true;
          }
          
          return false;
        })
        .sort((a, b) => {
          // Priority 1: boundary/administrative
          const aIsBoundary = a.class === 'boundary' && a.type === 'administrative' ? 1 : 0;
          const bIsBoundary = b.class === 'boundary' && b.type === 'administrative' ? 1 : 0;
          if (aIsBoundary !== bIsBoundary) return bIsBoundary - aIsBoundary;
          
          // Priority 2: Closer to Google's coordinates (within bounding box)
          const aDist = Math.abs(parseFloat(a.lat) - lat) + Math.abs(parseFloat(a.lon) - lon);
          const bDist = Math.abs(parseFloat(b.lat) - lat) + Math.abs(parseFloat(b.lon) - lon);
          if (Math.abs(aDist - bDist) > 0.01) return aDist - bDist;
          
          // Priority 3: By Nominatim importance
          return (b.importance || 0) - (a.importance || 0);
        });

      if (candidatePolygons.length === 0) {
        console.warn('[GoogleMapsProvider] No suitable polygons found after filtering');
        return null;
      }

      const result = candidatePolygons[0];
      console.log('[GoogleMapsProvider] Selected result:', result.name, `(${result.class}/${result.type})`);
      
      // Handle Polygon
      if (result.geojson.type === 'Polygon') {
        const coordinates = result.geojson.coordinates[0];
        
        if (coordinates.length < 4) {
          console.warn('[GoogleMapsProvider] Polygon has too few points, using circle fallback');
          return null;
        }
        
        // Nominatim returns [lon, lat], we need [lat, lon]
        const polygonCoords = coordinates.map(coord => [coord[1], coord[0]]);
        
        return {
          id: Date.now(),
          name: cleanLocationName(result.name) || name,
          coords: polygonCoords,
        };
      }

      // Handle MultiPolygon - use the largest polygon
      if (result.geojson.type === 'MultiPolygon') {
        const polygons = result.geojson.coordinates;
        let largestPolygon = null;
        let largestSize = 0;
        
        polygons.forEach(poly => {
          if (poly[0] && poly[0].length > largestSize) {
            largestSize = poly[0].length;
            largestPolygon = poly[0];
          }
        });
        
        if (!largestPolygon || largestPolygon.length < 4) {
          console.warn('[GoogleMapsProvider] MultiPolygon too small, using circle fallback');
          return null;
        }
        
        const polygonCoords = largestPolygon.map(coord => [coord[1], coord[0]]);
        
        return {
          id: Date.now(),
          name: cleanLocationName(result.name) || name,
          coords: polygonCoords,
        };
      }

      console.warn('[GoogleMapsProvider] No valid polygon geometry found');
      return null;
    } catch (error) {
      console.error('[GoogleMapsProvider] Polygon fetch error:', error);
      return null;
    }
  }
}

export default GoogleMapsProvider;
