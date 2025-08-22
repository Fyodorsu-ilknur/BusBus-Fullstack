// frontend/src/components/Map.js

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Map, { Marker, Source, Layer, Popup } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getDistance } from 'geolib';
import './Map.css';

// 🔧 ÖNEMLİ: asset import'larını ESM ile yap (require yerine)
import busIconUrl from '../assets/red_bus.png';
import locationIconUrl from '../assets/location.png';

const SIMULATED_BUS_SPEED_KMH = 30;
const SIMULATED_BUS_SPEED_MPS = (SIMULATED_BUS_SPEED_KMH * 1000) / 3600;

const ROUTE_COLORS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFD700', '#FF69B4', '#00CED1', '#FF4500',
  '#9370DB', '#32CD32', '#FF1493', '#00FA9A', '#1E90FF', '#FF8C00', '#DA70D6',
  '#00FFFF', '#FFB6C1', '#98FB98', '#87CEEB', '#DDA0DD', '#F0E68C'
];

const NAVIGATION_BUS_COLOR = '#4285F4'; // Google Blue
const NAVIGATION_WALK_COLOR = '#EA4335'; // Google Red

const LIGHT_MAP_STYLE_URL = 'https://api.maptiler.com/maps/streets-v2-pastel/style.json?key=xOQhMUZleM9cojouQ0fu';
const DARK_MAP_STYLE_URL = 'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=xOQhMUZleM9cojouQ0fu';

