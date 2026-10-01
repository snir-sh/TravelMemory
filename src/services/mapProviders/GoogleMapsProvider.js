import { MapProvider } from './MapProvider';

/**
 * Google Maps Provider
 * Uses Google Maps API for search, geocoding, and boundary fetching
 * 
 * Requires REACT_APP_GOOGLE_MAPS_API_KEY environment variable
 */
export class GoogleMapsProvider extends MapProvider {
  constructor(apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
    super();
    this.apiKey = apiKey;
    if (!apiKey) {
      console.warn(
        'GoogleMapsProvider: No API key provided. Set REACT_APP_GOOGLE_MAPS_API_KEY environment variable.'
      );
    }
  }

  getName() {
    return 'Google Maps';
  }

  _checkApiKey() {
    if (!this.apiKey) {
      throw new Error(
        'Google Maps API key not configured. Set REACT_APP_GOOGLE_MAPS_API_KEY environment variable.'
      );
    }
  }

  async searchLocations(query, limit = 5) {
    this._checkApiKey();

    try {
      // Use Places API Autocomplete
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&key=${this.apiKey}`
      );
      const data = await response.json();

      if (!data.predictions) {
        return [];
      }

      // Get details for each prediction to fetch coordinates
      const results = await Promise.all(
        data.predictions.slice(0, limit).map(async (prediction) => {
          try {
            const detailResponse = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address&key=${this.apiKey}`
            );
            const detailData = await detailResponse.json();

            if (detailData.result && detailData.result.geometry) {
              const location = detailData.result.geometry.location;
              return {
                lat: location.lat,
                lon: location.lng,
                display_name: prediction.description,
                place_id: prediction.place_id,
              };
            }
            return null;
          } catch (error) {
            console.error('Error fetching place details:', error);
            return null;
          }
        })
      );

      return results.filter((r) => r !== null);
    } catch (error) {
      console.error('Google Maps search error:', error);
      return [];
    }
  }

  async geocodeLocation(locationName) {
    this._checkApiKey();

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
    this._checkApiKey();

    try {
      // Use reverse geocoding to get place information
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${this.apiKey}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        // Find the most precise administrative area (usually the city)
        const result = data.results[0];
        const bounds = result.geometry.bounds;

        if (bounds) {
          // Convert bounds rectangle to polygon coordinates
          const ne = bounds.northeast;
          const sw = bounds.southwest;

          const polygonCoords = [
            [sw.lat, sw.lng],
            [ne.lat, sw.lng],
            [ne.lat, ne.lng],
            [sw.lat, ne.lng],
            [sw.lat, sw.lng], // Close the polygon
          ];

          return {
            id: Date.now(),
            name: name || result.formatted_address,
            coords: polygonCoords,
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Google Maps polygon fetch error:', error);
      return null;
    }
  }
}

export default GoogleMapsProvider;
