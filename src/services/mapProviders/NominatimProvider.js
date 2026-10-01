import { MapProvider } from './MapProvider';

/**
 * Nominatim + Open-Meteo Map Provider
 * Uses Open-Meteo for autocomplete and Nominatim for reverse geocoding
 */
export class NominatimProvider extends MapProvider {
  getName() {
    return 'Nominatim';
  }

  async searchLocations(query, limit = 5) {
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          query
        )}&count=${limit}&language=en&format=json`
      );
      const data = await response.json();

      if (data.results) {
        return data.results.map((result) => ({
          lat: result.latitude,
          lon: result.longitude,
          display_name: `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}${
            result.country ? ', ' + result.country : ''
          }`,
        }));
      }
      return [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  async geocodeLocation(locationName) {
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          locationName
        )}&count=1&language=en&format=json`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const displayName = `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}${
          result.country ? ', ' + result.country : ''
        }`;
        return {
          coords: [result.latitude, result.longitude],
          name: displayName,
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  async fetchPolygonBoundary(lat, lon, name) {
    // TODO: Implement polygon fetching
    // This would require a backend proxy due to CORS
    return null;
  }
}

export default NominatimProvider;
