// frontend/src/components/Map.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getDistance } from 'geolib'; // Mesafe hesaplaması için

import './Map.css'; // Map.css dosyanızın var olduğundan emin olun

const locationIcon = require('../assets/location.png');
const busIcon = require('../assets/bus_icon.png');
// Duraklar için yeni bir ikon veya basit bir yuvarlak nokta stili kullanabiliriz
// const stopMarkerIcon = require('../assets/stop_marker.png'); // Eğer özel bir ikon kullanacaksan

const SIMULATED_BUS_SPEED_KMH = 30; // Hız 30 km/s olarak güncellendi
const SIMULATED_BUS_SPEED_MPS = (SIMULATED_BUS_SPEED_KMH * 1000) / 3600;

function MapComponent({
  vehicles,
  onVehicleClick,
  selectedVehicle,
  stops,
  routes,
  selectedRoute,
  selectedStop,
  mapCenter,
  zoomLevel = 13,
  onCurrentStopChange, // App.js'e mevcut durağı bildirecek
  displayStartEndMarkers, // Başlangıç/bitiş marker'larını gösterip göstirmeme
  startPointInfo,       // Başlangıç durağı bilgisi (name, lat, lng)
  endPointInfo          // Bitiş durağı bilgisi (name, lat, lng)
}) {
  const mapRef = useRef();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [animatedBusPosition, setAnimatedBusPosition] = useState(null);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const animationIntervalRef = useRef(null);
  const [currentDistanceToDestination, setCurrentDistanceToDestination] = useState(null); // Local state
  const [currentTimeToDestination, setCurrentTimeToDestination] = useState(null);       // Local state
  const [displayStopsOnRoute, setDisplayStopsOnRoute] = useState({ current: null, next: null });


  const MAP_STYLE = 'https://api.maptiler.com/maps/basic/style.json?key=xOQhMUZleM9cojouQ0fu'; // API anahtarını kontrol et

  const onMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  useEffect(() => {
    if (mapCenter && mapCenter.length === 2 && !isNaN(mapCenter[0]) && !isNaN(mapCenter[1])) {
      if (mapRef.current && mapLoaded) {
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

      const destinationPoint = {
        lat: pathCoordinates[pathCoordinates.length - 1][0],
        lng: pathCoordinates[pathCoordinates.length - 1][1]
      };

      setCurrentPathIndex(0);
      setAnimatedBusPosition({ lat: pathCoordinates[0][0], lng: pathCoordinates[0][1] });
      setDisplayStopsOnRoute({ current: null, next: null });
      if (onCurrentStopChange) { // Başlangıçta null gönder
        onCurrentStopChange(null);
      }

      // Mesafe ve süre hesaplamaları tekrar buraya getirildi!
      if (destinationPoint && pathCoordinates[0]) {
        try {
          const initialDistance = getDistance(
            { latitude: pathCoordinates[0][0], longitude: pathCoordinates[0][1] },
            { latitude: destinationPoint.lat, longitude: destinationPoint.lng }
          );
          setCurrentDistanceToDestination(initialDistance); // Kendi local state'ine set et
          if (SIMULATED_BUS_SPEED_MPS > 0 && initialDistance > 0) {
            setCurrentTimeToDestination(initialDistance / SIMULATED_BUS_SPEED_MPS); // Kendi local state'ine set et
          } else {
            setCurrentTimeToDestination(0);
          }
        } catch (error) {
          console.error("Başlangıç mesafesi/süresi hesaplanırken hata oluştu:", error);
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
            setCurrentDistanceToDestination(0); // Animasyon bitince sıfırla
            setCurrentTimeToDestination(0);     // Animasyon bitince sıfırla

            const finalStop = routeStops[routeStops.length - 1] || null;
            setDisplayStopsOnRoute({ current: finalStop, next: null });
            if (onCurrentStopChange) { // Son durağı bildir
                onCurrentStopChange(finalStop);
            }
            return prevIndex;
          }

          const nextCoord = pathCoordinates[nextIndex];
          setAnimatedBusPosition({ lat: nextCoord[0], lng: nextCoord[1] });

          // Kalan mesafe ve süre hesaplamaları tekrar buraya getirildi!
          if (destinationPoint) {
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
              console.error("Kalan mesafe veya süre hesaplanırken hata oluştu:", error);
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
            if (onCurrentStopChange) { // Her animasyon adımında mevcut durağı bildir
                onCurrentStopChange(current);
            }
          }

          return nextIndex;
        });
      }, 250);

    } else {
      setAnimatedBusPosition(null);
      setCurrentPathIndex(0);
      setCurrentDistanceToDestination(null); // Güzergah yoksa sıfırla
      setCurrentTimeToDestination(null);     // Güzergah yoksa sıfırla
      setDisplayStopsOnRoute({ current: null, next: null });
      if (onCurrentStopChange) { // Güzergah yoksa null bildir
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
    return { lat: lastCoord[0], lng: lastCoord[1] };
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
      {/* Güzergah çizgisi sadece selectedRoute varsa çizilir */}
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

      {/* Durak Marker (seçili durak varsa - arama panelinden seçilen durak) */}
      {mapLoaded && selectedStop?.lat && selectedStop?.lng && (
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
      {mapLoaded && selectedRoute?.stops && selectedRoute.stops.map((stop) => (
        <Marker
          key={stop.id + "-" + stop.sequence}
          longitude={stop.lng}
          latitude={stop.lat}
          anchor="center"
        >
          {/* Basit bir kırmızı daire marker'ı */}
          <div style={{
            width: '12px',
            height: '12px',
            backgroundColor: 'red',
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 0 5px rgba(0,0,0,0.5)'
          }} title={stop.name}></div>
        </Marker>
      ))}


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
      ))}

      {/* Animasyonlu Otobüs Marker'ı ve Pop-up - SADECE selectedRoute varsa */}
      {mapLoaded && animatedBusPosition && selectedRoute && (
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
          {/* Varışa kalan mesafe, hız ve süre pop-up'ı (DURAK BİLGİSİ BURADAN KALDIRILDI) */}
          {currentDistanceToDestination !== null && currentTimeToDestination !== null && (
            <div className="bus-popup">
              <div>Kalan: {(currentDistanceToDestination / 1000).toFixed(2)} km</div>
              <div>Hız: {SIMULATED_BUS_SPEED_KMH} km/s</div>
              <div>Süre: {formatTime(currentTimeToDestination)}</div>
            </div>
          )}
        </Marker>
      )}

      {/* Güzergah Bitiş Noktası Marker'ı - SADECE selectedRoute varsa */}
      {mapLoaded && routeEndPoint && selectedRoute && (
        <Marker
          longitude={routeEndPoint.lng}
          latitude={routeEndPoint.lat}
          anchor="center"
        >
          <img
            src={locationIcon}
            alt="Bitiş Noktası"
            style={{ width: '35px', height: '35px' }}
          />
        </Marker>
      )}

      {/* BAŞLANGIÇ VE BİTİŞ DURAK MARKERLARI (displayStartEndMarkers prop'u true ise) */}
      {mapLoaded && displayStartEndMarkers && selectedRoute?.stops && selectedRoute.stops.length > 0 && (
        <>
          {/* Başlangıç Durağı Marker */}
          {startPointInfo?.lat && startPointInfo?.lng && (
            <Marker
              longitude={startPointInfo.lng}
              latitude={startPointInfo.lat}
              anchor="center"
            >
              <img
                src={locationIcon}
                alt="Başlangıç Durağı"
                style={{ width: '35px', height: '35px', filter: 'hue-rotate(120deg)' }} /* Yeşil tonu için filter eklendi */
              />
              <div className="stop-popup">
                <strong>{selectedRoute.route_number} No'lu Hattın Başlangıç Durağı</strong>
                <br />
                {startPointInfo.name}
              </div>
            </Marker>
          )}

          {/* Bitiş Durağı Marker */}
          {endPointInfo?.lat && endPointInfo?.lng && (
            <Marker
              longitude={endPointInfo.lng}
              latitude={endPointInfo.lat}
              anchor="center"
            >
              <img
                src={locationIcon}
                alt="Bitiş Durağı"
                style={{ width: '35px', height: '35px', filter: 'hue-rotate(240deg)' }} /* Mavi tonu için filter eklendi */
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