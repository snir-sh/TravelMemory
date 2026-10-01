import { MapProvider } from './MapProvider';

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
      
      // Use Nominatim proxy for actual boundary polygons
      const nominatimUrl = 'http://localhost:3001/api/nominatim/reverse';
      const response = await fetch(
        `${nominatimUrl}?lat=${lat}&lon=${lon}&zoom=10`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Check if we got a polygon from Nominatim
      if (data.geojson && data.geojson.type === 'Polygon') {
        const coordinates = data.geojson.coordinates[0];
        // Nominatim returns [lon, lat], we need [lat, lon]
        const polygonCoords = coordinates.map(coord => [coord[1], coord[0]]);
        
        return {
          id: Date.now(),
          name: data.name || name,
          coords: polygonCoords,
        };
      }

      if (data.geojson && data.geojson.type === 'MultiPolygon') {
        // Handle MultiPolygon - use the first polygon
        const coordinates = data.geojson.coordinates[0][0];
        const polygonCoords = coordinates.map(coord => [coord[1], coord[0]]);
        
        return {
          id: Date.now(),
          name: data.name || name,
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
