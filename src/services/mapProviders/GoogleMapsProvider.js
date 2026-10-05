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

  async fetchPolygonBoundary(lat, lon, name) {
    try {
      console.log('[GoogleMapsProvider] Fetching polygon boundary via Nominatim:', name);
      
      // Use Nominatim search (by name) instead of reverse geocode
      // Reverse geocode often returns building/POI boundaries instead of administrative areas
      const nominatimUrl = 'http://localhost:3001/api/nominatim/search';
      const response = await fetch(
        `${nominatimUrl}?q=${encodeURIComponent(name)}&limit=5`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || data.length === 0) {
        console.warn('[GoogleMapsProvider] No search results found');
        return null;
      }

      // Filter results to prefer administrative boundaries (more official/stable)
      // Then sort by importance
      const sortedResults = data
        .filter(r => {
          // Prefer results with polygon geometry
          const hasPolygon = r.geojson && (r.geojson.type === 'Polygon' || r.geojson.type === 'MultiPolygon');
          if (!hasPolygon) return false;
          
          // Strong preference: boundary/administrative (official boundaries)
          if (r.class === 'boundary' && r.type === 'administrative') return true;
          
          // Secondary: place/town, place/village, place/settlement
          if (r.class === 'place' && ['town', 'village', 'city', 'settlement', 'hamlet'].includes(r.type)) return true;
          
          return false;
        })
        .sort((a, b) => {
          // Prioritize boundary/administrative
          const aIsBoundary = a.class === 'boundary' && a.type === 'administrative' ? 1 : 0;
          const bIsBoundary = b.class === 'boundary' && b.type === 'administrative' ? 1 : 0;
          if (aIsBoundary !== bIsBoundary) return bIsBoundary - aIsBoundary;
          
          // Then by importance (Nominatim's ranking)
          return (b.importance || 0) - (a.importance || 0);
        });

      if (sortedResults.length === 0) {
        console.warn('[GoogleMapsProvider] No suitable results with polygons found');
        return null;
      }

      const result = sortedResults[0];
      
      // Check if result has a polygon geometry
      if (!result.geojson || (result.geojson.type !== 'Polygon' && result.geojson.type !== 'MultiPolygon')) {
        console.warn('[GoogleMapsProvider] No polygon geometry found, will use circle');
        return null;
      }

      // Check if we got a polygon from Nominatim
      if (result.geojson.type === 'Polygon') {
        const coordinates = result.geojson.coordinates[0];
        
        // Check if polygon is valid and not too small
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

      if (result.geojson.type === 'MultiPolygon') {
        // Handle MultiPolygon - use the largest polygon
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

      // No polygon found - return null so MapView can draw a circle instead
      console.warn('[GoogleMapsProvider] No polygon boundary found, will use circle fallback');
      return null;
    } catch (error) {
      console.error('[GoogleMapsProvider] Polygon fetch error:', error);
      return null;
    }
  }
}

export default GoogleMapsProvider;
