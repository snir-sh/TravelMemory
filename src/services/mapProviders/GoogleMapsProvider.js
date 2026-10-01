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
      console.log('[GoogleMapsProvider] Fetching polygon via proxy:', name);
      const response = await fetch(
        `${this.apiBaseUrl}/reverse-geocode?lat=${lat}&lon=${lon}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        console.warn('[GoogleMapsProvider] Polygon fetch error:', data.error);
        return null;
      }

      return {
        id: Date.now(),
        name: data.name || name,
        coords: data.coords,
      };
    } catch (error) {
      console.error('[GoogleMapsProvider] Polygon fetch error:', error);
      return null;
    }
  }
}

export default GoogleMapsProvider;
