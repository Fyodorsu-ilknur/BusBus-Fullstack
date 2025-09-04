// frontend/src/components/Map.js

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Map, { Marker, Source, Layer, Popup } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getDistance } from 'geolib';
import './Map.css';

import busIconUrl from '../assets/red_bus.png';
import locationIconUrl from '../assets/location.png';

const SIMULATED_BUS_SPEED_KMH = 30;
const SIMULATED_BUS_SPEED_MPS = (SIMULATED_BUS_SPEED_KMH * 1000) / 3600;
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



const ROUTE_COLORS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFD700', '#FF69B4', '#00CED1', '#FF4500',
  '#9370DB', '#32CD32', '#FF1493', '#00FA9A', '#1E90FF', '#FF8C00', '#DA70D6',
  '#00FFFF', '##FFB6C1', '#98FB98', '#87CEEB', '#DDA0DD', '#F0E68C'
];

const NAVIGATION_BUS_COLOR = '#4285F4'; 
const NAVIGATION_WALK_COLOR = '#EA4335'; 

const LIGHT_MAP_STYLE_URL = 'https://api.maptiler.com/maps/streets-v2-pastel/style.json?key=xOQhMUZleM9cojouQ0fu';
const DARK_MAP_STYLE_URL = 'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=xOQhMUZleM9cojouQ0fu';

