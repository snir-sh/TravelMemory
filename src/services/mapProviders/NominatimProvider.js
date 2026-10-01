import { MapProvider } from './MapProvider';

/**
 * Nominatim + Open-Meteo Map Provider
 * Uses Open-Meteo for autocomplete and local proxy for polygon fetching
 */
export class NominatimProvider extends MapProvider {
  constructor(proxyUrl = 'http://localhost:3001') {
    super();
    this.proxyUrl = proxyUrl;
  }

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
    try {
      const response = await fetch(
        `${this.proxyUrl}/api/nominatim/reverse?lat=${lat}&lon=${lon}&zoom=10`
      );
      const data = await response.json();

      if (data.geojson) {
        if (data.geojson.type === 'Polygon') {
          const polygonCoords = data.geojson.coordinates[0].map((coord) => [
            coord[1],
            coord[0],
          ]);
          return {
            id: Date.now(),
            name: name,
            coords: polygonCoords,
          };
        } else if (data.geojson.type === 'MultiPolygon') {
          return data.geojson.coordinates.map((polygon, index) => ({
            id: Date.now() + index,
            name: name,
            coords: polygon[0].map((coord) => [coord[1], coord[0]]),
          }));
        }
      }
      return null;
    } catch (error) {
      console.error('Polygon fetch error:', error);
      return null;
    }
  }
}

export default NominatimProvider;
