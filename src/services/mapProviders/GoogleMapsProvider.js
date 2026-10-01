import { MapProvider } from './MapProvider';

/**
 * Google Maps Provider
 * Uses Google Maps API for search, geocoding, and boundary fetching
 */
export class GoogleMapsProvider extends MapProvider {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
    if (!apiKey) {
      console.warn('GoogleMapsProvider: No API key provided');
    }
  }

  getName() {
    return 'Google Maps';
  }

  async searchLocations(query, limit = 5) {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&key=${this.apiKey}`
      );
      const data = await response.json();

      if (data.predictions) {
        // For each prediction, get place details to get coordinates
        const results = await Promise.all(
          data.predictions.slice(0, limit).map(async (prediction) => {
            const detailResponse = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry&key=${this.apiKey}`
            );
            const detailData = await detailResponse.json();
            const location = detailData.result.geometry.location;

            return {
              lat: location.lat,
              lon: location.lng,
              display_name: prediction.description,
              place_id: prediction.place_id,
            };
          })
        );
        return results;
      }
      return [];
    } catch (error) {
      console.error('Google Maps search error:', error);
      return [];
    }
  }

  async geocodeLocation(locationName) {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          locationName
        )}&key=${this.apiKey}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;

        return {
          coords: [location.lat, location.lng],
          name: result.formatted_address,
        };
      }
      return null;
    } catch (error) {
      console.error('Google Maps geocoding error:', error);
      return null;
    }
  }

  async fetchPolygonBoundary(lat, lon, name) {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    // TODO: Implement polygon fetching using Places API
    // Google Maps doesn't provide boundary polygons directly
    // Would need to use a separate service or pre-computed data
    return null;
  }
}

export default GoogleMapsProvider;
