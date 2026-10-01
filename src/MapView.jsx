import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, FeatureGroup, Polygon } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
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

  // Geocode location text to coordinates
  const geocodeLocation = async (locationName) => {
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          locationName
        )}&count=1&language=en&format=json`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const displayName = `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}${result.country ? ', ' + result.country : ''}`;
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
  };

  // Fetch polygon boundary from Nominatim
  const fetchPolygonBoundary = async (lat, lon, name) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&polygon_geojson=1`
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
  };
  const fetchSuggestions = async (query) => {
    console.log('Fetching suggestions for:', query);
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          query
        )}&count=5&language=en&format=json`
      );
      const data = await response.json();
      
      if (data.results) {
        const suggestions = data.results.map((result) => ({
          lat: result.latitude,
          lon: result.longitude,
          display_name: `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}${result.country ? ', ' + result.country : ''}`,
          geojson: null, // Open-Meteo doesn't provide geojson
        }));
        console.log('Suggestions received:', suggestions);
        setSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      }
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

    // Add marker
    const newMarker = {
      id: Date.now(),
      ...location,
    };
    setMarkers([...markers, newMarker]);

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
