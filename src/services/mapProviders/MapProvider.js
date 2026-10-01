/**
 * Base Map Provider Interface
 * All providers must implement these methods
 */
export class MapProvider {
  /**
   * Search for locations by query
   * @param {string} query - Search query
   * @param {number} limit - Max results to return
   * @returns {Promise<Array>} Array of location objects
   */
  async searchLocations(query, limit = 5) {
    throw new Error('searchLocations() must be implemented');
  }

  /**
   * Geocode a location name to coordinates
   * @param {string} locationName - Location name
   * @returns {Promise<Object>} Object with coords and name
   */
  async geocodeLocation(locationName) {
    throw new Error('geocodeLocation() must be implemented');
  }

  /**
   * Fetch polygon boundary for a location
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {string} name - Location name
   * @returns {Promise<Object|Array>} Polygon data or array of polygons
   */
  async fetchPolygonBoundary(lat, lon, name) {
    throw new Error('fetchPolygonBoundary() must be implemented');
  }

  /**
   * Get provider name
   * @returns {string} Provider name
   */
  getName() {
    throw new Error('getName() must be implemented');
  }
}

export default MapProvider;
