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

// Rotalar için renk paleti
const ROUTE_COLORS = [
  '#FF0000', // Kırmızı
  '#00FF00', // Yeşil
  '#0000FF', // Mavi
  '#FFD700', // Altın Sarısı
  '#FF69B4', // Hot Pink
  '#00CED1', // Dark Turquoise
  '#FF4500', // Orange Red
  '#9370DB', // Medium Purple
  '#32CD32', // Lime Green
  '#FF1493', // Deep Pink
  '#00FA9A', // Medium Spring Green
  '#1E90FF', // Dodger Blue
  '#FF8C00', // Dark Orange
  '#DA70D6', // Orchid
  '#00FFFF', // Cyan
  '#FFB6C1', // Light Pink
  '#98FB98', // Pale Green
  '#87CEEB', // Sky Blue
  '#DDA0DD', // Plum
  '#F0E68C'  // Khaki
];

const LIGHT_MAP_STYLE_URL = 'https://api.maptiler.com/maps/basic/style.json?key=xOQhMUZleM9cojouQ0fu';
const DARK_MAP_STYLE_URL = 'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=xOQhMUZleM9cojouQ0fu';

function MapComponent({
  vehicles,
  onVehicleClick,
  selectedVehicle,
  selectedRoute, // Tekli animasyonlu güzergah için
  selectedStop,
  mapCenter,
  zoomLevel = 13,
  onCurrentStopChange,
  displayStartEndMarkers,
  startPointInfo,
  endPointInfo,
  currentAnimatedStop,
  // YENİ PROP'lar: Çoklu rota çizimi için
  currentDirection,
  selectedRouteIds, // Redux'tan gelen ID'ler
  allRoutes, // Redux'tan gelen tüm rota objeleri
  theme
}) {
  const mapRef = useRef();

  const popupRef = useRef(null); // Yeni eklenen satır


  const [mapLoaded, setMapLoaded] = useState(false);
  const [animatedBusPosition, setAnimatedBusPosition] = useState(null);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const animationIntervalRef = useRef(null);
  const [currentDistanceToDestination, setCurrentDistanceToDestination] = useState(null);
  const [currentTimeToDestination, setCurrentTimeToDestination] = useState(null);
  const [displayStopsOnRoute, setDisplayStopsOnRoute] = useState({ current: null, next: null });

  // YENİ STATE: Seçili rotaların koordinat verilerini tutacak
  const [selectedRoutesData, setSelectedRoutesData] = useState({});

  // YENİ STATE: Popup görünümü için
  const [routePopup, setRoutePopup] = useState(null);
  const [hoveredRoute, setHoveredRoute] = useState(null);

  const selectedStops = useSelector(state => state.selectedItems?.selectedStopIds || []);
  const allStops = useSelector(state => state.selectedItems?.allStops || []);



  const onMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

   useEffect(() => {
    if (mapLoaded && mapRef.current) {
      const newStyleUrl = theme === 'dark' ? DARK_MAP_STYLE_URL : LIGHT_MAP_STYLE_URL;
      // Haritanın stilini güncelliyoruz
mapRef.current.getMap().setStyle(newStyleUrl);    }
  }, [theme, mapLoaded]); 

  // Rota rengini almak için yardımcı fonksiyon
  const getRouteColor = (routeIndex) => {
    return ROUTE_COLORS[routeIndex % ROUTE_COLORS.length];
  };

    useEffect(() => {
    if (popupRef.current && routePopup) {
      // Pop-up elementi varsa ve routePopup aktifse
      popupRef.current.style.setProperty('--popup-bg-color', routePopup.color);
      popupRef.current.style.left = `${routePopup.x}px`;
      popupRef.current.style.top = `${routePopup.y}px`;
    }
  }, [routePopup]); // routePopup değiştiğinde bu effect çalışsın
  
  
  
  
  // YENİ EFFECT: Seçili rotalar değiştiğinde API'den koordinatları çek
  useEffect(() => {
    if (!selectedRouteIds || selectedRouteIds.length === 0) {
      setSelectedRoutesData({});
      return;
    }

    const fetchRouteData = async () => {
      const newRoutesData = {};

      for (const routeId of selectedRouteIds) {
        const route = allRoutes[routeId];
        if (route && route.route_number) {
          try {
            const response = await fetch(`http://localhost:5000/api/route-details/${route.route_number}/1`);
            if (response.ok) {
              const data = await response.json();
              newRoutesData[routeId] = {
                ...route,
                directions: {
                  '1': data.coordinates,
                  '2': []
                },
                stops: data.stops,
                start_point: data.start_point,
                end_point: data.end_point
              };
            } else {
              console.error(`Rota detayları çekilemedi: ${route.route_number}`, response.status);
            }
          } catch (error) {
            console.error(`Rota detayları çekilirken hata: ${route.route_number}`, error);
          }
        }
      }

      setSelectedRoutesData(newRoutesData);
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
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }

    // Sadece selectedRoute var ve geçerli directions varsa animasyonu başlat
    if (mapLoaded && selectedRoute?.directions && selectedRoute.directions[currentDirection] && selectedRoute.directions[currentDirection].length > 0)
       {
      const pathCoordinates = selectedRoute.directions[currentDirection];
      const routeStops = selectedRoute.stops;

      const lastCoord = pathCoordinates[pathCoordinates.length - 1];
      const destinationPoint = (lastCoord && typeof lastCoord[0] === 'number' && typeof lastCoord[1] === 'number')
        ? { lat: lastCoord[0], lng: lastCoord[1] }
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
            if (destinationPoint) {
              setAnimatedBusPosition({ lat: destinationPoint.lat, lng: destinationPoint.lng });
            }
            setCurrentDistanceToDestination(0);
            setCurrentTimeToDestination(0);
            const finalStop = routeStops[routeStops.length - 1] || null;
            setDisplayStopsOnRoute({ current: finalStop, next: null });
            if (onCurrentStopChange) {
              onCurrentStopChange(finalStop);
            }
            return prevIndex;
          }

          const nextCoord = pathCoordinates[nextIndex];
          if (nextCoord && typeof nextCoord[0] === 'number' && typeof nextCoord[1] === 'number') {
            setAnimatedBusPosition({ lat: nextCoord[0], lng: nextCoord[1] });
          } else {
            clearInterval(animationIntervalRef.current);
            animationIntervalRef.current = null;
            console.error("Invalid coordinate detected during animation:", nextCoord);
            setAnimatedBusPosition(null);
            setCurrentDistanceToDestination(null);
            setCurrentTimeToDestination(null);
            return prevIndex;
          }

          if (destinationPoint && nextCoord) {
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
            if (onCurrentStopChange) {
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
  }, [selectedRoute, mapLoaded, onCurrentStopChange,currentDirection]);

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
    // Bu useMemo sadece tekli selectedRoute için rota çizgisi oluşturur
        // currentDirection'a göre doğru yönün koordinatlarını alıyoruz

    if (!selectedRoute || !selectedRoute.directions || !selectedRoute.directions[currentDirection] || selectedRoute.directions[currentDirection].length === 0) {
      return null;
    }

    const features = [];
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: selectedRoute.directions[currentDirection].map(coord => [coord[1], coord[0]])
      },
      properties: {
        direction: currentDirection === '1' ? 'gidis' : 'donus',
        routeNumber: selectedRoute.route_number
      }
    });

    return {
      type: 'FeatureCollection',
      features: features
    };
  }, [selectedRoute, currentDirection]);

  const routeEndPoint = React.useMemo(() => {
    if (!selectedRoute?.directions?.['1'] || selectedRoute.directions['1'].length === 0) {
      return null;
    }
    const lastCoord = selectedRoute.directions['1'][selectedRoute.directions['1'].length - 1];
    return (lastCoord && typeof lastCoord[0] === 'number' && typeof lastCoord[1] === 'number')
      ? { lat: lastCoord[0], lng: lastCoord[1] }
      : null;
  }, [selectedRoute]);

  // YENİ: Çoklu seçilen rotalar için GeoJSON oluşturma (Her rota ayrı kaynak olacak)
  const multipleRoutesData = React.useMemo(() => {
    const routesData = [];

    Object.keys(selectedRoutesData).forEach((routeId, index) => {
      const routeData = selectedRoutesData[routeId];
      // Rotanın varlığını ve directions verisinin geçerliliğini kontrol et
      if (routeData && routeData.directions && routeData.directions['1'] && routeData.directions['1'].length > 0) {
        // Animasyonlu tekli rotadan farklı olsun diye kontrol et
        if (!selectedRoute || selectedRoute.route_number !== routeData.route_number) {
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
      }
    });

    return routesData;
  }, [selectedRoutesData, selectedRoute]);

  // Mouse hover olayları
  const onMouseMove = useCallback((event) => {
    const features = mapRef.current?.queryRenderedFeatures(event.point, {
      layers: multipleRoutesData.map(route => `route-layer-${route.id}`)
    });

    if (features && features.length > 0) {
      const feature = features[0];
      const routeId = feature.properties.routeId;

      if (hoveredRoute !== routeId) {
        setHoveredRoute(routeId);
        mapRef.current.getCanvas().style.cursor = 'pointer';
      }
    } else {
      if (hoveredRoute !== null) {
        setHoveredRoute(null);
        mapRef.current.getCanvas().style.cursor = '';
      }
    }
  }, [multipleRoutesData, hoveredRoute]);

  // Harita tıklama olayını işleme
  const onMapClick = useCallback((event) => {
    // Tıklanan nokta rota üzerinde mi kontrol et
    const features = mapRef.current?.queryRenderedFeatures(event.point, {
      layers: multipleRoutesData.map(route => `route-layer-${route.id}`)
    });

    if (features && features.length > 0) {
      const feature = features[0];
      const { routeId, routeName, color } = feature.properties;

      // Ekran koordinatlarını al
      const canvas = mapRef.current.getCanvasContainer();
      const rect = canvas.getBoundingClientRect();

      setRoutePopup({
        x: event.point.x,
        y: event.point.y,
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
      {/* Güzergah çizgisi sadece selectedRoute varsa çizilir (tekli animasyonlu rota) */}
      {mapLoaded && selectedRoute && routeGeoJSON && (
        <Source id="route-data" type="geojson" data={routeGeoJSON}>
          <Layer
            id="animated-route-line" 
            type="line"
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{ 'line-color': '#0066CC', 'line-width': 5, 'line-opacity': 0.8 }}
          />
        </Source>
      )}

      {/* YENİ: Çoklu seçilen rotaların çizgileri - Her rota ayrı source/layer */}
      {mapLoaded && multipleRoutesData.map((routeData) => (
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

      {/* Rota Pop-up */}
      {routePopup && (
        <div
        ref={popupRef}
          className="route-popup"
          style={{
            position: 'absolute',
             transform: 'translate(-50%, -100%)',

             /*
            left: `${routePopup.x}px`,
            top: `${routePopup.y}px`,
            transform: 'translate(-50%, -100%)',
            '--popup-bg-color': routePopup.color
          } as React.CSSProperties & { '--popup-bg-color': string }}*/ 
          }}
        >
          {routePopup.routeName}
        </div> 
      )}

      {/* Durak Marker (seçili durak varsa - arama panelinden seçilen durak) */}
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

      {/* GÜZERGAH ÜZERİNDEKİ TÜM DURAK MARKERLARI - SADECE selectedRoute varsa */}
      {mapLoaded && selectedRoute?.stops && selectedRoute.stops.map((stop) => {
        const isSelected = selectedStops.includes(stop.id);
        return (
          stop && typeof stop.lat === 'number' && typeof stop.lng === 'number' && (
            <Marker
              key={stop.id + "-" + stop.sequence}
              longitude={stop.lng}
              latitude={stop.lat}
              anchor="center"
            >
              <div style={{
                width: isSelected ? '18px' : '12px',
                height: isSelected ? '18px' : '12px',
                backgroundColor: isSelected ? '#FFD700' : 'red',
                borderRadius: '50%',
                border: isSelected ? '3px solid #FF6B35' : '2px solid white',
                boxShadow: isSelected ? '0 0 15px rgba(255, 215, 0, 0.8)' : '0 0 5px rgba(0,0,0,0.5)',
                animation: isSelected ? 'pulse 2s infinite' : 'none'
              }} title={stop.name + (isSelected ? ' (Seçili)' : '')}></div>
            </Marker>
          )
        );
      })}

      {/* SEÇİLİ DURAKLAR İÇİN EK MARKERLAR (Güzergah dışından seçilen duraklar) */}
      {mapLoaded && selectedStops.map(stopId => {
        const stop = allStops.find(s => s.id === stopId);
        const isOnSelectedRoute = selectedRoute?.stops?.some(routeStop => routeStop.id === stopId);

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

      {/* Güzergah Başlangıç Noktası bilgilendirme pop up */}
      {mapLoaded && selectedRoute?.start_point && selectedRoute?.end_point && (
        <div className="route-info-overlay">
          <div className="route-info-box">
            <strong>{selectedRoute.route_number}</strong> - {selectedRoute.start_point} → {selectedRoute.end_point}
          </div>
        </div>
      )}

      {/* Otobüs Marker'ları (Gerçek zamanlı otobüsler - Eğer kullanılıyorsa) */}
      {mapLoaded && vehicles.map((vehicle) => (
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

      {/* Animasyonlu Otobüs Marker'ı ve Pop-up - SADECE selectedRoute varsa */}
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
          {/* Varışa kalan mesafe, hız ve süre pop-up'ı */}
          {currentDistanceToDestination !== null && currentTimeToDestination !== null && (
            <div className="bus-popup">
              <div>Kalan: {(currentDistanceToDestination / 1000).toFixed(2)} km</div>
              <div>Hız: {SIMULATED_BUS_SPEED_KMH} km/s</div>
              <div>Süre: {formatTime(currentTimeToDestination)}</div>
              {currentAnimatedStop?.name && (
                <div>Durak: {currentAnimatedStop.name}</div>
              )}
            </div>
          )}
        </Marker>
      )}

      {/* Güzergah Bitiş Noktası Marker'ı - SADECE selectedRoute varsa */}
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

      {/* BAŞLANGIÇ VE BİTİŞ DURAK MARKERLARI (displayStartEndMarkers prop'u true ise) */}
      {mapLoaded && displayStartEndMarkers && selectedRoute?.stops && selectedRoute.stops.length > 0 && (
        <>
          {/* Başlangıç Durağı Marker */}
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

          {/* Bitiş Durağı Marker */}
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