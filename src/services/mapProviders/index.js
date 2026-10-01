import { NominatimProvider } from './NominatimProvider';
import { GoogleMapsProvider } from './GoogleMapsProvider';

/**
 * Map Provider Factory
 * Easily switch between different providers
 */
export const MapProviderFactory = {
  providers: {
    nominatim: new NominatimProvider(),
    // google: new GoogleMapsProvider(process.env.REACT_APP_GOOGLE_MAPS_API_KEY),
  },

  /**
   * Get a provider by name
   * @param {string} name - Provider name (nominatim, google, etc)
   * @returns {MapProvider} Provider instance
   */
  getProvider(name = 'nominatim') {
    const provider = this.providers[name];
    if (!provider) {
      console.warn(`Provider "${name}" not found. Using default "nominatim"`);
      return this.providers.nominatim;
    }
    return provider;
  },

  /**
   * Register a custom provider
   * @param {string} name - Provider name
   * @param {MapProvider} provider - Provider instance
   */
  registerProvider(name, provider) {
    this.providers[name] = provider;
  },

  /**
   * Get list of available providers
   * @returns {Array<string>} Provider names
   */
  getAvailableProviders() {
    return Object.keys(this.providers);
  },
};

export default MapProviderFactory;
