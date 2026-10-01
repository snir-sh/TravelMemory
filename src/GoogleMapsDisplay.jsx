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
  const drawingManagerRef = useRef(null);
  const drawnShapesRef = useRef([]);
  const isInitializedRef = useRef(false);

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  // Memoize handleMapLoad to prevent unnecessary re-renders
  const handleMapLoad = useCallback((mapInstance) => {
    // Guard against multiple initializations
    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;

    setMap(mapInstance);
    if (mapRef) {
      mapRef.current = mapInstance;
    }

    // Initialize drawing manager only once
    if (!window.google?.maps?.drawing?.DrawingManager) {
      return;
    }

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
        drawnShapesRef.current.push(e.overlay);
        // Switch back to hand tool
        drawingManager.setDrawingMode(null);
      }
    );

    if (onMapLoaded) {
      onMapLoaded(mapInstance);
    }
  }, [mapRef, onMapLoaded]);

  // When markers change, pan to the latest one if it's the first or only location
  useEffect(() => {
    if ((markers.length > 0 || polygons.length > 0) && map) {
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
    }
  }, [markers.length, polygons.length, map]);

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

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      libraries={['drawing', 'places']}
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
