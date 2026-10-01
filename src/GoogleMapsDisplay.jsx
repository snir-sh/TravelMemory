import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, LoadScript, Marker, Polygon, Polyline } from '@react-google-maps/api';

// Define outside component to prevent recreating on each render
const GOOGLE_MAPS_LIBRARIES = ['places'];

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
  onPolygonComplete,
  onMapLoaded,
  mapRef,
}) {
  // ALL HOOKS FIRST - before any conditional logic
  const [map, setMap] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [tempPolyline, setTempPolyline] = useState(null);
  const mapClickListenerRef = useRef(null);

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  // Handle map load
  const handleMapLoad = useCallback((mapInstance) => {
    try {
      console.log('[GoogleMapsDisplay] Map loaded');
      setMap(mapInstance);
      if (mapRef) {
        mapRef.current = mapInstance;
      }

      if (onMapLoaded) {
        onMapLoaded(mapInstance);
      }
    } catch (err) {
      console.error('[GoogleMapsDisplay] Error during map load:', err);
      setError(err.message);
    }
  }, [mapRef, onMapLoaded]);

  // Add point to drawing polygon
  const handleMapClick = useCallback((event) => {
    if (!isDrawing || !map) return;

    const newPoint = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
    };

    setDrawingPoints((prev) => {
      const updated = [...prev, newPoint];
      console.log(`[GoogleMapsDisplay] Point added (${updated.length})`);
      return updated;
    });
  }, [isDrawing, map]);

  // Set up and tear down map click listener
  useEffect(() => {
    if (!map) return;

    if (isDrawing) {
      console.log('[GoogleMapsDisplay] Drawing mode ON - click to add points');
      mapClickListenerRef.current = map.addListener('click', handleMapClick);
    } else {
      if (mapClickListenerRef.current) {
        window.google.maps.event.removeListener(mapClickListenerRef.current);
        mapClickListenerRef.current = null;
      }
      console.log('[GoogleMapsDisplay] Drawing mode OFF');
    }

    return () => {
      if (mapClickListenerRef.current) {
        window.google.maps.event.removeListener(mapClickListenerRef.current);
      }
    };
  }, [map, isDrawing, handleMapClick]);

  // Draw polyline connecting all points
  useEffect(() => {
    if (drawingPoints.length > 1) {
      setTempPolyline(drawingPoints);
    } else {
      setTempPolyline(null);
    }
  }, [drawingPoints]);

  // Pan to latest marker/polygon
  useEffect(() => {
    if ((markers.length > 0 || polygons.length > 0) && map && isLoaded) {
      try {
        if (markers.length > 0) {
          const lastMarker = markers[markers.length - 1];
          map.panTo({ lat: lastMarker.coords[0], lng: lastMarker.coords[1] });
          map.setZoom(12);
        } else if (polygons.length > 0) {
          const lastPolygon = polygons[polygons.length - 1];
          if (lastPolygon.coords[0]) {
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

  // Check if Google Maps is already loaded to prevent double-loading warnings
  const isGoogleMapsLoaded = typeof window !== 'undefined' && window.google?.maps;

  const toggleDrawing = () => {
    if (isDrawing) {
      // Exiting drawing mode
      setIsDrawing(false);
      setDrawingPoints([]);
      setTempPolyline(null);
    } else {
      // Entering drawing mode
      setIsDrawing(true);
      setDrawingPoints([]);
      console.log('[GoogleMapsDisplay] Entering drawing mode');
    }
  };

  const undoLastPoint = () => {
    setDrawingPoints((prev) => {
      const updated = prev.slice(0, -1);
      console.log(`[GoogleMapsDisplay] Undo - ${updated.length} points remaining`);
      return updated;
    });
  };

  const completePolygon = () => {
    if (drawingPoints.length < 3) {
      alert('Need at least 3 points to create a polygon');
      return;
    }

    // Convert to [lat, lng] format
    const polygonCoords = drawingPoints.map((p) => [p.lat, p.lng]);

    if (onPolygonComplete) {
      onPolygonComplete({
        id: Date.now(),
        name: `Drawn Polygon ${Date.now()}`,
        coords: polygonCoords,
      });
    }

    // Reset drawing state
    setIsDrawing(false);
    setDrawingPoints([]);
    setTempPolyline(null);
    console.log('[GoogleMapsDisplay] Polygon completed and saved');
  };

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
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <LoadScript
        googleMapsApiKey={apiKey}
        libraries={GOOGLE_MAPS_LIBRARIES}
        onLoad={handleLoadSuccess}
        onError={handleLoadError}
        preventScriptLoad={isGoogleMapsLoaded}
      >
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={defaultCenter}
          zoom={2}
          onLoad={handleMapLoad}
          options={{
            cursor: isDrawing ? 'crosshair' : 'grab',
          }}
        >
          {/* Render existing markers */}
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

          {/* Render existing polygons */}
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

          {/* Drawing points */}
          {drawingPoints.map((point, idx) => (
            <Marker
              key={`drawing-${idx}`}
              position={point}
              title={`Point ${idx + 1}`}
              icon={{
                path: 'M0,-24a24,24 0 1,0 48,0a24,24 0 1,0 -48,0',
                fillColor: '#ff6b6b',
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 2,
                scale: 0.5,
              }}
            />
          ))}

          {/* Drawing polyline */}
          {tempPolyline && (
            <Polyline
              path={tempPolyline}
              options={{
                geodesic: true,
                strokeColor: '#667eea',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                icons: [
                  {
                    icon: {
                      path: 'M 0,-1 0,1',
                      strokeOpacity: 1,
                      scale: 3,
                    },
                    offset: '0',
                    repeat: '10px',
                  },
                ],
              }}
            />
          )}
        </GoogleMap>
      </LoadScript>

      {/* Drawing controls */}
      {isLoaded && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            padding: '12px',
            display: 'flex',
            gap: '8px',
            zIndex: 10,
          }}
        >
          <button
            onClick={toggleDrawing}
            style={{
              padding: '8px 16px',
              background: isDrawing ? '#ff6b6b' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '12px',
            }}
          >
            {isDrawing ? '✕ Cancel' : '✏️ Draw'}
          </button>

          {isDrawing && drawingPoints.length > 0 && (
            <>
              <button
                onClick={undoLastPoint}
                style={{
                  padding: '8px 16px',
                  background: '#ffa500',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '12px',
                }}
              >
                ↶ Undo
              </button>

              {drawingPoints.length >= 3 && (
                <button
                  onClick={completePolygon}
                  style={{
                    padding: '8px 16px',
                    background: '#51cf66',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '12px',
                  }}
                >
                  ✓ Done ({drawingPoints.length})
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Drawing mode indicator */}
      {isDrawing && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: '#667eea',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            zIndex: 10,
          }}
        >
          📍 Click on map to add points ({drawingPoints.length})
        </div>
      )}
    </div>
  );
}
