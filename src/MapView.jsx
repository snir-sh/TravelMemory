import React, { useState, useRef } from 'react';
import GoogleMapsDisplay from './GoogleMapsDisplay';
import { MapProviderFactory } from './services/mapProviders';
import './MapView.css';

export default function MapView({ onBackToLanding }) {
  const [markers, setMarkers] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const [circles, setCircles] = useState([]);
  const [locationInput, setLocationInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapProvider] = useState(() => MapProviderFactory.getProvider('google'));
  const mapRef = useRef(null);

  // Pan to location on Google Maps
  const panToLocation = (location) => {
    if (mapRef.current) {
      mapRef.current.panTo({
        lat: location.coords[0],
        lng: location.coords[1],
      });
      mapRef.current.setZoom(12);
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
    };

    let hasPolygon = false;

    // Try to fetch polygon boundary
    const polygonData = await mapProvider.fetchPolygonBoundary(
      suggestion.lat,
      suggestion.lon,
      suggestion.display_name
    );

    if (polygonData) {
      if (Array.isArray(polygonData)) {
        // Multiple polygons (MultiPolygon)
        setPolygons([...polygons, ...polygonData]);
      } else {
        // Single polygon
        setPolygons([...polygons, polygonData]);
      }
      hasPolygon = true;
    }

    // Only add circle if no polygon was added
    if (!hasPolygon) {
      const newCircle = {
        id: Date.now(),
        lat: location.coords[0],
        lng: location.coords[1],
        name: location.name,
        radius: 5000, // 5km default radius for location
      };
      setCircles([...circles, newCircle]);
    }

    setLocationInput('');
    setSuggestions([]);
    setShowSuggestions(false);

    // Pan to new location
    panToLocation(location);
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
  };

  return (
    <div className="map-view">
      <header className="map-header">
        <button className="back-btn" onClick={onBackToLanding}>
          ← Back to Landing
        </button>
        <h1>My Travel Map</h1>
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
                  <li key={polygon.id} className="marker-item polygon-item">
                    <span>🗺️ {polygon.name}</span>
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
                    <span>⭕ {circle.name}</span>
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
                    <span>📍 {marker.name}</span>
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

          <div className="info-box">
            <h4>Tip</h4>
            <p>Use the drawing tools on the map to trace your hiking routes and travel paths!</p>
          </div>
        </div>

        <GoogleMapsDisplay
          markers={markers}
          polygons={polygons}
          circles={circles}
          mapRef={mapRef}
          onPolygonComplete={handlePolygonComplete}
        />
      </div>
    </div>
  );
}
