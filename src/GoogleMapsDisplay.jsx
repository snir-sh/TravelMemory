import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, LoadScript, Marker, Polygon } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '12px',
};

const defaultCenter = {
  lat: 20,
  lng: 0,
};

export default function GoogleMapsDisplay({
  markers,
  polygons,
  onMapLoaded,
  mapRef,
}) {
  // ALL HOOKS FIRST - before any conditional logic
  const [map, setMap] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const drawingManagerRef = useRef(null);
  const drawnShapesRef = useRef([]);
  const isInitializedRef = useRef(false);

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  // Memoize handleMapLoad to prevent unnecessary re-renders
  const handleMapLoad = useCallback((mapInstance) => {
    try {
      // Guard against multiple initializations
      if (isInitializedRef.current) {
        console.log('[GoogleMapsDisplay] Map already initialized, skipping');
        return;
      }
      isInitializedRef.current = true;

      console.log('[GoogleMapsDisplay] Map loaded, initializing...');
      setMap(mapInstance);
      if (mapRef) {
        mapRef.current = mapInstance;
      }

      // Check if Google Maps drawing API is available
      if (!window.google?.maps?.drawing?.DrawingManager) {
        console.warn('[GoogleMapsDisplay] Drawing Manager not available');
        if (onMapLoaded) {
          onMapLoaded(mapInstance);
        }
        return;
      }

      // Initialize drawing manager only once
      const drawingManager = new window.google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: true,
        drawingControlOptions: {
          position: window.google.maps.ControlPosition.TOP_RIGHT,
          drawingModes: [
            window.google.maps.drawing.OverlayType.POLYLINE,
            window.google.maps.drawing.OverlayType.POLYGON,
            window.google.maps.drawing.OverlayType.RECTANGLE,
          ],
        },
        polylineOptions: {
          editable: true,
          strokeColor: '#667eea',
          strokeWeight: 3,
        },
        polygonOptions: {
          editable: true,
          fillColor: '#667eea',
          fillOpacity: 0.3,
          strokeColor: '#667eea',
          strokeWeight: 2,
        },
        rectangleOptions: {
          editable: true,
          fillColor: '#667eea',
          fillOpacity: 0.3,
          strokeColor: '#667eea',
          strokeWeight: 2,
        },
      });

      drawingManager.setMap(mapInstance);
      drawingManagerRef.current = drawingManager;
      drawnShapesRef.current = [];

      // Handle completed shapes
      window.google.maps.event.addListener(
        drawingManager,
        'overlaycomplete',
        (e) => {
          console.log('[GoogleMapsDisplay] Shape drawn');
          drawnShapesRef.current.push(e.overlay);
          // Switch back to hand tool
          drawingManager.setDrawingMode(null);
        }
      );

      console.log('[GoogleMapsDisplay] Map fully initialized');
      if (onMapLoaded) {
        onMapLoaded(mapInstance);
      }
    } catch (err) {
      console.error('[GoogleMapsDisplay] Error during map load:', err);
      setError(err.message);
    }
  }, [mapRef, onMapLoaded]);

  // When markers change, pan to the latest one if it's the first or only location
  useEffect(() => {
    if ((markers.length > 0 || polygons.length > 0) && map && isLoaded) {
      try {
        if (markers.length > 0) {
          const lastMarker = markers[markers.length - 1];
          if (map.panTo) {
            map.panTo({ lat: lastMarker.coords[0], lng: lastMarker.coords[1] });
            map.setZoom(12);
          }
        } else if (polygons.length > 0) {
          const lastPolygon = polygons[polygons.length - 1];
          // Center on first coordinate of polygon
          if (map.panTo && lastPolygon.coords[0]) {
            map.panTo({ lat: lastPolygon.coords[0][0], lng: lastPolygon.coords[0][1] });
            map.setZoom(12);
          }
        }
      } catch (err) {
        console.error('[GoogleMapsDisplay] Error panning to location:', err);
      }
    }
  }, [markers, polygons, map, isLoaded]);

  const handleLoadSuccess = () => {
    console.log('[GoogleMapsDisplay] LoadScript completed successfully');
    setIsLoaded(true);
  };

  const handleLoadError = (error) => {
    console.error('[GoogleMapsDisplay] LoadScript error:', error);
    setError(`Failed to load Google Maps: ${error?.message || 'Unknown error'}`);
  };

  // Check if Google Maps is already loaded to prevent double-loading warnings in StrictMode
  const isGoogleMapsLoaded = typeof window !== 'undefined' && window.google?.maps;

  if (!apiKey) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: '#f5f5f5',
          color: '#999',
          borderRadius: '12px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p>⚠️ Google Maps API key not found</p>
          <small>Set REACT_APP_GOOGLE_MAPS_API_KEY in .env</small>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: '#ffebee',
          color: '#c62828',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div>
          <p>❌ Error loading map</p>
          <small>{error}</small>
        </div>
      </div>
    );
  }

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      libraries={['drawing', 'places']}
      onLoad={handleLoadSuccess}
      onError={handleLoadError}
      preventScriptLoad={isGoogleMapsLoaded}
    >
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={2}
        onLoad={handleMapLoad}
      >
        {/* Render markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={{
              lat: marker.coords[0],
              lng: marker.coords[1],
            }}
            title={marker.name}
          />
        ))}

        {/* Render polygons */}
        {polygons.map((polygon) => (
          <Polygon
            key={polygon.id}
            paths={polygon.coords.map((coord) => ({
              lat: coord[0],
              lng: coord[1],
            }))}
            options={{
              fillColor: '#667eea',
              fillOpacity: 0.3,
              strokeColor: '#667eea',
              strokeWeight: 2,
            }}
            title={polygon.name}
          />
        ))}
      </GoogleMap>
    </LoadScript>
  );
}
