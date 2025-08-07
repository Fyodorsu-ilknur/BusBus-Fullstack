// frontend/src/components/Map.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getDistance } from 'geolib';

import './Map.css';

const locationIcon = require('../assets/location.png');
const busIcon = require('../assets/bus_icon.png');

const SIMULATED_BUS_SPEED_KMH = 30;
const SIMULATED_BUS_SPEED_MPS = (SIMULATED_BUS_SPEED_KMH * 1000) / 3600;

function MapComponent({
  vehicles,
  onVehicleClick,
  selectedVehicle,
  stops, // Not directly used for rendering individual stop markers anymore from this prop
  routes,
  selectedRoute,
  selectedStop, // Could be null when deselected
  mapCenter,
  zoomLevel = 13,
  onCurrentStopChange,
  displayStartEndMarkers,
  startPointInfo,
  endPointInfo
}) {
  const mapRef = useRef();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [animatedBusPosition, setAnimatedBusPosition] = useState(null);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const animationIntervalRef = useRef(null);
  const [currentDistanceToDestination, setCurrentDistanceToDestination] = useState(null);
  const [currentTimeToDestination, setCurrentTimeToDestination] = useState(null);
  const [displayStopsOnRoute, setDisplayStopsOnRoute] = useState({ current: null, next: null });

  const selectedStops = useSelector(state => state.selectedItems?.selectedStopIds || []);
  const allStops = useSelector(state => state.selectedItems?.allStops || []);

  const MAP_STYLE = 'https://api.maptiler.com/maps/basic/style.json?key=xOQhMUZleM9cojouQ0fu';

  const onMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  useEffect(() => {
    // Ensure mapCenter is a valid array of numbers before flying
    if (mapCenter && Array.isArray(mapCenter) && mapCenter.length === 2 && typeof mapCenter[0] === 'number' && typeof mapCenter[1] === 'number' && mapLoaded) {
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: mapCenter,
          zoom: zoomLevel,
          duration: 1000
        });
      }
    }
  }, [mapCenter, zoomLevel, mapLoaded]);

  // Otobüs animasyonu, kalan mesafe ve süre hesaplaması, DURAK GÖRÜNTÜLEME için useEffect
  useEffect(() => {
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }

    if (mapLoaded && selectedRoute?.directions?.['1'] && selectedRoute.directions['1'].length > 0) {
      const pathCoordinates = selectedRoute.directions['1'];
      const routeStops = selectedRoute.stops;

      // Ensure destinationPoint coordinates are valid numbers
      const lastCoord = pathCoordinates[pathCoordinates.length - 1];
      const destinationPoint = (lastCoord && typeof lastCoord[0] === 'number' && typeof lastCoord[1] === 'number')
        ? { lat: lastCoord[0], lng: lastCoord[1] }
        : null;

      setCurrentPathIndex(0);
      // Ensure first coordinate is valid
      const firstCoord = pathCoordinates[0];
      if (firstCoord && typeof firstCoord[0] === 'number' && typeof firstCoord[1] === 'number') {
        setAnimatedBusPosition({ lat: firstCoord[0], lng: firstCoord[1] });
      } else {
        setAnimatedBusPosition(null); // Hide bus if coordinates are invalid
      }
      
      setDisplayStopsOnRoute({ current: null, next: null });
      if (onCurrentStopChange) { // Send null initially
        onCurrentStopChange(null);
      }

      // Distance and time calculations
      if (destinationPoint && firstCoord) {
        try {
          const initialDistance = getDistance(
            { latitude: firstCoord[0], longitude: firstCoord[1] },
            { latitude: destinationPoint.lat, longitude: destinationPoint.lng }
          );
          setCurrentDistanceToDestination(initialDistance);
          if (SIMULATED_BUS_SPEED_MPS > 0 && initialDistance > 0) {
            setCurrentTimeToDestination(initialDistance / SIMULATED_BUS_SPEED_MPS);
          } else {
            setCurrentTimeToDestination(0);
          }
        } catch (error) {
          console.error("Error calculating initial distance/time:", error);
          setCurrentDistanceToDestination(null);
          setCurrentTimeToDestination(null);
        }
      } else {
        setCurrentDistanceToDestination(null);
        setCurrentTimeToDestination(null);
      }

      animationIntervalRef.current = setInterval(() => {
        setCurrentPathIndex(prevIndex => {
          const nextIndex = prevIndex + 1;

          if (nextIndex >= pathCoordinates.length) {
            clearInterval(animationIntervalRef.current);
            animationIntervalRef.current = null;
            if (destinationPoint) { // Null check
                setAnimatedBusPosition({ lat: destinationPoint.lat, lng: destinationPoint.lng });
            }
            setCurrentDistanceToDestination(0); // Reset when animation finishes
            setCurrentTimeToDestination(0);
            const finalStop = routeStops[routeStops.length - 1] || null;
            setDisplayStopsOnRoute({ current: finalStop, next: null });
            if (onCurrentStopChange) { // Notify final stop
                onCurrentStopChange(finalStop);
            }
            return prevIndex;
          }

          const nextCoord = pathCoordinates[nextIndex];
          // Ensure nextCoord exists and its coordinates are numbers
          if (nextCoord && typeof nextCoord[0] === 'number' && typeof nextCoord[1] === 'number') {
            setAnimatedBusPosition({ lat: nextCoord[0], lng: nextCoord[1] });
          } else {
            // If nextCoord is invalid, stop animation
            clearInterval(animationIntervalRef.current);
            animationIntervalRef.current = null;
            console.error("Invalid coordinate detected during animation:", nextCoord);
            setAnimatedBusPosition(null);
            setCurrentDistanceToDestination(null);
            setCurrentTimeToDestination(null);
            return prevIndex;
          }
          
          // Remaining distance and time calculations
          if (destinationPoint && nextCoord) { // Null check
            try {
              const remainingDist = getDistance(
                { latitude: nextCoord[0], longitude: nextCoord[1] },
                { latitude: destinationPoint.lat, longitude: destinationPoint.lng }
              );
              setCurrentDistanceToDestination(remainingDist);
              if (SIMULATED_BUS_SPEED_MPS > 0 && remainingDist > 0) {
                setCurrentTimeToDestination(remainingDist / SIMULATED_BUS_SPEED_MPS);
              } else {
                setCurrentTimeToDestination(0);
              }
            } catch (error) {
              console.error("Error calculating remaining distance or time:", error);
              setCurrentDistanceToDestination(null);
              setCurrentTimeToDestination(null);
            }
          }

          if (routeStops && routeStops.length > 0) {
            const progressPercentage = nextIndex / pathCoordinates.length;
            const estimatedStopIndex = Math.min(routeStops.length - 1, Math.floor(progressPercentage * routeStops.length));

            let current = null;
            let next = null;

            if (estimatedStopIndex < routeStops.length) {
              current = routeStops[estimatedStopIndex];
              if (estimatedStopIndex + 1 < routeStops.length) {
                next = routeStops[estimatedStopIndex + 1];
              }
            }
            setDisplayStopsOnRoute({ current, next });
            if (onCurrentStopChange) { // Notify current stop at each animation step
                onCurrentStopChange(current);
            }
          }
          return nextIndex;
        });
      }, 250);

    } else {
      setAnimatedBusPosition(null);
      setCurrentPathIndex(0);
      setCurrentDistanceToDestination(null);
      setCurrentTimeToDestination(null);
      setDisplayStopsOnRoute({ current: null, next: null });
      if (onCurrentStopChange) {
        onCurrentStopChange(null);
      }
    }

    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      setCurrentDistanceToDestination(null);
      setCurrentTimeToDestination(null);
      setDisplayStopsOnRoute({ current: null, next: null });
      if (onCurrentStopChange) {
        onCurrentStopChange(null);
      }
    };
  }, [selectedRoute, mapLoaded, onCurrentStopChange]);


  const formatTime = (totalSeconds) => {
    if (totalSeconds === null || isNaN(totalSeconds) || totalSeconds < 0) return 'Hesaplanıyor...';
    if (totalSeconds < 1) return 'Vardı';

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);

    if (minutes > 0) {
        return `${minutes} dk ${seconds} sn`;
    } else {
        return `${seconds} sn`;
    }
  };


  const routeGeoJSON = React.useMemo(() => {
    if (!selectedRoute || !selectedRoute.directions || !selectedRoute.directions['1'] || selectedRoute.directions['1'].length === 0) {
      return null;
    }

    const features = [];
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: selectedRoute.directions['1'].map(coord => [coord[1], coord[0]])
      },
      properties: {
        direction: 'gidis'
      }
    });

    return {
      type: 'FeatureCollection',
      features: features
    };
  }, [selectedRoute]);

  const routeEndPoint = React.useMemo(() => {
    if (!selectedRoute?.directions?.['1'] || selectedRoute.directions['1'].length === 0) {
      return null;
    }
    const lastCoord = selectedRoute.directions['1'][selectedRoute.directions['1'].length - 1];
    // Ensure coordinates exist and are numbers
    return (lastCoord && typeof lastCoord[0] === 'number' && typeof lastCoord[1] === 'number')
        ? { lat: lastCoord[0], lng: lastCoord[1] }
        : null;
  }, [selectedRoute]);


  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: 27.128,
        latitude: 38.419,
        zoom: 12
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={MAP_STYLE}
      onLoad={onMapLoad}
    >
      {/* Route line is drawn only if selectedRoute exists */}
      {mapLoaded && selectedRoute && routeGeoJSON && (
        <Source id="route-data" type="geojson" data={routeGeoJSON}>
          <Layer
            id="route-gidis"
            type="line"
            filter={['==', 'direction', 'gidis']}
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{ 'line-color': 'blue', 'line-width': 5, 'line-opacity': 0.7 }}
          />
        </Source>
      )}

      {/* Stop Marker (for selected stop from search panel) */}
      {/* Ensure selectedStop exists and its lat/lng are numbers */}
      {mapLoaded && selectedStop && typeof selectedStop.lat === 'number' && typeof selectedStop.lng === 'number' && (
        <Marker
          longitude={selectedStop.lng}
          latitude={selectedStop.lat}
          anchor="center"
        >
          <img
            src={locationIcon}
            alt="Durak"
            style={{ width: '29px', height: '29px', cursor: 'pointer' }}
          />
        </Marker>
      )}

      {/* ALL STOP MARKERS ON THE ROUTE - ONLY if selectedRoute exists */}
      {mapLoaded && selectedRoute?.stops && selectedRoute.stops.map((stop) => {
        const isSelected = selectedStops.includes(stop.id);
        return (
          // Ensure stop exists and its lat/lng are numbers
          stop && typeof stop.lat === 'number' && typeof stop.lng === 'number' && (
            <Marker
              key={stop.id + "-" + stop.sequence}
              longitude={stop.lng}
              latitude={stop.lat}
              anchor="center"
            >
              {/* Special style for selected stops, default for normal stops */}
              <div style={{
                width: isSelected ? '18px' : '12px',
                height: isSelected ? '18px' : '12px',
                backgroundColor: isSelected ? '#FFD700' : 'red', // Gold for selected
                borderRadius: '50%',
                border: isSelected ? '3px solid #FF6B35' : '2px solid white',
                boxShadow: isSelected ? '0 0 15px rgba(255, 215, 0, 0.8)' : '0 0 5px rgba(0,0,0,0.5)',
                animation: isSelected ? 'pulse 2s infinite' : 'none'
              }} title={stop.name + (isSelected ? ' (Seçili)' : '')}></div>
            </Marker>
          )
        );
      })}

      {/* ADDITIONAL MARKERS FOR SELECTED STOPS (selected outside of route) */}
      {mapLoaded && selectedStops.map(stopId => {
        const stop = allStops.find(s => s.id === stopId);
        // Don't show this marker if the stop is already shown on the route
        const isOnSelectedRoute = selectedRoute?.stops?.some(routeStop => routeStop.id === stopId);
        
        // Ensure stop exists and its lat/lng are numbers
        if (stop && !isOnSelectedRoute && typeof stop.lat === 'number' && typeof stop.lng === 'number') {
          return (
            <Marker
              key={`selected-${stopId}`}
              longitude={stop.lng}
              latitude={stop.lat}
              anchor="center"
            >
              <div style={{
                width: '20px',
                height: '20px',
                backgroundColor: '#00FF7F', // Light green
                borderRadius: '50%',
                border: '3px solid #008B8B',
                boxShadow: '0 0 20px rgba(0, 255, 127, 0.9)',
                animation: 'pulse 1.5s infinite'
              }} title={stop.name + ' '}></div>
            </Marker>
          );
        }
        return null;
      })}

      {/* Route Info Overlay */}
      {/* start_point and end_point are strings, no need for complex checks here */}
      {mapLoaded && selectedRoute?.start_point && selectedRoute?.end_point && (
        <div className="route-info-overlay">
          <div className="route-info-box">
            <strong>{selectedRoute.route_number}</strong> - {selectedRoute.start_point} → {selectedRoute.end_point}
          </div>
        </div>
      )}

      {/* Bus Markers (Real-time buses - if used) */}
      {mapLoaded && vehicles.map((vehicle) => (
        // Ensure vehicle and its lat/lng are numbers
        vehicle && typeof vehicle.lat === 'number' && typeof vehicle.lng === 'number' && (
            <Marker
            key={vehicle.id}
            longitude={vehicle.lng}
            latitude={vehicle.lat}
            anchor="center"
            >
            <img
                src={locationIcon}
                alt="Otobüs"
                style={{ width: '30px', height: '30px', cursor: 'pointer' }}
                onClick={() => onVehicleClick(vehicle)}
            />
            </Marker>
        )
      ))}

      {/* Animated Bus Marker and Pop-up - ONLY if selectedRoute exists */}
      {/* Ensure animatedBusPosition exists and its lat/lng are numbers */}
      {mapLoaded && animatedBusPosition && typeof animatedBusPosition.lat === 'number' && typeof animatedBusPosition.lng === 'number' && selectedRoute && (
        <Marker
          longitude={animatedBusPosition.lng}
          latitude={animatedBusPosition.lat}
          anchor="center"
        >
          <img
            src={busIcon}
            alt="Animated Bus"
            style={{ width: '40px', height: '40px' }}
          />
          {/* Remaining distance, speed, and time pop-up */}
          {currentDistanceToDestination !== null && currentTimeToDestination !== null && (
            <div className="bus-popup">
              <div>Kalan: {(currentDistanceToDestination / 1000).toFixed(2)} km</div>
              <div>Hız: {SIMULATED_BUS_SPEED_KMH} km/s</div>
              <div>Süre: {formatTime(currentTimeToDestination)}</div>
            </div>
          )}
        </Marker>
      )}

      {/* Route End Point Marker - ONLY if selectedRoute exists */}
      {/* Ensure routeEndPoint exists and its lat/lng are numbers */}
      {mapLoaded && routeEndPoint && typeof routeEndPoint.lat === 'number' && typeof routeEndPoint.lng === 'number' && selectedRoute && (
        <Marker
          longitude={routeEndPoint.lng}
          latitude={routeEndPoint.lat}
          anchor="center"
        >
          <img
            src={locationIcon}
            alt="Bitiş Noktası"
            style={{ width: '35px', height: '35px', filter: 'hue-rotate(240deg)' }}
          />
        </Marker>
      )}

      {/* START AND END STOP MARKERS (if displayStartEndMarkers prop is true) */}
      {mapLoaded && displayStartEndMarkers && selectedRoute?.stops && selectedRoute.stops.length > 0 && (
        <>
          {/* Start Stop Marker */}
          {/* Ensure startPointInfo exists and its lat/lng are numbers */}
          {startPointInfo && typeof startPointInfo.lat === 'number' && typeof startPointInfo.lng === 'number' && (
            <Marker
              longitude={startPointInfo.lng}
              latitude={startPointInfo.lat}
              anchor="center"
            >
              <img
                src={locationIcon}
                alt="Başlangıç Durağı"
                style={{ width: '35px', height: '35px', filter: 'hue-rotate(120deg)' }}
              />
              <div className="stop-popup">
                <strong>{selectedRoute.route_number} No'lu Hattın Başlangıç Durağı</strong>
                <br />
                {startPointInfo.name}
              </div>
            </Marker>
          )}

          {/* End Stop Marker */}
          {/* Ensure endPointInfo exists and its lat/lng are numbers */}
          {endPointInfo && typeof endPointInfo.lat === 'number' && typeof endPointInfo.lng === 'number' && (
            <Marker
              longitude={endPointInfo.lng}
              latitude={endPointInfo.lat}
              anchor="center"
            >
              <img
                src={locationIcon}
                alt="Bitiş Durağı"
                style={{ width: '35px', height: '35px', filter: 'hue-rotate(240deg)' }}
              />
              <div className="stop-popup">
                <strong>{selectedRoute.route_number} No'lu Hattın Bitiş Durağı</strong>
                <br />
                {endPointInfo.name}
              </div>
            </Marker>
          )}
        </>
      )}
    </Map>
  );
}

export default MapComponent;