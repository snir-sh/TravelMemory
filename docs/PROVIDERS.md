# Map Provider Configuration

TravelMemory supports multiple map providers that can be easily switched.

## Available Providers

### 1. Nominatim (Default - Free)
- **Search**: Open-Meteo API (free)
- **Boundaries**: Local proxy to Nominatim
- **Cost**: Free
- **Setup**: No configuration needed

**Pros:**
- Free and unlimited
- Works immediately
- Runs locally with backend proxy

**Cons:**
- Returns broader administrative areas (districts/regions)
- Less precise for small towns/villages
- Rate limited by Nominatim (2-3 requests/sec)

### 2. Google Maps (Premium)
- **Search**: Google Places API
- **Geocoding**: Google Geocoding API
- **Boundaries**: Reverse geocoding with bounds
- **Cost**: $200/month free, then pay-as-you-go
- **Setup**: Requires API key (see docs/GOOGLE_MAPS_SETUP.md)

**Pros:**
- More precise city/town boundaries
- Better autocomplete suggestions
- Faster responses
- Higher rate limits

**Cons:**
- Requires API key
- Paid after free tier
- Need Google Cloud account

## Switching Providers

### To use Google Maps:

1. **Get API Key** (see `docs/GOOGLE_MAPS_SETUP.md`)

2. **Add to `.env`:**
   ```
   REACT_APP_GOOGLE_MAPS_API_KEY=your_key_here
   ```

3. **Enable in code** (`src/services/mapProviders/index.js`):
   ```javascript
   google: new GoogleMapsProvider(),
   ```

4. **Change provider** (`src/MapView.jsx`):
   ```javascript
   // Change from:
   const [mapProvider] = useState(() => MapProviderFactory.getProvider('nominatim'));
   
   // To:
   const [mapProvider] = useState(() => MapProviderFactory.getProvider('google'));
   ```

5. **Restart dev server:**
   ```bash
   npm run dev
   ```

### To switch back to Nominatim:
Just change the provider name back to `'nominatim'` and restart.

## Adding a New Provider

1. Create a new file: `src/services/mapProviders/YourProvider.js`
2. Extend `MapProvider` class and implement methods
3. Register in factory (`src/services/mapProviders/index.js`):
   ```javascript
   yourprovider: new YourProvider(),
   ```
4. Use in MapView:
   ```javascript
   MapProviderFactory.getProvider('yourprovider')
   ```

## Environment Variables

Create `.env` in project root:

```
# Optional: Google Maps API Key
REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key_here
```

**Note:** `.env` files are automatically excluded from git (see `.gitignore`)
