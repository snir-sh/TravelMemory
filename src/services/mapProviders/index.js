import { NominatimProvider } from './NominatimProvider';
import { GoogleMapsProvider } from './GoogleMapsProvider';
import { TomTomProvider } from './TomTomProvider';

/**
 * Map Provider Factory
 * Easily switch between different providers
 * 
 * Available providers:
 * - nominatim: Free (OpenStreetMap)
 * - google: Google Maps (requires API key in REACT_APP_GOOGLE_MAPS_API_KEY)
 * - tomtom: TomTom Maps (requires API key in TOMTOM_API_KEY) - BEST for detailed polygons!
 */
export const MapProviderFactory = {
  providers: {
    // nominatim: new NominatimProvider(),
    google: new GoogleMapsProvider(),
    tomtom: new TomTomProvider(),
  },

  /**
   * Get a provider by name
   * @param {string} name - Provider name (nominatim, google, tomtom, etc)
   * @returns {MapProvider} Provider instance
   */
  getProvider(name = 'tomtom') {
    const provider = this.providers[name];
    if (!provider) {
      console.warn(`Provider "${name}" not found. Using default "tomtom"`);
      return this.providers.tomtom || this.providers.google;
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

