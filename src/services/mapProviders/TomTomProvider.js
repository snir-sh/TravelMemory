import { MapProvider } from './MapProvider';

/**
 * TomTom Provider
 * Uses TomTom's Search and Reverse Geocoding APIs to get detailed polygon geometry
 * Backend proxy to avoid CORS issues
 */
export class TomTomProvider extends MapProvider {
  constructor() {
    super();
    this.apiBaseUrl = 'http://localhost:3001/api/tomtom';
  }

  getName() {
    return 'TomTom Maps';
  }

  async searchLocations(query, limit = 5) {
    try {
      console.log('[TomTomProvider] Searching locations:', query);
      const response = await fetch(
        `${this.apiBaseUrl}/search?q=${encodeURIComponent(query)}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.predictions || [];
    } catch (error) {
      console.error('[TomTomProvider] Search error:', error);
      return [];
    }
  }

  async geocodeLocation(locationName) {
    try {
      console.log('[TomTomProvider] Geocoding location:', locationName);
      const response = await fetch(
        `${this.apiBaseUrl}/geocode?address=${encodeURIComponent(locationName)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        console.warn('[TomTomProvider] Geocode error:', data.error);
        return null;
      }

      return {
        coords: [data.lat, data.lon],
        name: data.display_name,
      };
    } catch (error) {
      console.error('[TomTomProvider] Geocoding error:', error);
      return null;
    }
  }

  async fetchPolygonBoundary(lat, lon, name) {
    try {
      console.log('[TomTomProvider] Fetching polygon boundary for:', name);

      // Use Search API (by name) to get detailed geometry, not reverse geocode
      // Reverse geocode often returns incomplete geometry
      const response = await fetch(
        `${this.apiBaseUrl}/search?q=${encodeURIComponent(name)}&limit=1`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.predictions || data.predictions.length === 0) {
        console.warn('[TomTomProvider] No search results');
        return null;
      }

      // For now, TomTom Search doesn't return detailed polygon geometry in free tier
      // We'll need to use the reverse geocoding with geometry parameter
      // Fallback: use a circle instead
      console.warn('[TomTomProvider] TomTom free tier does not return polygon geometry');
      return null;
    } catch (error) {
      console.error('[TomTomProvider] Polygon fetch error:', error);
      return null;
    }
  }

}

export default TomTomProvider;
