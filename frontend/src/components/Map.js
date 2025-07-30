// frontend/src/components/Map.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getDistance } from 'geolib';
import './Map.css';

const locationIcon = require('../assets/location.png');
const busIcon = require('../assets/bus_icon.png');

// Simüle edilmiş otobüs hızı (km/saat)
const SIMULATED_BUS_SPEED_KMH = 40; // Örneğin 40 km/saat
const SIMULATED_BUS_SPEED_MPS = (SIMULATED_BUS_SPEED_KMH * 1000) / 3600; // Metre/saniye cinsine çevrildi

function MapComponent({
  vehicles,
  onVehicleClick,
  selectedVehicle,
  stops,
  routes,
  selectedRoute,
  selectedStop,
  mapCenter,
  zoomLevel = 13
}) {
  const mapRef = useRef();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [animatedBusPosition, setAnimatedBusPosition] = useState(null);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const animationIntervalRef = useRef(null);
  const [distanceToDestination, setDistanceToDestination] = useState(null);
  const [timeToDestination, setTimeToDestination] = useState(null);

  // **** BURADAKİ DEĞİŞİKLİK: routeEndPoint tanımını YUKARI TAŞIDIK ****
  // Güzergahın bitiş noktasını hesapla (useEffect'ten önce tanımlandı)
  const routeEndPoint = React.useMemo(() => {
    if (selectedRoute?.directions?.['1'] && selectedRoute.directions['1'].length > 0) {
      const lastCoord = selectedRoute.directions['1'][selectedRoute.directions['1'].length - 1];
      return { lat: lastCoord[0], lng: lastCoord[1] };
    }
    return null;
  }, [selectedRoute]);
  // ********************************************************************

  const MAP_STYLE = 'https://api.maptiler.com/maps/basic/style.json?key=boHgitm9Copjety599um';

  const onMapLoad = useCallback(() => {
    setMapLoaded(true);
    console.log("Map.js - Harita yüklendi!");
  }, []);

  useEffect(() => {
    let targetCenter = null;
    if (mapCenter && mapCenter.length === 2 && !isNaN(mapCenter[0]) && !isNaN(mapCenter[1])) {
      targetCenter = [mapCenter[1], mapCenter[0]];
    }

    if (targetCenter && mapRef.current && mapLoaded) {
      if (isNaN(targetCenter[0]) || isNaN(targetCenter[1])) return;
      mapRef.current.flyTo({
        center: targetCenter,
        zoom: zoomLevel,
        duration: 1000
      });
    }
  }, [mapCenter, zoomLevel, mapLoaded]);

  // Otobüs animasyonu, kalan mesafe ve süre hesaplaması için useEffect
  useEffect(() => {
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }

    if (mapLoaded && selectedRoute?.directions?.['1'] && selectedRoute.directions['1'].length > 0) {
      const pathCoordinates = selectedRoute.directions['1'];
      const destinationPoint = routeEndPoint; // Artık burada erişebiliriz!

      // Animasyonu sıfırla
      setCurrentPathIndex(0);
      setAnimatedBusPosition({ lat: pathCoordinates[0][0], lng: pathCoordinates[0][1] });

      // Başlangıç mesafesini ve süreyi hesapla
      if (destinationPoint && pathCoordinates[0]) {
        try {
          const initialDistance = getDistance(
            { latitude: pathCoordinates[0][0], longitude: pathCoordinates[0][1] },
            { latitude: destinationPoint.lat, longitude: destinationPoint.lng }
          );
          setDistanceToDestination(initialDistance);
          if (SIMULATED_BUS_SPEED_MPS > 0 && initialDistance > 0) {
            setTimeToDestination(initialDistance / SIMULATED_BUS_SPEED_MPS);
          } else {
            setTimeToDestination(0);
          }
        } catch (error) {
          console.error("Başlangıç mesafesi/süresi hesaplanırken hata oluştu:", error);
          setDistanceToDestination(null);
          setTimeToDestination(null);
        }
      } else {
        setDistanceToDestination(null);
        setTimeToDestination(null);
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
            setDistanceToDestination(0);
            setTimeToDestination(0);
            return prevIndex;
          }

          const nextCoord = pathCoordinates[nextIndex];
          setAnimatedBusPosition({ lat: nextCoord[0], lng: nextCoord[1] });

          if (destinationPoint) {
            try {
              const remainingDist = getDistance(
                { latitude: nextCoord[0], longitude: nextCoord[1] },
                { latitude: destinationPoint.lat, longitude: destinationPoint.lng }
              );
              setDistanceToDestination(remainingDist);

              if (SIMULATED_BUS_SPEED_MPS > 0 && remainingDist > 0) {
                setTimeToDestination(remainingDist / SIMULATED_BUS_SPEED_MPS);
              } else {
                setTimeToDestination(0);
              }
            } catch (error) {
              console.error("Kalan mesafe veya süre hesaplanırken hata oluştu:", error);
              setDistanceToDestination(null);
              setTimeToDestination(null);
            }
          }

          return nextIndex;
        });
      }, 250);
    } else {
      setAnimatedBusPosition(null);
      setCurrentPathIndex(0);
      setDistanceToDestination(null);
      setTimeToDestination(null);
    }

    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
    };
  }, [selectedRoute, mapLoaded, routeEndPoint]); // Bağımlılıklar doğru

  // Saniyeyi dakika ve saniyeye çeviren yardımcı fonksiyon
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
    if (!selectedRoute) return null;

    const features = [];

    if (selectedRoute.directions['1'] && selectedRoute.directions['1'].length > 0) {
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
    }

    return {
      type: 'FeatureCollection',
      features: features
    };
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

      {/* Durak Marker */}
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

      {/* Güzergah Başlangıç Noktası bilgilendirme pop up */}
      {mapLoaded && selectedRoute?.start && selectedRoute?.end && (
        <div className="route-info-overlay">
          <div className="route-info-box">
            <strong>Güzergah:</strong> {selectedRoute.start} → {selectedRoute.end}
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

      {/* Seçili Otobüsün Başlangıç Noktası (Eğer varsa ve farklı bir işaretle göstermek isteniyorsa) */}
      {mapLoaded && selectedVehicle?.lat && selectedVehicle?.lng && (
        <Marker
          longitude={selectedVehicle.lng}
          latitude={selectedVehicle.lat}
          anchor="center"
        >
          <img
            src={locationIcon}
            alt="Başlangıç"
            style={{ width: '29px', height: '29px' }}
          />
        </Marker>
      )}

      {/* Animasyonlu Otobüs Marker'ı ve Pop-up */}
      {mapLoaded && animatedBusPosition && (
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
          {distanceToDestination !== null && timeToDestination !== null && (
            <div className="bus-popup">
              <div>Kalan: {(distanceToDestination / 1000).toFixed(2)} km</div>
              <div>Hız: {SIMULATED_BUS_SPEED_KMH} km/s</div>
              <div>Süre: {formatTime(timeToDestination)}</div>
            </div>
          )}
        </Marker>
      )}

      {/* Güzergah Bitiş Noktası Marker'ı (görsel olarak da olsa) */}
      {mapLoaded && routeEndPoint && (
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
    </Map>
  );
}

export default MapComponent;