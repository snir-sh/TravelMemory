# Google Maps Setup Guide

## Getting a Google Maps API Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com
   - Sign in with your Google account

2. **Create a new project**
   - Click "Select a Project"
   - Click "New Project"
   - Name it "TravelMemory"
   - Click "Create"

3. **Enable Required APIs**
   - Search for and enable these APIs:
     - Maps JavaScript API
     - Places API
     - Geocoding API

4. **Create API Credentials**
   - Go to "Credentials" in the left menu
   - Click "Create Credentials" → "API Key"
   - Copy your API key

5. **Add to Environment**
   - Create a `.env` file in the project root
   - Add: `REACT_APP_GOOGLE_MAPS_API_KEY=your_key_here`
   - Restart the dev server

## Enable Google Maps in Code

In `src/services/mapProviders/index.js`, uncomment:

```javascript
google: new GoogleMapsProvider(),
```

Then in `src/MapView.jsx`, change:

```javascript
const [mapProvider] = useState(() => MapProviderFactory.getProvider('google'));
```

## Costs

- First $200/month free usage
- After that, pay-as-you-go
- For small apps, likely to stay in free tier

## Security

⚠️ Don't commit your API key to GitHub! 
- Use `.env` file (already in `.gitignore`)
- Add to `.gitignore` if not already there
