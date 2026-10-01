import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, FeatureGroup, Polygon } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { MapProviderFactory } from './services/mapProviders';
import './MapView.css';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export default function MapView({ onBackToLanding }) {
  const [markers, setMarkers] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const [locationInput, setLocationInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [map, setMap] = useState(null);
  const [drawings, setDrawings] = useState([]);
  const [mapProvider] = useState(() => MapProviderFactory.getProvider('nominatim'));

  // Geocode location text to coordinates using provider
  const geocodeLocation = async (locationName) => {
    return await mapProvider.geocodeLocation(locationName);
  };

  // Fetch polygon boundary from provider
  const fetchPolygonBoundary = async (lat, lon, name) => {
    return await mapProvider.fetchPolygonBoundary(lat, lon, name);
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
    const polygonData = await fetchPolygonBoundary(
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

    // Only add marker if no polygon was added
    if (!hasPolygon) {
      const newMarker = {
        id: Date.now(),
        ...location,
      };
      setMarkers([...markers, newMarker]);
    }

    setLocationInput('');
    setSuggestions([]);
    setShowSuggestions(false);

    if (map) {
      map.flyTo(location.coords, 12);
    }
  };

  const handleAddLocation = async () => {
    if (!locationInput.trim()) {
      alert('Please enter a location');
      return;
    }

    const location = await geocodeLocation(locationInput);
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
      if (map) {
        map.flyTo(location.coords, 10);
      }
    } else {
      alert('Location not found. Try a more specific address.');
    }
  };

  const handleDelete = (id) => {
    setMarkers(markers.filter((marker) => marker.id !== id));
    setPolygons(polygons.filter((polygon) => polygon.id !== id));
  };

  const handleDrawingComplete = (e) => {
    const layer = e.layer;
    setDrawings([...drawings, layer]);
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
            <h3>Locations ({markers.length + polygons.length})</h3>
            {markers.length === 0 && polygons.length === 0 ? (
              <p className="empty-state">
                No locations yet. Add one to get started!
              </p>
            ) : (
              <ul>
                {polygons.map((polygon) => (
                  <li key={polygon.id} className="marker-item polygon-item">
                    <span>📍 {polygon.name}</span>
                    <button
                      onClick={() => handleDelete(polygon.id)}
                      className="delete-btn"
                    >
                      ✕
                    </button>
                  </li>
                ))}
                {markers.map((marker) => (
                  <li key={marker.id} className="marker-item">
                    <span>{marker.name}</span>
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

        <MapContainer
          center={[20, 0]}
          zoom={2}
          className="map"
          whenCreated={setMap}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          <FeatureGroup>
            <EditControl
              position="topright"
              onCreated={handleDrawingComplete}
              draw={{
                rectangle: true,
                polygon: true,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: true,
              }}
            />
          </FeatureGroup>

          {markers.map((marker) => (
            <Marker key={marker.id} position={marker.coords}>
              <Popup>{marker.name}</Popup>
            </Marker>
          ))}

          {polygons.map((polygon) => (
            <Polygon
              key={polygon.id}
              positions={polygon.coords}
              color="#667eea"
              weight={2}
              opacity={0.7}
              fillOpacity={0.3}
            >
              <Popup>{polygon.name}</Popup>
            </Polygon>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