function MapComponent({
  vehicles = [], 
  selectedFleetVehicle, 
  selectedFleetVehicles = [], // Çoklu seçilen araçlar
 
  selectedVehicle, 
  selectedRoute,
  selectedStop,
  mapCenter,
  zoomLevel = 13,
  onCurrentStopChange,
  onAnimatedDataChange,
  theme,
  isPanelOpen, 
  isRouteDetailsPanelOpen,
  isDepartureTimesPanelOpen,
  isRouteNavigationPanelOpen,
  isFleetTrackingPanelOpen, 
  navigationRoute,
  selectedRouteIds,
  allRoutes,
  currentDirection,
  currentAnimatedStop,
  animatedDistanceToDestination,
  animatedTimeToDestination,
  selectedPopupInfo = [], 
  
  // ✅ YENİ: Geçmiş izleme props'ları
  historicalTrackingData = [],
  currentHistoricalVehicle,
  currentHistoricalIndex = 0,
  isHistoricalMode = false,
  
}) {
  const mapRef = useRef();

  const [mapLoaded, setMapLoaded] = useState(false);

  const userInteractedFleetZoomRef = useRef(false);

  const [animatedBusPosition, setAnimatedBusPosition] = useState(null);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const animationIntervalRef = useRef(null);
  const [displayStopsOnRoute, setDisplayStopsOnRoute] = useState({ current: null, next: null });

  const [animatedFleetPositions, setAnimatedFleetPositions] = useState({}); 
  const fleetAnimationIntervals = useRef({}); 

  const [selectedRoutesData, setSelectedRoutesData] = useState({});
  const [routePopup, setRoutePopup] = useState(null);
  const [hoveredRoute, setHoveredRoute] = useState(null);

  // ✅ YENİ: Geçmiş izleme state'leri
  const [historicalPassedRoute, setHistoricalPassedRoute] = useState(null);
  const [historicalFutureRoute, setHistoricalFutureRoute] = useState(null);

  const selectedStops = useSelector(state => state.selectedItems?.selectedStopIds || []);
  const allStops = useSelector(state => state.selectedItems?.allStops || []);

  const onMapLoad = useCallback(() => {
    setMapLoaded(true);
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [27.128, 38.419], 
        zoom: 12,
        duration: 0
      });
    }
  }, []);

  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      const map = mapRef.current.getMap();

      const handleUserInteraction = () => {
        userInteractedFleetZoomRef.current = true; 
      };

      map.on('movestart', handleUserInteraction);
      map.on('dragstart', handleUserInteraction);
      map.on('zoomstart', handleUserInteraction);

      return () => {
        map.off('movestart', handleUserInteraction);
        map.off('dragstart', handleUserInteraction);
        map.off('zoomstart', handleUserInteraction);
      };
    }
  }, [mapLoaded]);

  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      const newStyleUrl = theme === 'dark' ? DARK_MAP_STYLE_URL : LIGHT_MAP_STYLE_URL;
      mapRef.current.getMap().setStyle(newStyleUrl);
    }
  }, [theme, mapLoaded]);

  const getRouteColor = (routeIndex) => {
    return ROUTE_COLORS[routeIndex % ROUTE_COLORS.length];
  };

  const getVehicleStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'aktif/çalışıyor':
      case 'aktif':
        return '#28a745'; 
      case 'bakımda':
        return '#dc3545';   
      case 'servis dışı':
        return '#6c757d'; 
      default:
        return '#ffc107'; 
    }
  };

  const getPopupContent = useCallback((vehicle) => {
    if (!selectedPopupInfo || selectedPopupInfo.length === 0) {
      return []; 
    }

    return selectedPopupInfo.map(info => {
      let actualValue; 

      switch(info.key) {
        case 'speed':
          actualValue = `${vehicle.speed || 45} km/h`;
          break;
        case 'plate':
          actualValue = vehicle.plate;
          break;
        case 'routeCode':
          actualValue = vehicle.routeCode || 'Bilinmiyor';
          break;
        case 'status':
          actualValue = vehicle.status || 'Aktif';
          break;
        case 'lastGpsTime':
          actualValue = vehicle.lastGpsTime || '14:00:25'; 
          break;
        case 'odometer':
          actualValue = vehicle.odometer ? `${vehicle.odometer.toLocaleString()} km` : 'Bilinmiyor';
          break;
        case 'batteryVolt':
          actualValue = vehicle.batteryVolt || '28 V'; 
          break;
        case 'fuelRate':
          actualValue = vehicle.fuelRate || '15 L/saat';
          break;
        case 'location':
          actualValue = `${vehicle.location?.lat?.toFixed(4) || '38.4192'}, ${vehicle.location?.lng?.toFixed(4) || '27.1287'}`;
          break;
        case 'driverName':
          actualValue = vehicle.driverInfo?.name || 'Bilinmiyor';
          break;
        case 'routeName':
          actualValue = vehicle.routeName || 'Bilinmiyor';
          break;
        case 'samId':
          actualValue = vehicle.samId || 'Bilinmiyor';
          break;
        default:
          actualValue = 'Bilinmiyor'; 
          break;
      }

      return {
        key: info.key,
        label: info.label,
        value: actualValue,
        icon: info.icon
      };
    });
  }, [selectedPopupInfo]);

  const getVehicleRealRoute = useCallback(async (vehicle) => {
    try {
      if (vehicle.routeCode && vehicle.routeData) {
        if (vehicle.routeData.directions && vehicle.routeData.directions['1'] && vehicle.routeData.directions['1'].length > 0) {
          return vehicle.routeData.directions['1'].map(coord => [coord[0], coord[1]]);
        }
      }
      
      const response = await fetch(`http://localhost:5000/api/route-details/${vehicle.routeCode}/1`);
      if (response.ok) {
        const routeData = await response.json();
        return (routeData.coordinates || []).map(coord => [coord[0], coord[1]]);
      } else {
        console.warn(`Araç ${vehicle.vehicleId} için rota bulunamadı, varsayılan güzergah kullanılıyor`);
        return null;
      }
    } catch (error) {
      console.error(`Araç ${vehicle.vehicleId} rota çekme hatası:`, error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (isFleetTrackingPanelOpen && selectedFleetVehicle && mapLoaded && mapRef.current) {
      if (!userInteractedFleetZoomRef.current) { 
        let targetPosition = null;

        if (animatedFleetPositions[selectedFleetVehicle.id] && animatedFleetPositions[selectedFleetVehicle.id].position) {
          targetPosition = {
            lng: animatedFleetPositions[selectedFleetVehicle.id].position.lng,
            lat: animatedFleetPositions[selectedFleetVehicle.id].position.lat
          };
        } else if (selectedFleetVehicle.location && 
                   typeof selectedFleetVehicle.location.lng === 'number' && 
                   typeof selectedFleetVehicle.location.lat === 'number') {
          targetPosition = {
            lng: selectedFleetVehicle.location.lng,
            lat: selectedFleetVehicle.location.lat
          };
        }

        if (targetPosition) {
          console.log('Seçili araca zoom yapılıyor:', selectedFleetVehicle.plate, targetPosition);
          mapRef.current.flyTo({
            center: [targetPosition.lng, targetPosition.lat],
            zoom: 16, 
            duration: 1500 
          });
        } else {
          console.warn('Seçili araç için geçerli konum bulunamadı:', selectedFleetVehicle);
        }
      } else {
          console.log('Kullanıcı manuel etkileşimde bulundu, otomatik zoom engellendi.');
      }
    }
  }, [selectedFleetVehicle, animatedFleetPositions, mapLoaded, isFleetTrackingPanelOpen]);

  useEffect(() => {
    if (!isFleetTrackingPanelOpen || selectedFleetVehicles.length === 0) {
      Object.values(fleetAnimationIntervals.current).forEach(intervalId => {
        if (intervalId) clearInterval(intervalId);
      });
      fleetAnimationIntervals.current = {};
      setAnimatedFleetPositions({});
      return;
    }

    selectedFleetVehicles.forEach(async (vehicle) => {
      if (!vehicle.status?.toLowerCase().includes('aktif')) {
        if (fleetAnimationIntervals.current[vehicle.id]) {
          clearInterval(fleetAnimationIntervals.current[vehicle.id]);
          delete fleetAnimationIntervals.current[vehicle.id];
          setAnimatedFleetPositions(prev => {
            const newState = { ...prev };
            delete newState[vehicle.id];
            return newState;
          });
        }
        return;
      }

      if (!fleetAnimationIntervals.current[vehicle.id]) {
        const realRoute = await getVehicleRealRoute(vehicle);
        
        let route = realRoute;
        if (!route || route.length === 0) {
          console.warn(`Araç ${vehicle.vehicleId} için varsayılan güzergah oluşturuluyor`);
          const centerLat = 38.419;
          const centerLng = 27.128;
          route = Array.from({ length: 20 }, (_, i) => [
            centerLat + (i * 0.0005 - 0.005), 
            centerLng + (i * 0.0005 - 0.005)
          ]);
        }
        
        let currentIndex = 0;
        
        setAnimatedFleetPositions(prev => ({
          ...prev,
          [vehicle.id]: {
            position: { lat: route[0][0], lng: route[0][1] },
            pathIndex: 0,
            route: route,
            isRealRoute: !!realRoute
          }
        }));

        const intervalId = setInterval(() => {
          currentIndex = (currentIndex + 1) % route.length;
          
          setAnimatedFleetPositions(prev => ({
            ...prev,
            [vehicle.id]: {
              ...prev[vehicle.id],
              position: { lat: route[currentIndex][0], lng: route[currentIndex][1] },
              pathIndex: currentIndex
            }
          }));
        }, 1500); 

        fleetAnimationIntervals.current[vehicle.id] = intervalId;
      }
    });

    Object.keys(fleetAnimationIntervals.current).forEach(vehicleId => {
      const isSelectedAndActive = selectedFleetVehicles.some(v => v.id === vehicleId && v.status?.toLowerCase().includes('aktif'));
      if (!isSelectedAndActive) {
        clearInterval(fleetAnimationIntervals.current[vehicleId]);
        delete fleetAnimationIntervals.current[vehicleId];
        setAnimatedFleetPositions(prev => {
          const newState = { ...prev };
          delete newState[vehicleId];
          return newState;
        });
      }
    });

    return () => {
      Object.values(fleetAnimationIntervals.current).forEach(intervalId => {
        if (intervalId) clearInterval(intervalId);
      });
      fleetAnimationIntervals.current = {};
      setAnimatedFleetPositions({});
    };
  }, [isFleetTrackingPanelOpen, selectedFleetVehicles, getVehicleRealRoute]);

  useEffect(() => {
    const fetchRouteData = async () => {
      const newRoutesData = {};

      if (selectedRouteIds && selectedRouteIds.length > 0) {
        for (const routeId of selectedRouteIds) {
          if (selectedRoutesData[routeId] && selectedRoutesData[routeId].directions && selectedRoutesData[routeId].directions['1'] && selectedRoutesData[routeId].directions['1'].length > 0) {
            newRoutesData[routeId] = selectedRoutesData[routeId];
            continue;
          }

          const route = allRoutes[routeId];
          if (route && route.route_number) {
            try {
              const response1 = await fetch(`http://localhost:5000/api/route-details/${route.route_number}/1`);
              const data1 = response1.ok ? await response1.json() : null;

              const response2 = await fetch(`http://localhost:5000/api/route-details/${route.route_number}/2`);
              const data2 = response2.ok ? await response2.json() : null;

              if (data1) {
                newRoutesData[routeId] = {
                  ...route,
                  directions: {
                    '1': data1.coordinates || [],
                    '2': data2?.coordinates || []
                  },
                  directionsStops: {
                    '1': data1.stops || [],
                    '2': data2?.stops || []
                  },
                  stops: data1.stops || [], 
                  start_point: data1.start_point || route.start_point || '',
                  end_point: data1.end_point || route.end_point || ''
                };
              } else {
                console.error(`Rota detayları çekilemedi (yön 1): ${route.route_number}`, response1.status);
              }
            } catch (error) {
              console.error(`Rota detayları çekilirken hata: ${route.route_number}`, error);
            }
          }
        }
      }
      if (JSON.stringify(newRoutesData) !== JSON.stringify(selectedRoutesData)) {
        setSelectedRoutesData(newRoutesData);
      }
    };
    fetchRouteData();
  }, [selectedRouteIds, allRoutes]); 

  useEffect(() => {
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

  useEffect(() => {
    if (!isPanelOpen || !selectedVehicle || !selectedRoute || isRouteDetailsPanelOpen || isDepartureTimesPanelOpen || isRouteNavigationPanelOpen) {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      setAnimatedBusPosition(null);
      setCurrentPathIndex(0);
      setDisplayStopsOnRoute({ current: null, next: null });
      if (onCurrentStopChange) {
        onCurrentStopChange(null);
      }
      if (onAnimatedDataChange) {
        onAnimatedDataChange(null, null);
      }
      return;
    }

    if (mapLoaded && selectedRoute.directions && selectedRoute.directions[currentDirection] && selectedRoute.directions[currentDirection].length > 0) {
      const pathCoordinates = selectedRoute.directions[currentDirection];
      const routeStops = selectedRoute.directionsStops && selectedRoute.directionsStops[currentDirection]
        ? selectedRoute.directionsStops[currentDirection]
        : [];

      const lastCoord = pathCoordinates[pathCoordinates.length - 1];
      const destinationPoint = (lastCoord && typeof lastCoord[0] === 'number' && typeof lastCoord[1] === 'number')
        ? { latitude: lastCoord[0], longitude: lastCoord[1] }
        : null;

      setCurrentPathIndex(0);
      const firstCoord = pathCoordinates[0];
      if (firstCoord && typeof firstCoord[0] === 'number' && typeof firstCoord[1] === 'number') {
        setAnimatedBusPosition({ lat: firstCoord[0], lng: firstCoord[1] });
      } else {
        setAnimatedBusPosition(null);
      }

      setDisplayStopsOnRoute({ current: null, next: null });
      if (onCurrentStopChange) {
        onCurrentStopChange(null);
      }

      if (destinationPoint && firstCoord && typeof firstCoord[0] === 'number' && typeof firstCoord[1] === 'number') {
        try {
          const initialDistance = getDistance(
            { latitude: firstCoord[0], longitude: firstCoord[1] },
            destinationPoint
          );
          if (typeof initialDistance === 'number' && !isNaN(initialDistance)) {
            const time = (SIMULATED_BUS_SPEED_MPS > 0 && initialDistance >= 0) ? (initialDistance / SIMULATED_BUS_SPEED_MPS) : 0;
            if (onAnimatedDataChange) {
              onAnimatedDataChange(initialDistance, time);
            }
          } else {
            if (onAnimatedDataChange) {
              onAnimatedDataChange(null, null);
            }
          }
        } catch (error) {
          console.error('Error calculating initial distance/time:', error);
          if (onAnimatedDataChange) {
            onAnimatedDataChange(null, null);
          }
        }
      } else {
        if (onAnimatedDataChange) {
          onAnimatedDataChange(null, null);
        }
      }

      animationIntervalRef.current = setInterval(() => {
        setCurrentPathIndex(prevIndex => {
          const nextIndex = prevIndex + 1;

          if (nextIndex >= pathCoordinates.length) {
            clearInterval(animationIntervalRef.current);
            animationIntervalRef.current = null;
            if (destinationPoint) {
              setAnimatedBusPosition({ lat: destinationPoint.latitude, lng: destinationPoint.longitude });
            }
            const finalStop = routeStops.length > 0 ? routeStops[routeStops.length - 1] : null;
            setDisplayStopsOnRoute({ current: finalStop, next: null });
            if (onCurrentStopChange) {
              onCurrentStopChange(finalStop);
            }
            if (onAnimatedDataChange) {
              onAnimatedDataChange(0, 0);
            }
            return prevIndex;
          }

          const nextCoord = pathCoordinates[nextIndex];
          if (nextCoord && typeof nextCoord[0] === 'number' && typeof nextCoord[1] === 'number') {
            setAnimatedBusPosition({ lat: nextCoord[0], lng: nextCoord[1] });
          } else {
            clearInterval(animationIntervalRef.current);
            animationIntervalRef.current = null;
            console.error('Invalid coordinate detected during animation:', nextCoord);
            setAnimatedBusPosition(null);
            if (onAnimatedDataChange) {
              onAnimatedDataChange(null, null);
            }
            return prevIndex;
          }

          if (destinationPoint && nextCoord && typeof nextCoord[0] === 'number' && typeof nextCoord[1] === 'number') {
            try {
              const remainingDist = getDistance(
                { latitude: nextCoord[0], longitude: nextCoord[1] },
                destinationPoint
              );
              if (typeof remainingDist === 'number' && !isNaN(remainingDist)) {
                const time = (SIMULATED_BUS_SPEED_MPS > 0 && remainingDist >= 0) ? (remainingDist / SIMULATED_BUS_SPEED_MPS) : 0;
                if (onAnimatedDataChange) {
                  onAnimatedDataChange(remainingDist, time);
                }
              } else {
                if (onAnimatedDataChange) {
                  onAnimatedDataChange(null, null);
                }
              }
            } catch (error) {
              console.error('Error calculating remaining distance or time:', error);
              if (onAnimatedDataChange) {
                onAnimatedDataChange(null, null);
              }
            }
          }

          if (routeStops && routeStops.length > 0) {
            let closestStop = null;
            let minDistance = Infinity;

            const currentLat = nextCoord[0];
            const currentLng = nextCoord[1];

            for (let i = 0; i < routeStops.length; i++) {
              const stop = routeStops[i];
              if (stop && typeof stop.lat === 'number' && typeof stop.lng === 'number') {
                const dist = getDistance(
                  { latitude: currentLat, longitude: currentLng },
                  { latitude: stop.lat, longitude: stop.lng }
                );
                if (dist < minDistance) {
                  minDistance = dist;
                  closestStop = stop;
                }
              }
            }

            const currentStop = closestStop;
            setDisplayStopsOnRoute({ current: currentStop, next: null });
            if (onCurrentStopChange) {
              onCurrentStopChange(currentStop);
            }
          }

          return nextIndex;
        });
      }, 250);

    } else {
      setAnimatedBusPosition(null);
      setCurrentPathIndex(0);
      if (onCurrentStopChange) {
        onCurrentStopChange(null);
      }
      if (onAnimatedDataChange) {
        onAnimatedDataChange(null, null);
      }
    }

    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      setDisplayStopsOnRoute({ current: null, next: null });
      if (onCurrentStopChange) {
        onCurrentStopChange(null);
      }
      if (onAnimatedDataChange) {
        onAnimatedDataChange(null, null);
      }
    };
  }, [selectedRoute, selectedVehicle, mapLoaded, onCurrentStopChange, currentDirection, isPanelOpen, isRouteDetailsPanelOpen, isDepartureTimesPanelOpen, isRouteNavigationPanelOpen, onAnimatedDataChange, selectedStops, allStops]);

  // ✅ YENİ: Geçmiş İzleme Animasyonu
  useEffect(() => {
    if (isHistoricalMode && historicalTrackingData.length > 0 && currentHistoricalIndex >= 0 && mapLoaded && mapRef.current) {
      const currentPoint = historicalTrackingData[currentHistoricalIndex];
      
      if (currentPoint && currentPoint.location && Array.isArray(currentPoint.location) && currentPoint.location.length === 2) {
        mapRef.current.flyTo({
          center: [currentPoint.location[1], currentPoint.location[0]],
          zoom: Math.max(mapRef.current.getMap().getZoom(), 14),
          duration: 500
        });
        
        const passedPath = historicalTrackingData.slice(0, currentHistoricalIndex + 1);
        const passedCoordinates = passedPath
          .filter(point => point.location && Array.isArray(point.location) && point.location.length === 2)
          .map(point => [point.location[1], point.location[0]]);
        
        if (historicalPassedRoute) {
          try {
            mapRef.current.getMap().removeLayer('historical-passed-route');
            mapRef.current.getMap().removeSource('historical-passed-route-source');
          } catch (e) {}
          setHistoricalPassedRoute(null);
        }
        
        if (passedCoordinates.length > 1) {
          const passedRouteData = {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: passedCoordinates
            }
          };
          
          try {
            mapRef.current.getMap().addSource('historical-passed-route-source', {
              type: 'geojson',
              data: passedRouteData
            });
            
            mapRef.current.getMap().addLayer({
              id: 'historical-passed-route',
              type: 'line',
              source: 'historical-passed-route-source',
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: { 'line-color': '#FF0000', 'line-width': 5, 'line-opacity': 0.8 }
            });
            
            setHistoricalPassedRoute('historical-passed-route');
          } catch (e) {
            console.warn('Geçmiş rota çizimi hatası:', e);
          }
        }
        
        if (currentHistoricalIndex < historicalTrackingData.length - 1) {
          const futurePath = historicalTrackingData.slice(currentHistoricalIndex);
          const futureCoordinates = futurePath
            .filter(point => point.location && Array.isArray(point.location) && point.location.length === 2)
            .map(point => [point.location[1], point.location[0]]);
          
          if (historicalFutureRoute) {
            try {
              mapRef.current.getMap().removeLayer('historical-future-route');
              mapRef.current.getMap().removeSource('historical-future-route-source');
            } catch (e) {}
            setHistoricalFutureRoute(null);
          }
          
          if (futureCoordinates.length > 1) {
            const futureRouteData = {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: futureCoordinates
              }
            };
            
            try {
              mapRef.current.getMap().addSource('historical-future-route-source', {
                type: 'geojson',
                data: futureRouteData
              });
              
              mapRef.current.getMap().addLayer({
                id: 'historical-future-route',
                type: 'line',
                source: 'historical-future-route-source',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                  'line-color': '#CCCCCC',
                  'line-width': 3,
                  'line-opacity': 0.6,
                  'line-dasharray': [5, 10]
                }
              });
              
              setHistoricalFutureRoute('historical-future-route');
            } catch (e) {
              console.warn('Gelecek rota çizimi hatası:', e);
            }
          }
        }
      }
    } else if (!isHistoricalMode) {
      if (historicalPassedRoute) {
        try {
          mapRef.current?.getMap().removeLayer('historical-passed-route');
          mapRef.current?.getMap().removeSource('historical-passed-route-source');
        } catch (e) {}
        setHistoricalPassedRoute(null);
      }
      
      if (historicalFutureRoute) {
        try {
          mapRef.current?.getMap().removeLayer('historical-future-route');
          mapRef.current?.getMap().removeSource('historical-future-route-source');
        } catch (e) {}
        setHistoricalFutureRoute(null);
      }
    }
  }, [isHistoricalMode, historicalTrackingData, currentHistoricalIndex, mapLoaded]);

  useEffect(() => {
    return () => {
      if (mapRef.current && mapRef.current.getMap()) {
        try {
          mapRef.current.getMap().removeLayer('historical-passed-route');
          mapRef.current.getMap().removeSource('historical-passed-route-source');
          mapRef.current.getMap().removeLayer('historical-future-route');
          mapRef.current.getMap().removeSource('historical-future-route-source');
        } catch (e) {}
      }
          };
  }, []);

  const formatTime = useCallback((totalSeconds) => {
    if (totalSeconds === null || isNaN(totalSeconds) || totalSeconds < 0) return 'Hesaplanıyor...';
    if (totalSeconds < 1) return 'Vardı';

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);

    if (minutes > 0) {
      return `${minutes} dk ${seconds} sn`;
    } else {
      return `${seconds} sn`;
    }
  }, []);

  const singleSelectedRouteGeoJSON = React.useMemo(() => {
    if (!isPanelOpen || !selectedVehicle || !selectedRoute || !selectedRoute.directions || !selectedRoute.directions[currentDirection] || selectedRoute.directions[currentDirection].length === 0 || isRouteDetailsPanelOpen || isDepartureTimesPanelOpen || isRouteNavigationPanelOpen) {
      return null;
    }

    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: selectedRoute.directions[currentDirection].map(coord => [coord[1], coord[0]])
        },
        properties: {
          direction: currentDirection === '1' ? 'gidis' : 'donus',
          routeNumber: selectedRoute.route_number
        }
      }]
    };
  }, [selectedRoute, selectedVehicle, currentDirection, isPanelOpen, isRouteDetailsPanelOpen, isDepartureTimesPanelOpen, isRouteNavigationPanelOpen]);

  const navigationRouteGeoJSON = React.useMemo(() => {
    if (!navigationRoute || !navigationRoute.segments || navigationRoute.segments.length === 0 || !isRouteNavigationPanelOpen) {
      return { bus: null, walk: null };
    }

    const busFeatures = [];
    const walkFeatures = [];

    navigationRoute.segments.forEach((segment, index) => {
      if (segment.coordinates && segment.coordinates.length > 0) {
        const mappedCoordinates = segment.coordinates.map(coord => [coord[1], coord[0]]);
        if (segment.type === 'bus') {
          busFeatures.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: mappedCoordinates
            },
            properties: {
              segmentId: `bus-${index}`,
              routeNumber: segment.route_number,
              wheelchair_accessible: segment.wheelchair_accessible,
              bicycle_accessible: segment.bicycle_accessible
            }
          });
        } else if (segment.type === 'walk') {
          walkFeatures.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: mappedCoordinates
            },
            properties: {
              segmentId: `walk-${index}`,
              distance: segment.distance,
              duration: segment.duration
            }
          });
        }
      }
    });

    return {
      bus: busFeatures.length > 0 ? { type: 'FeatureCollection', features: busFeatures } : null,
      walk: walkFeatures.length > 0 ? { type: 'FeatureCollection', features: walkFeatures } : null,
    };
  }, [navigationRoute, isRouteNavigationPanelOpen]);

  const navigationStartEndMarkers = React.useMemo(() => {
    if (!navigationRoute || !isRouteNavigationPanelOpen) {
      return { start: null, end: null };
    }

    let startCoord = null;
    let endCoord = null;
    let startStopName = 'Başlangıç';
    let endStopName = 'Varış';

    if (navigationRoute.segments && navigationRoute.segments.length > 0) {
      const firstSegment = navigationRoute.segments[0];
      if (firstSegment.coordinates && firstSegment.coordinates.length > 0) {
        startCoord = firstSegment.coordinates[0];
        if (firstSegment.type === 'walk') startStopName = firstSegment.from;
        else if (firstSegment.type === 'bus') startStopName = firstSegment.boarding_stop;
      }

      const lastSegment = navigationRoute.segments[navigationRoute.segments.length - 1];
      if (lastSegment.coordinates && lastSegment.coordinates.length > 0) {
        endCoord = lastSegment.coordinates[lastSegment.coordinates.length - 1];
        if (lastSegment.type === 'walk') endStopName = lastSegment.to;
        else if (lastSegment.type === 'bus') endStopName = lastSegment.alighting_stop;
      }
    }

    return {
      start: startCoord ? { lat: startCoord[0], lng: startCoord[1], name: startStopName } : null,
      end: endCoord ? { lat: endCoord[0], lng: endCoord[1], name: endStopName } : null
    };
  }, [navigationRoute, isRouteNavigationPanelOpen]);

  const multipleRoutesData = React.useMemo(() => {
    const routesData = [];
    Object.keys(selectedRoutesData).forEach((routeId, index) => {
      const routeData = selectedRoutesData[routeId];
      if (routeData && routeData.directions && routeData.directions['1'] && routeData.directions['1'].length > 0) {
        routesData.push({
          id: `route-${routeId}`,
          color: getRouteColor(index),
          routeNumber: routeData.route_number,
          geoJSON: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: routeData.directions['1'].map(coord => [coord[1], coord[0]])
              },
              properties: {
                routeId: routeData.route_number,
                routeName: `${routeData.route_number} No'lu Hat`,
                color: getRouteColor(index)
              }
            }]
          }
        });
      }
    });

    return routesData;
  }, [selectedRoutesData]);

  const onMouseMove = useCallback((event) => {
    const features = mapRef.current?.queryRenderedFeatures(event.point, {
      layers: multipleRoutesData.map(route => `route-layer-${route.id}`)
    });

    if (features && features.length > 0) {
      const feature = features[0];
      const routeNumber = feature.properties.routeId;
      if (hoveredRoute !== routeNumber) {
        setHoveredRoute(routeNumber);
        mapRef.current.getCanvas().style.cursor = 'pointer';
      }
    } else {
      if (hoveredRoute !== null) {
        setHoveredRoute(null);
        mapRef.current.getCanvas().style.cursor = '';
      }
    }
  }, [multipleRoutesData, hoveredRoute]);

  const onMapClick = useCallback((event) => {
    userInteractedFleetZoomRef.current = false; 

    const features = mapRef.current?.queryRenderedFeatures(event.point, {
      layers: multipleRoutesData.map(route => `route-layer-${route.id}`)
    });

    if (features && features.length > 0) {
      const feature = features[0];
      const { routeId, routeName, color } = feature.properties;
      setRoutePopup({
        lngLat: event.lngLat,
        routeId,
        routeName,
        color
      });
    } else {
      setRoutePopup(null);
    }
  }, [multipleRoutesData]);
  
  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: 27.128,
        latitude: 38.419,
        zoom: 12
      }}
      style={{ width: '100%', height: '100%' }}
      onLoad={onMapLoad}
      mapStyle={theme === 'dark' ? DARK_MAP_STYLE_URL : LIGHT_MAP_STYLE_URL}
      onClick={onMapClick}
      onMouseMove={onMouseMove}
      interactiveLayerIds={multipleRoutesData.map(route => `route-layer-${route.id}`)}
    >
      {/* Tekli Seçili Rota */}
      {mapLoaded && singleSelectedRouteGeoJSON && (
        <Source id="route-data" type="geojson" data={singleSelectedRouteGeoJSON}>
          <Layer
            id="animated-route-line"
            type="line"
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{ 'line-color': '#0066CC', 'line-width': 5, 'line-opacity': 0.8 }}
          />
        </Source>
      )}

      {/* Çoklu Seçili Rota */}
      {mapLoaded && multipleRoutesData.length > 0 && multipleRoutesData.map((routeData) => (
        <Source
          key={routeData.id}
          id={`source-${routeData.id}`}
          type="geojson"
          data={routeData.geoJSON}
        >
          <Layer
            id={`route-layer-${routeData.id}`}
            type="line"
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{
              'line-color': routeData.color,
              'line-width': hoveredRoute === routeData.routeNumber ? 6 : 4,
              'line-opacity': hoveredRoute === routeData.routeNumber ? 1.0 : 0.8
            }}
          />
        </Source>
      ))}

      {routePopup && (
        <Popup
          longitude={routePopup.lngLat.lng}
          latitude={routePopup.lngLat.lat}
          onClose={() => setRoutePopup(null)}
          anchor="bottom"
          closeButton={false}
          closeOnClick={true}
        >
          <div className="route-popup-content" style={{ backgroundColor: routePopup.color }}>
            {routePopup.routeName}
          </div>
        </Popup>
      )}

      {mapLoaded && selectedStop && typeof selectedStop.lat === 'number' && typeof selectedStop.lng === 'number' && (
        <Marker
          longitude={selectedStop.lng}
          latitude={selectedStop.lat}
          anchor="center"
        >
          <img
            src={locationIconUrl}
            alt="Durak"
            style={{ width: '29px', height: '29px', cursor: 'pointer' }}
          />
        </Marker>
      )}

      {/* Bir rota üzerindeki duraklar */}
      {mapLoaded && selectedRoute?.directionsStops?.[currentDirection] && isPanelOpen && (
        selectedRoute.directionsStops[currentDirection].map((stop) => {
          const isSelectedInRedux = selectedStops.includes(stop.id);
          return (
            stop && typeof stop.lat === 'number' && typeof stop.lng === 'number' && (
              <Marker
                key={`route-stop-${stop.id}-${stop.sequence || Math.random()}`}
                longitude={stop.lng}
                latitude={stop.lat}
                anchor="center"
              >
                <div style={{
                  width: isSelectedInRedux ? '18px' : '12px',
                  height: isSelectedInRedux ? '18px' : '12px',
                  backgroundColor: isSelectedInRedux ? '#FFD700' : 'red',
                  borderRadius: '50%',
                  border: isSelectedInRedux ? '3px solid #FF6B35' : '2px solid white',
                  boxShadow: '0 0 5px rgba(0,0,0,0.5)',
                  animation: isSelectedInRedux ? 'pulse 2s infinite' : 'none'
                }} title={stop.name + (isSelectedInRedux ? ' (Seçili)' : '')}></div>
              </Marker>
            )
          );
        })
      )}

      {/* Redux Durakları */}
      {mapLoaded && !isRouteNavigationPanelOpen && Array.isArray(allStops) && selectedStops.map(stopId => {
        const stop = allStops.find(s => s.id === stopId);
        const isOnSelectedAnimatedRoute = selectedRoute?.directionsStops?.[currentDirection]?.some(routeStop => routeStop.id === stopId);

        if (stop && !isOnSelectedAnimatedRoute && typeof stop.lat === 'number' && typeof stop.lng === 'number') {
          return (
            <Marker
              key={`redux-selected-${stopId}`}
              longitude={stop.lng}
              latitude={stop.lat}
              anchor="center"
            >
              <div style={{
                width: '20px',
                height: '20px',
                backgroundColor: '#00FF7F',
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

      {mapLoaded && selectedRoute && selectedRoute.directions && selectedRoute.directions[currentDirection] && selectedRoute.directions[currentDirection].length > 0 && isPanelOpen && (
        (() => {
          const lastCoord = selectedRoute.directions[currentDirection][selectedRoute.directions[currentDirection].length - 1];
          if (lastCoord && typeof lastCoord[0] === 'number' && typeof lastCoord[1] === 'number') {
            return (
              <Marker
                longitude={lastCoord[1]}
                latitude={lastCoord[0]}
                anchor="center"
              >
                <img
                  src={locationIconUrl}
                  alt="Bitiş Noktası"
                  style={{ width: '35px', height: '35px', filter: 'hue-rotate(240deg)' }}
                />
              </Marker>
            );
          }
          return null;
        })()
      )}

      {mapLoaded && isFleetTrackingPanelOpen && Object.entries(animatedFleetPositions).map(([vehicleId, animationData]) => {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (!vehicle || !animationData.position) return null;

        const isMultiSelected = selectedFleetVehicles.some(v => v.id === vehicleId);
        const isActive = vehicle.status?.toLowerCase().includes('aktif');
        const isPopupVisible = selectedFleetVehicle?.id === vehicle.id && selectedPopupInfo.length > 0;

        if (!isMultiSelected || !isActive) return null;

        const isSelected = selectedFleetVehicle?.id === vehicleId;
        
        return (
          <Marker
            key={`animated-${vehicleId}`}
            longitude={animationData.position.lng}
            latitude={animationData.position.lat}
            anchor="center"
          >
            <div className="animated-vehicle-container">
              <img
                src={busIconUrl}
                alt={`Araç ${vehicle.plate}`}
                style={{
                  width: isSelected ? '45px' : '35px',
                  height: isSelected ? '45px' : '35px',
                  cursor: 'default', 
                  filter: `hue-rotate(${getVehicleStatusColor(vehicle.status) === '#28a745' ? '0deg' : 
                    getVehicleStatusColor(vehicle.status) === '#dc3545' ? '120deg' : '240deg'})`,
                  transition: 'all 0.3s ease',
                  transform: isMultiSelected ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: isMultiSelected ? '0 0 15px rgba(0,123,255,0.6)' : 'none',
                  borderRadius: '50%'
                }}
                onError={(e) => { e.currentTarget.style.opacity = '0.2'; console.error('Bus icon yüklenemedi'); }}
              />
              
              <div 
                className="vehicle-status-dot"
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '12px',
                  height: '12px',
                  backgroundColor: getVehicleStatusColor(vehicle.status),
                  borderRadius: '50%',
                  border: '2px solid white',
                  boxShadow: '0 0 4px rgba(0,0,0,0.3)'
                }}
              />

              {isPopupVisible && ( 
                <Popup
                  longitude={animationData.position.lng}
                  latitude={animationData.position.lat}
                  anchor="bottom"
                  closeButton={false} 
                  closeOnClick={false} 
                  offset={[0, -45]}
                >
                  <div style={{
                    padding: '8px',
                    minWidth: '200px',
                    background: 'white',
                    borderRadius: '8px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                      borderBottom: '1px solid #e2e8f0',
                      paddingBottom: '4px'
                    }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        {vehicle.plate}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {getPopupContent(vehicle).map(info => (
                        <div key={info.key} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px'
                        }}>
                          <span style={{ fontSize: '14px', width: '16px', textAlign: 'center' }}>
                            {info.icon}
                          </span>
                          <span style={{ color: '#718096', fontWeight: '500', minWidth: '60px' }}>
                            {info.label}:
                          </span>
                          <span style={{ color: '#2d3748', fontWeight: '600', flex: 1 }}>
                            {info.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Popup>
              )}
            </div>
          </Marker>
        );
      })}

      {/* Filo Araç İşaretleyicileri */}
      {mapLoaded && isFleetTrackingPanelOpen && vehicles.map((vehicle) => {
        const isMultiSelected = selectedFleetVehicles.some(v => v.id === vehicle.id);
        const isActive = vehicle.status?.toLowerCase().includes('aktif');
        
        if (animatedFleetPositions[vehicle.id]) return null;
        
        const isPopupVisible = selectedFleetVehicle?.id === vehicle.id && selectedPopupInfo.length > 0;

        if (!isMultiSelected || !isActive) return null;
        
        const isSelected = selectedFleetVehicle?.id === vehicle.id;
        const iconSize = isSelected ? '40px' : '30px';

        if (!vehicle || typeof vehicle.location?.lat !== 'number' || typeof vehicle.location?.lng !== 'number') {
          console.warn('Geçersiz araç konumu:', vehicle);
          return null;
        }

        return (
          <Marker
            key={vehicle.id}
            longitude={vehicle.location.lng}
            latitude={vehicle.location.lat}
            anchor="center"
          >
            <div className="static-vehicle-container">
              <img
                src={busIconUrl}
                alt={`Araç ID: ${vehicle.plate}`}
                style={{
                  width: iconSize,
                  height: iconSize,
                  cursor: 'default',
                  transition: 'all 0.3s ease',
                  transform: isMultiSelected ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: isMultiSelected ? '0 0 15px rgba(0,123,255,0.6)' : 'none',
                  borderRadius: '50%'
                }}
                onError={(e) => { e.currentTarget.style.opacity = '0.2'; console.error('Bus icon yüklenemedi'); }}
              />
              
              <div 
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '10px',
                  height: '10px',
                  backgroundColor: getVehicleStatusColor(vehicle.status),
                  borderRadius: '50%',
                  border: '2px solid white',
                  boxShadow: '0 0 3px rgba(0,0,0,0.3)'
                }}
              />

              {isPopupVisible && ( 
                <Popup
                  longitude={vehicle.location.lng}
                  latitude={vehicle.location.lat}
                  anchor="bottom"
                  closeButton={false}
                  closeOnClick={false} 
                  offset={[0, -45]}
                >
                  <div style={{
                    padding: '8px',
                    minWidth: '200px',
                    background: 'white',
                    borderRadius: '8px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                      borderBottom: '1px solid #e2e8f0',
                      paddingBottom: '4px'
                    }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        {vehicle.plate}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {getPopupContent(vehicle).map(info => (
                        <div key={info.key} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px'
                        }}>
                          <span style={{ fontSize: '14px', width: '16px', textAlign: 'center' }}>
                            {info.icon}
                          </span>
                          <span style={{ color: '#718096', fontWeight: '500', minWidth: '60px' }}>
                            {info.label}:
                          </span>
                          <span style={{ color: '#2d3748', fontWeight: '600', flex: 1 }}>
                            {info.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Popup>
              )}
            </div>
          </Marker>
        );
      })}
      

      {mapLoaded && !isFleetTrackingPanelOpen && selectedFleetVehicle && selectedFleetVehicle.location && !animatedFleetPositions[selectedFleetVehicle.id] && (
        <Marker
          longitude={selectedFleetVehicle.location.lng}
          latitude={selectedFleetVehicle.location.lat}
          anchor="center"
        >
          <img
            src={busIconUrl}
            alt={`Seçili Araç ${selectedFleetVehicle.plate || selectedFleetVehicle.id}`}
            style={{ width: '40px', height: '40px', cursor: 'default' }}
          />
          {selectedFleetVehicle && selectedPopupInfo.length > 0 && (
            <Popup
              longitude={selectedFleetVehicle.location.lng}
              latitude={selectedFleetVehicle.location.lat}
              anchor="bottom"
              closeButton={false}
              closeOnClick={false} 
              offset={[0, -45]}
            >
              <div style={{
                padding: '8px',
                minWidth: '200px',
                background: 'white',
                borderRadius: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '4px'
                }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    {selectedFleetVehicle.plate}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {getPopupContent(selectedFleetVehicle).map(info => (
                    <div key={info.key} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px'
                    }}>
                      <span style={{ fontSize: '14px', width: '16px', textAlign: 'center' }}>
                        {info.icon}
                      </span>
                      <span style={{ color: '#718096', fontWeight: '500', minWidth: '60px' }}>
                        {info.label}:
                      </span>
                      <span style={{ color: '#2d3748', fontWeight: '600', flex: 1 }}>
                        {info.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Popup>
          )}
        </Marker>
      )}

      {/* Navigasyon Rotası Katmanları */}
      {mapLoaded && isRouteNavigationPanelOpen && navigationRouteGeoJSON.bus && (
        <Source id="navigation-bus-route" type="geojson" data={navigationRouteGeoJSON.bus}>
          <Layer
            id="navigation-bus-line"
            type="line"
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{
              'line-color': NAVIGATION_BUS_COLOR,
              'line-width': 6,
              'line-opacity': 0.9
            }}
          />
        </Source>
      )}

      {mapLoaded && isRouteNavigationPanelOpen && navigationRouteGeoJSON.walk && (
        <Source id="navigation-walk-route" type="geojson" data={navigationRouteGeoJSON.walk}>
          <Layer
            id="navigation-walk-line"
            type="line"
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{
              'line-color': NAVIGATION_WALK_COLOR,
              'line-width': 4,
              'line-dasharray': [1, 2],
              'line-opacity': 0.7
            }}
          />
        </Source>
      )}

      {/* Navigasyon Başlangıç Bitiş */}
      {mapLoaded && isRouteNavigationPanelOpen && navigationStartEndMarkers.start && (
        <Marker
          longitude={navigationStartEndMarkers.start.lng}
          latitude={navigationStartEndMarkers.start.lat}
          anchor="center"
        >
          <img
            src={locationIconUrl}
            alt="Navigasyon Başlangıcı"
            style={{ width: '38px', height: '38px', filter: 'hue-rotate(90deg)' }}
          />
          <div className="stop-popup">
            <strong>{navigationStartEndMarkers.start.name}</strong>
          </div>
        </Marker>
      )}

      {mapLoaded && isRouteNavigationPanelOpen && navigationStartEndMarkers.end && (
        <Marker
          longitude={navigationStartEndMarkers.end.lng}
          latitude={navigationStartEndMarkers.end.lat}
          anchor="center"
        >
          <img
            src={locationIconUrl}
            alt="Navigasyon Varışı"
            style={{ width: '38px', height: '38px', filter: 'hue-rotate(0deg)' }}
          />
          <div className="stop-popup">
            <strong>{navigationStartEndMarkers.end.name}</strong>
          </div>
        </Marker>
      )}

      {/* Animasyonlu Otobüs */}
      {mapLoaded && animatedBusPosition && typeof animatedBusPosition.lat === 'number' && typeof animatedBusPosition.lng === 'number' && selectedRoute && selectedVehicle && isPanelOpen && (
        <Marker
          longitude={animatedBusPosition.lng}
          latitude={animatedBusPosition.lat}
          anchor="center"
        >
          <img
            src={busIconUrl}
            alt="Animated Bus"
            style={{ width: '40px', height: '40px' }}
          />
          {animatedDistanceToDestination !== null && animatedTimeToDestination !== null && (
            <div className="bus-popup">
              <div>Kalan: {(animatedDistanceToDestination / 1000).toFixed(2)} km</div>
              <div>Hız: {SIMULATED_BUS_SPEED_KMH} km/h</div>
              <div>Süre: {formatTime(animatedTimeToDestination)}</div>
              {currentAnimatedStop?.name && (
                <div>Durak: {currentAnimatedStop.name}</div>
              )}
            </div>
          )}
        </Marker>
      )}

      {/* ✅ YENİ: Geçmiş İzleme Otobüs Marker'ı */}
      {mapLoaded && isHistoricalMode && historicalTrackingData.length > 0 && currentHistoricalIndex >= 0 && historicalTrackingData[currentHistoricalIndex] && (
        <Marker
          longitude={historicalTrackingData[currentHistoricalIndex].location[1]}
          latitude={historicalTrackingData[currentHistoricalIndex].location[0]}
          anchor="center"
        >
          <div style={{ 
            position: 'relative', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center' 
          }}>
            <img
              src={busIconUrl}
              alt="Geçmiş Otobüs"
              style={{
                width: '45px',
                height: '45px',
                filter: 'hue-rotate(45deg) brightness(1.2)',
                border: '3px solid #FF6B35',
                borderRadius: '50%',
                boxShadow: '0 0 15px rgba(255, 107, 53, 0.6)',
                animation: 'pulse 2s infinite'
              }}
            />
            
            {/* Geçmiş veri popup bilgisi */}
            <div style={{
              position: 'absolute',
              top: '-70px',
              background: 'rgba(255, 107, 53, 0.95)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              zIndex: 1000,
              minWidth: '120px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '2px' }}>
                {historicalTrackingData[currentHistoricalIndex].timestamp}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700' }}>
                {historicalTrackingData[currentHistoricalIndex].speed} km/h
              </div>
              <div style={{ fontSize: '10px', opacity: 0.9, marginTop: '2px' }}>
                {historicalTrackingData[currentHistoricalIndex].passengerCount} yolcu
              </div>
            </div>
            
            {/* Geçmiş mod göstergesi */}
            <div style={{
              position: 'absolute',
              bottom: '-25px',
              background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
              color: 'white',
              fontSize: '9px',
              padding: '3px 8px',
              borderRadius: '12px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 6px rgba(255, 107, 53, 0.4)'
            }}>
              GEÇMİŞ
            </div>
          </div>
        </Marker>
      )}
    </Map>
  );
}
export default MapComponent;