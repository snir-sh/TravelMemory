import React, { useState, useRef } from 'react';
import GoogleMapsDisplay from './GoogleMapsDisplay';
import { MapProviderFactory } from './services/mapProviders';
import './MapView.css';

// Color palette for different locations
const COLOR_PALETTE = [
  '#667eea', // Blue
  '#ff6b6b', // Red
  '#51cf66', // Green
  '#ffd93d', // Yellow
  '#6bcf7f', // Mint
  '#ff922b', // Orange
  '#d946ef', // Purple
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#f59e0b', // Amber
];

const getColorForPolygon = (index) => COLOR_PALETTE[index % COLOR_PALETTE.length];

const STORAGE_KEY = 'travel-memory-trips';

const saveToLocalStorage = (markers, polygons, circles) => {
  const data = { markers, polygons, circles };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  console.log('📁 Trip saved to local storage');
};

const loadFromLocalStorage = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading from local storage:', error);
      return null;
    }
  }
  return null;
};

export default function MapView({ onBackToLanding }) {
  const [markers, setMarkers] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const [circles, setCircles] = useState([]);
  const [locationInput, setLocationInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapProvider] = useState(() => MapProviderFactory.getProvider('google'));
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);

  // Load saved data AFTER map is ready
  React.useEffect(() => {
    if (mapReady) {
      const saved = loadFromLocalStorage();
      if (saved && (saved.markers.length > 0 || saved.polygons.length > 0 || saved.circles.length > 0)) {
        setMarkers(saved.markers);
        setPolygons(saved.polygons);
        setCircles(saved.circles);
        console.log('📁 Loaded trip from storage:', saved);
      }
    }
  }, [mapReady]);

  // Auto-save to localStorage whenever data changes
  React.useEffect(() => {
    if (markers.length > 0 || polygons.length > 0 || circles.length > 0) {
      saveToLocalStorage(markers, polygons, circles);
    }
  }, [markers, polygons, circles]);

  // Pan to location on Google Maps - moderate zoom, no aggressive zooming
  const panToLocation = (location) => {
    if (mapRef.current) {
      mapRef.current.panTo({
        lat: location.coords[0],
        lng: location.coords[1],
      });
      mapRef.current.setZoom(11); // Moderate zoom level instead of aggressive 12
    }
  };

  // Autocomplete suggestions using provider
  const fetchSuggestions = async (query) => {
    console.log('Fetching suggestions for:', query);
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const results = await mapProvider.searchLocations(query, 5);
      console.log('Suggestions received:', results);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      console.error('Suggestion fetch error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setLocationInput(value);
    fetchSuggestions(value);
  };

  const handleSelectSuggestion = async (suggestion) => {
    const location = {
      coords: [parseFloat(suggestion.lat), parseFloat(suggestion.lon)],
      name: suggestion.display_name,
      type: suggestion.type || 'Place',
    };

    let hasPolygon = false;

    // Try to fetch polygon boundary
    const polygonData = await mapProvider.fetchPolygonBoundary(
      suggestion.lat,
      suggestion.lon,
      suggestion.display_name,
      suggestion.bounds
    );

    if (polygonData) {
      const colorIndex = polygons.length;
      const color = getColorForPolygon(colorIndex);
      
      const polygonToAdd = Array.isArray(polygonData)
        ? polygonData.map((poly) => ({
            ...poly,
            color,
            type: location.type,
          }))
        : { ...polygonData, color, type: location.type };

      if (Array.isArray(polygonToAdd)) {
        setPolygons([...polygons, ...polygonToAdd]);
      } else {
        setPolygons([...polygons, polygonToAdd]);
      }
      hasPolygon = true;
    } else {
      // No polygon - add circle
      const newCircle = {
        id: Date.now(),
        lat: location.coords[0],
        lng: location.coords[1],
        name: location.name,
        type: location.type,
        radius: 2000,
      };
      setCircles([...circles, newCircle]);
    }

    setLocationInput('');
    setSuggestions([]);
    setShowSuggestions(false);

    // Pan to new location (with moderate zoom)
    panToLocation(location);

    // Fetch real type from Wikidata asynchronously (doesn't block adding)
    const locationName = location.name.split(',')[0].trim();
    try {
      const typeRes = await fetch(`http://localhost:3001/api/wikidata/settlement-type?name=${encodeURIComponent(locationName)}`);
      const typeData = await typeRes.json();
      if (typeData.type && typeData.type !== location.type) {
        // Update the type if different
        if (hasPolygon) {
          setPolygons((prevPolygons) =>
            prevPolygons.map((poly) =>
              poly.name === location.name ? { ...poly, type: typeData.type } : poly
            )
          );
        } else {
          setCircles((prevCircles) =>
            prevCircles.map((circle) =>
              circle.name === location.name ? { ...circle, type: typeData.type } : circle
            )
          );
        }
        console.log('[MapView] Updated type to:', typeData.type);
      }
    } catch (e) {
      console.log('[MapView] Wikidata type lookup skipped (timeout or error)');
    }
  };

  const handleAddLocation = async () => {
    if (!locationInput.trim()) {
      alert('Please enter a location');
      return;
    }

    const location = await mapProvider.geocodeLocation(locationInput);
    if (location) {
      const newMarker = {
        id: Date.now(),
        ...location,
      };
      setMarkers([...markers, newMarker]);
      setLocationInput('');
      setSuggestions([]);
      setShowSuggestions(false);

      // Pan to new location
      panToLocation(location);
    } else {
      alert('Location not found. Try a more specific address.');
    }
  };

  const handlePolygonComplete = (newPolygon) => {
    setPolygons([...polygons, newPolygon]);
    // Pan to the new polygon
    panToLocation({
      coords: [newPolygon.coords[0][0], newPolygon.coords[0][1]],
    });
  };

  const handleDelete = (id) => {
    setMarkers(markers.filter((marker) => marker.id !== id));
    setPolygons(polygons.filter((polygon) => polygon.id !== id));
    setCircles(circles.filter((circle) => circle.id !== id));
    // Don't pan/zoom when deleting - just remove silently
  };

  const handleClearTrip = () => {
    if (window.confirm('Are you sure you want to clear all locations? This cannot be undone.')) {
      setMarkers([]);
      setPolygons([]);
      setCircles([]);
      localStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ Trip cleared');
    }
  };

  return (
    <div className="map-view">
      <header className="map-header">
        <button className="back-btn" onClick={onBackToLanding}>
          ← Back to Landing
        </button>
        <h1>My Travel Map</h1>
        {markers.length + polygons.length + circles.length > 0 && (
          <button className="clear-btn" onClick={handleClearTrip}>
            🗑️ Clear Trip
          </button>
        )}
      </header>

      <div className="map-container">
        <div className="controls-panel">
          <div className="location-input-group">
            <div className="autocomplete-container">
              <input
                type="text"
                value={locationInput}
                onChange={handleInputChange}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleAddLocation();
                }}
                placeholder="Enter location (e.g., Paris, France)"
                className="location-input"
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="suggestions-list">
                  {suggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="suggestion-item"
                    >
                      <span className="suggestion-name">
                        {suggestion.display_name}
                      </span>
                      <span className="suggestion-type">
                        {suggestion.type || 'Place'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button onClick={handleAddLocation} className="add-btn">
              Add Location
            </button>
          </div>

          <div className="markers-list">
            <h3>Locations ({markers.length + polygons.length + circles.length})</h3>
            {markers.length === 0 && polygons.length === 0 && circles.length === 0 ? (
              <p className="empty-state">
                No locations yet. Add one to get started!
              </p>
            ) : (
              <ul>
                {polygons.map((polygon) => (
                  <li
                    key={polygon.id}
                    className="marker-item polygon-item"
                    style={{ borderLeftColor: polygon.color || '#667eea' }}
                  >
                    <div className="location-info">
                      <span>🗺️ {polygon.name}</span>
                      {polygon.type && <span className="location-type">{polygon.type}</span>}
                    </div>
                    <button
                      onClick={() => handleDelete(polygon.id)}
                      className="delete-btn"
                    >
                      ✕
                    </button>
                  </li>
                ))}
                {circles.map((circle) => (
                  <li key={circle.id} className="marker-item circle-item">
                    <div className="location-info">
                      <span>⭕ {circle.name}</span>
                      {circle.type && <span className="location-type">{circle.type}</span>}
                    </div>
                    <button
                      onClick={() => handleDelete(circle.id)}
                      className="delete-btn"
                    >
                      ✕
                    </button>
                  </li>
                ))}
                {markers.map((marker) => (
                  <li key={marker.id} className="marker-item">
                    <div className="location-info">
                      <span>📍 {marker.name}</span>
                      {marker.type && <span className="location-type">{marker.type}</span>}
                    </div>
                    <button
                      onClick={() => handleDelete(marker.id)}
                      className="delete-btn"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <GoogleMapsDisplay
          markers={markers}
          polygons={polygons}
          circles={circles}
          mapRef={mapRef}
          onPolygonComplete={handlePolygonComplete}
          onMapLoaded={() => setMapReady(true)}
        />
      </div>
    </div>
  );
}
