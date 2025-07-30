

// frontend/src/components/Map.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import './Map.css';

const locationIcon = require('../assets/location.png');
const busIcon = require('../assets/bus_icon.png'); // Otobüs animasyonu için yeni ikon

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
  const [animatedBusPosition, setAnimatedBusPosition] = useState(null); // Animasyonlu otobüsün konumu
  const [currentPathIndex, setCurrentPathIndex] = useState(0); // Güzergah üzerindeki mevcut indeks
  const animationIntervalRef = useRef(null); // Interval ID'sini tutmak için ref

  const MAP_STYLE = 'https://api.maptiler.com/maps/basic/style.json?key=boHgitm9Copjety599um';

  const onMapLoad = useCallback(() => {
    setMapLoaded(true);
    console.log("Map.js - Harita yüklendi!");
  }, []);

  useEffect(() => {
    console.log("Map.js - useEffect (mapCenter) tetiklendi:", mapCenter);

    let targetCenter = null;
    if (mapCenter && mapCenter.length === 2 && !isNaN(mapCenter[0]) && !isNaN(mapCenter[1])) {
      targetCenter = [mapCenter[1], mapCenter[0]]; // [lat, lng] -> [lng, lat]
    }

    if (targetCenter && mapRef.current && mapLoaded) {
      if (isNaN(targetCenter[0]) || isNaN(targetCenter[1])) return;
      console.log(`Map.js - flyTo: ${targetCenter}, zoom: ${zoomLevel}`);
      mapRef.current.flyTo({
        center: targetCenter,
        zoom: zoomLevel,
        duration: 1000
      });
    }
  }, [mapCenter, zoomLevel, mapLoaded]);

  // Otobüs animasyonu için useEffect
  useEffect(() => {
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }

    if (mapLoaded && selectedRoute?.directions?.['1'] && selectedRoute.directions['1'].length > 0) {
      const pathCoordinates = selectedRoute.directions['1']; // [lat, lng] formatında
      setCurrentPathIndex(0);
      setAnimatedBusPosition({ lat: pathCoordinates[0][0], lng: pathCoordinates[0][1] });

      animationIntervalRef.current = setInterval(() => {
        setCurrentPathIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % pathCoordinates.length;
          const nextCoord = pathCoordinates[nextIndex];
          setAnimatedBusPosition({ lat: nextCoord[0], lng: nextCoord[1] });
          return nextIndex;
        });
      }, 100); // Her 100ms'de bir ilerleyerek pürüzsüz animasyon sağlar
    } else {
      setAnimatedBusPosition(null); // Güzergah yoksa animasyonlu otobüsü kaldır
      setCurrentPathIndex(0);
    }

    // Component unmount edildiğinde veya bağımlılıklar değiştiğinde interval'i temizle
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
    };
  }, [selectedRoute, mapLoaded]);


  const routeGeoJSON = React.useMemo(() => {
    if (!selectedRoute) return null;

    const features = [];

    if (selectedRoute.directions['1'] && selectedRoute.directions['1'].length > 0) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: selectedRoute.directions['1'].map(coord => [coord[1], coord[0]]) // [lat, lng] -> [lng, lat]
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

  // Güzergahın bitiş noktasını hesapla
  const routeEndPoint = React.useMemo(() => {
    if (selectedRoute?.directions?.['1'] && selectedRoute.directions['1'].length > 0) {
      const lastCoord = selectedRoute.directions['1'][selectedRoute.directions['1'].length - 1];
      return { lat: lastCoord[0], lng: lastCoord[1] };
    }
    return null;
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


      {/* Otobüs Marker'ları (Gerçek zamanlı otobüsler) */}
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
            src={locationIcon} // Mevcut canlı otobüsler için locationIcon'u kullanmaya devam ettim
            alt="Başlangıç"
            style={{ width: '29px', height: '29px' }}
          />
        </Marker>
      )}

      {/* Animasyonlu Otobüs Marker'ı */}
      {mapLoaded && animatedBusPosition && (
        <Marker
          longitude={animatedBusPosition.lng}
          latitude={animatedBusPosition.lat}
          anchor="center"
        >
          <img
            src={busIcon} // Animasyonlu otobüs için bus_icon.png kullanılıyor
            alt="Animated Bus"
            style={{ width: '40px', height: '40px' }} // Görünürlüğü artırmak için boyut ayarı
          />
        </Marker>
      )}

      {/* Güzergah Bitiş Noktası Marker'ı */}
      {mapLoaded && routeEndPoint && (
        <Marker
          longitude={routeEndPoint.lng}
          latitude={routeEndPoint.lat}
          anchor="center"
        >
          <img
            src={locationIcon} // Bitiş noktası için location.png kullanılıyor
            alt="Bitiş Noktası"
            style={{ width: '35px', height: '35px' }} // Daha görünür olması için boyut ayarı
          />
        </Marker>
      )}
    </Map>
  );
}

export default MapComponent;