function MapComponent({
  vehicles = [], // Tüm simüle edilmiş araçlar listesi
  selectedFleetVehicle, // Filo Takip panelinden seçilen araç
  selectedFleetVehicles = [], // YENİ: Çoklu seçilen araçlar
  onFleetVehicleMarkerClick, // Filo Takip markerlarına tıklama için
  selectedVehicle, // Ana panelden seçilen (animasyonlu) araç
  selectedRoute,
  selectedStop,
  mapCenter,
  zoomLevel = 13,
  onCurrentStopChange,
  onAnimatedDataChange,
  theme,
  isPanelOpen, // Aktif Araçlar paneli (Hat Güzergah Takip)
  isRouteDetailsPanelOpen,
  isDepartureTimesPanelOpen,
  isRouteNavigationPanelOpen,
  isFleetTrackingPanelOpen, // Filo Takip paneli açık mı?
  navigationRoute,
  selectedRouteIds,
  allRoutes,
  currentDirection,
  currentAnimatedStop,
  animatedDistanceToDestination,
  animatedTimeToDestination,
  selectedPopupInfo = [] // YENİ: Ayarlar panelinden seçilen pop-up bilgileri
}) {
  const mapRef = useRef();

  const [mapLoaded, setMapLoaded] = useState(false);
  const [hoveredVehiclePopup, setHoveredVehiclePopup] = useState(null); // Araç üzerine gelince açılan popup

  const [animatedBusPosition, setAnimatedBusPosition] = useState(null);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const animationIntervalRef = useRef(null);
  const [displayStopsOnRoute, setDisplayStopsOnRoute] = useState({ current: null, next: null });

  // YENİ: Çoklu araç animasyonları için state'ler
  const [animatedFleetPositions, setAnimatedFleetPositions] = useState({}); // {vehicleId: {position, pathIndex, intervalId}}
  const fleetAnimationIntervals = useRef({}); // Araç animasyon interval'larını saklar

  const [selectedRoutesData, setSelectedRoutesData] = useState({});
  const [routePopup, setRoutePopup] = useState(null);
  const [hoveredRoute, setHoveredRoute] = useState(null);

  const selectedStops = useSelector(state => state.selectedItems?.selectedStopIds || []);
  const allStops = useSelector(state => state.selectedItems?.allStops || []);

  const onMapLoad = useCallback(() => {
    setMapLoaded(true);
    // Harita yüklendiğinde varsayılan bir zoom ve merkez belirle
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [27.128, 38.419], // İzmir merkezi
        zoom: 12,
        duration: 0
      });
    }
  }, []);

  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      const newStyleUrl = theme === 'dark' ? DARK_MAP_STYLE_URL : LIGHT_MAP_STYLE_URL;
      mapRef.current.getMap().setStyle(newStyleUrl);
    }
  }, [theme, mapLoaded]);

  const getRouteColor = (routeIndex) => {
    return ROUTE_COLORS[routeIndex % ROUTE_COLORS.length];
  };

  // YENİ: Araç durum rengini al
  const getVehicleStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'aktif/çalışıyor':
      case 'aktif':
        return '#28a745'; // Yeşil
      case 'bakımda':
        return '#dc3545'; // Kırmızı  
      case 'servis dışı':
        return '#6c757d'; // Gri
      default:
        return '#ffc107'; // Sarı
    }
  };

  // YENİ: Araç için gerçek güzergah çekme (server'dan)
  const getVehicleRealRoute = useCallback(async (vehicle) => {
    try {
      if (vehicle.routeCode && vehicle.routeData) {
        // Önce mevcut routeData'dan kontrol et
        if (vehicle.routeData.directions && vehicle.routeData.directions['1']) {
          return vehicle.routeData.directions['1'];
        }
      }
      
      // Server'dan çek
      const response = await fetch(`http://localhost:5000/api/route-details/${vehicle.routeCode}/1`);
      if (response.ok) {
        const routeData = await response.json();
        return routeData.coordinates || [];
      } else {
        console.warn(`Araç ${vehicle.vehicleId} için rota bulunamadı, varsayılan güzergah kullanılıyor`);
        return null;
      }
    } catch (error) {
      console.error(`Araç ${vehicle.vehicleId} rota çekme hatası:`, error);
      return null;
    }
  }, []);

  // YENİ: Çoklu araç animasyonlarını başlat/durdur (gerçek güzergahla)
  useEffect(() => {
    if (!isFleetTrackingPanelOpen || selectedFleetVehicles.length === 0) {
      // Tüm animasyonları durdur
      Object.values(fleetAnimationIntervals.current).forEach(intervalId => {
        if (intervalId) clearInterval(intervalId);
      });
      fleetAnimationIntervals.current = {};
      setAnimatedFleetPositions({});
      return;
    }

    // Seçili araçlar için animasyon başlat
    selectedFleetVehicles.forEach(async (vehicle) => {
      if (!fleetAnimationIntervals.current[vehicle.id]) {
        // Gerçek güzergah çek
        const realRoute = await getVehicleRealRoute(vehicle);
        
        // Eğer gerçek güzergah yoksa varsayılan oluştur
        let route = realRoute;
        if (!route || route.length === 0) {
          console.warn(`Araç ${vehicle.vehicleId} için varsayılan güzergah oluşturuluyor`);
          // Basit çizgisel güzergah oluştur
          const centerLat = 38.419;
          const centerLng = 27.128;
          route = Array.from({ length: 20 }, (_, i) => [
            centerLat + (i * 0.002 - 0.02),
            centerLng + (i * 0.002 - 0.02)
          ]);
        }
        
        let currentIndex = 0;
        
        // İlk pozisyonu ayarla (gerçek güzergahın başlangıcı)
        setAnimatedFleetPositions(prev => ({
          ...prev,
          [vehicle.id]: {
            position: { lat: route[0][0], lng: route[0][1] },
            pathIndex: 0,
            route: route,
            isRealRoute: !!realRoute
          }
        }));

        // Animasyon interval'ini başlat
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
        }, 1500); // 1.5 saniyede bir hareket (daha hızlı)

        fleetAnimationIntervals.current[vehicle.id] = intervalId;
      }
    });

    // Seçimi kaldırılan araçların animasyonlarını durdur
    Object.keys(fleetAnimationIntervals.current).forEach(vehicleId => {
      if (!selectedFleetVehicles.some(v => v.id === vehicleId)) {
        clearInterval(fleetAnimationIntervals.current[vehicleId]);
        delete fleetAnimationIntervals.current[vehicleId];
        setAnimatedFleetPositions(prev => {
          const newState = { ...prev };
          delete newState[vehicleId];
          return newState;
        });
      }
    });

    // Cleanup function
    return () => {
      Object.values(fleetAnimationIntervals.current).forEach(intervalId => {
        if (intervalId) clearInterval(intervalId);
      });
      fleetAnimationIntervals.current = {};
      setAnimatedFleetPositions({});
    };
  }, [isFleetTrackingPanelOpen, selectedFleetVehicles, getVehicleRealRoute]);

  // YENİ: Pop-up bilgilerini formatla
  const getPopupContent = useCallback((vehicle, selectedInfo) => {
    const infoMap = {
      speed: `Hız: ${vehicle.speed} km/h`,
      plate: `Plaka: ${vehicle.plate}`,
      routeCode: `Hat No: ${vehicle.routeCode}`,
      routeName: `Rota: ${vehicle.routeName}`,
      driverName: `Sürücü: ${vehicle.driverInfo?.name}`,
      companyAd: `Firma: ${vehicle.companyAd}`
    };

    if (!selectedInfo || selectedInfo.length === 0) {
      return `<strong>Plaka: ${vehicle.plate}</strong><br/>Hız: ${vehicle.speed} km/h`;
    }

    return selectedInfo
      .filter(key => infoMap[key])
      .map(key => infoMap[key])
      .join('<br/>');
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRouteIds, allRoutes]);

  // Harita merkezi ve zoom seviyesi güncellemeleri
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

  // selectedFleetVehicle değiştiğinde haritayı o araca odakla
  useEffect(() => {
    if (selectedFleetVehicle && mapLoaded && mapRef.current) {
      if (selectedFleetVehicle.location && typeof selectedFleetVehicle.location.lng === 'number' && typeof selectedFleetVehicle.location.lat === 'number') {
        mapRef.current.flyTo({
          center: [selectedFleetVehicle.location.lng, selectedFleetVehicle.location.lat],
          zoom: 15,
          duration: 1000
        });
      }
    }
  }, [selectedFleetVehicle, mapLoaded]);

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

  // ✅ DÜZELTME: Sadece seçili araçları göster (Panel açıldığında hiçbiri görünmesin)
  const shouldRenderAllFleetMarkers = mapLoaded && isFleetTrackingPanelOpen && selectedFleetVehicles.length > 0;

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
      {/* Tekli Seçili Rota (Aktif Araçlar paneli açıkken ve selectedItem/selectedRoute varsa) */}
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

      {/* Çoklu Seçili Rotalar (selectedRouteIds'e göre) */}
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

      {/* Rota Popup (Çoklu Rotalar için) */}
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

      {/* Seçili Durak İşaretçisi (Durak Seçimi paneli ve diğer genel kullanımlar için) */}
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

      {/* Bir rota üzerindeki duraklar (selectedRoute varsa VE Aktif Araçlar paneli açıkken) */}
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

      {/* Seçili Redux Durakları (başka bir rota üzerinde olmayanlar) - Navigasyon paneli açık değilse göster */}
      {mapLoaded && !isRouteNavigationPanelOpen && selectedStops.map(stopId => {
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

      {/* Rota Bitiş Noktası İşaretleyicisi (selectedRoute varsa VE Aktif Araçlar paneli açıkken) */}
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

      {/* ✅ YENİ: Çoklu Filo Araçları - Animasyonlu Hareket (Sadece aktif ve seçili araçlar) */}
      {mapLoaded && isFleetTrackingPanelOpen && Object.entries(animatedFleetPositions).map(([vehicleId, animationData]) => {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (!vehicle || !animationData.position) return null;

        // SADECE SEÇİLİ VE AKTİF ARAÇLARIN ANİMASYONUNU GÖSTER
        const isMultiSelected = selectedFleetVehicles.some(v => v.id === vehicleId);
        const isActive = vehicle.status?.toLowerCase().includes('aktif');
        
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
              {/* Araç ikonu */}
              <img
                src={busIconUrl}
                alt={`Araç ${vehicle.plate}`}
                style={{
                  width: isSelected ? '45px' : '35px',
                  height: isSelected ? '45px' : '35px',
                  cursor: 'pointer',
                  filter: `hue-rotate(${getVehicleStatusColor(vehicle.status) === '#28a745' ? '0deg' : 
                    getVehicleStatusColor(vehicle.status) === '#dc3545' ? '120deg' : '240deg'})`,
                  transition: 'all 0.3s ease',
                  transform: isMultiSelected ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: isMultiSelected ? '0 0 15px rgba(0,123,255,0.6)' : 'none',
                  borderRadius: '50%'
                }}
                onClick={() => onFleetVehicleMarkerClick && onFleetVehicleMarkerClick(vehicle)}
              />
              
              {/* Durum göstergesi - küçük renkli nokta */}
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

              {/* Pop-up - sadece seçili araç için */}
              {isSelected && (
                <div className="vehicle-popup" style={{
                  position: 'absolute',
                  bottom: '50px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'white',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  zIndex: 1000,
                  border: '1px solid #ddd'
                }}>
                  <div dangerouslySetInnerHTML={{
                    __html: getPopupContent(vehicle, selectedPopupInfo)
                  }} />
                  <div style={{ 
                    position: 'absolute', 
                    bottom: '-6px', 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '6px solid white'
                  }} />
                </div>
              )}
            </div>
          </Marker>
        );
      })}

      {/* ✅ Filo Araç İşaretleyicileri - Statik Konumlar (Sadece aktif ve seçili araçlar) */}
      {mapLoaded && isFleetTrackingPanelOpen && vehicles.map((vehicle) => {
        // SADECE SEÇİLİ VE AKTİF ARAÇLARI GÖSTER
        const isMultiSelected = selectedFleetVehicles.some(v => v.id === vehicle.id);
        const isActive = vehicle.status?.toLowerCase().includes('aktif');
        
        if (!isMultiSelected || !isActive) return null; // Seçili değilse veya aktif değilse hiç gösterme
        
        // Eğer bu araç animasyonlu ise, statik gösterme
        if (animatedFleetPositions[vehicle.id]) return null;
        
        const isSelected = selectedFleetVehicle?.id === vehicle.id;
        const iconSize = isSelected ? '40px' : '30px';

        // YALNIZCA KABUL EDİLEBİLİR KONUM VERİSİNE SAHİP ARAÇLARI RENDER ET
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
                alt={`Araç ID: ${vehicle.vehicleId}`}
                style={{
                  width: iconSize,
                  height: iconSize,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: isMultiSelected ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: isMultiSelected ? '0 0 15px rgba(0,123,255,0.6)' : 'none',
                  borderRadius: '50%'
                }}
                onClick={() => onFleetVehicleMarkerClick && onFleetVehicleMarkerClick(vehicle)}
                onError={(e) => { e.currentTarget.style.opacity = '0.2'; console.error('Bus icon yüklenemedi'); }}
              />
              
              {/* Durum göstergesi */}
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

              {/* Pop-up: Sadece seçili araç için gösteriliyor */}
              {isSelected && (
                <Popup
                  longitude={vehicle.location.lng}
                  latitude={vehicle.location.lat}
                  onClose={() => { /* Popup, isSelected false olunca kapanır */ }}
                  anchor="bottom"
                  closeButton={false}
                  closeOnClick={true}
                  offset={[-1, -15]}
                >
                  <div className="bus-popup-info" dangerouslySetInnerHTML={{
                    __html: getPopupContent(vehicle, selectedPopupInfo)
                  }} />
                </Popup>
              )}
            </div>
          </Marker>
        );
      })}

      {/* 🔎 Panel KAPALIYSA bile seçilen aracı tek başına göster */}
      {mapLoaded && !isFleetTrackingPanelOpen && selectedFleetVehicle && selectedFleetVehicle.location && (
        <Marker
          longitude={selectedFleetVehicle.location.lng}
          latitude={selectedFleetVehicle.location.lat}
          anchor="center"
        >
          <img
            src={busIconUrl}
            alt={`Seçili Araç ${selectedFleetVehicle.plate || selectedFleetVehicle.id}`}
            style={{ width: '40px', height: '40px' }}
          />
        </Marker>
      )}

      {/* 🧭 Navigasyon Rotası Katmanları (Nasıl Giderim paneli için) */}
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

      {/* 🧭 Navigasyon Başlangıç ve Bitiş Noktası İşaretleyicileri */}
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

      {/* Animasyonlu Otobüs (Sadece haritada otobüs görünür ve selectedItem seçiliyse) */}
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
          {/* Pop-up geri getirildi! */}
          {animatedDistanceToDestination !== null && animatedTimeToDestination !== null && (
            <div className="bus-popup">
              <div>Kalan: {(animatedDistanceToDestination / 1000).toFixed(2)} km</div>
              <div>Hız: {SIMULATED_BUS_SPEED_KMH} km/s</div>
              <div>Süre: {formatTime(animatedTimeToDestination)}</div>
              {currentAnimatedStop?.name && (
                <div>Durak: {currentAnimatedStop.name}</div>
              )}
            </div>
          )}
        </Marker>
      )}
    </Map>
  );
}

export default MapComponent;