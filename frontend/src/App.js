// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import VehicleList from './components/VehicleList';
import Map from './components/Map';
import './App.css';

// JSON verilerini import ediyorum
import stopsDataRaw from './data/stops.json'; 
import hatlarData from './data/hatlar.json';

function App() {
  const [vehicles, setVehicles] = useState([]); 
  const [stops, setStops] = useState([]); 
  const [routes, setRoutes] = useState({});  
  const [selectedItem, setSelectedItem] = useState(null); 
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); 
  const [filteredItems, setFilteredItems] = useState([]); 
  const [selectedRoute, setSelectedRoute] = useState(null); 
  const [selectedStop, setSelectedStop] = useState(null);   
  const [mapCenter, setMapCenter] = useState(null);

  useEffect(() => {
    // 1. Durak verilerini işle (frontend/local JSON)
    const processedStops = stopsDataRaw.map(stop => {
      const lat = parseFloat(stop.ENLEM);
      const lng = parseFloat(stop.BOYLAM);

      if (isNaN(lat) || isNaN(lng)) {
        console.warn(`Geçersiz durak koordinatı: ${stop.DURAK_ADI} (ENLEM: ${stop.ENLEM}, BOYLAM: ${stop.BOYLAM}). Atlanıyor.`);
        return null;
      }

      return {
        id: stop.DURAK_ID,
        name: stop.DURAK_ADI,
        lat,
        lng,
        busLines: stop.DURAKTAN_GECEN_HATLAR 
                  ? stop.DURAKTAN_GECEN_HATLAR.split('-').map(s => s.trim()) 
                  : []
      };
    }).filter(stop => stop !== null);

    setStops(processedStops);

    // 2. Hatları baştan oluştur (frontend/local JSON)
    const allHats = {};
    hatlarData.records.forEach(record => {
      const hatNo = record[1].toString();
      allHats[hatNo] = {
        id: hatNo,
        route_number: hatNo,
        route_name: record[2] || `Hat ${hatNo}`,
        route_description: record[3] || '',
        start: record[5] || '',
        end: record[6] || '',
        directions: {
          '1': [],
          '2': []
        },
        center: null
      };
    });

    // 3. Backend'den güzergah verisini çek ve allHats içine işle
    fetch('http://localhost:5000/api/routes')
      .then(res => res.json())
      .then(data => {
        
            console.log("Backend'den çekilen güzergahlar:", data);

        data.forEach(record => {
          const HAT_NO = record.HAT_NO.toString();
          const YON = record.YON.toString();
          const lat = parseFloat(record.ENLEM);
          const lng = parseFloat(record.BOYLAM);

          if (isNaN(lat) || isNaN(lng)) return;

          // Eğer hat yoksa oluştur
          if (!allHats[HAT_NO]) {
            allHats[HAT_NO] = {
              id: HAT_NO,
              route_number: HAT_NO,
              route_name: `Hat ${HAT_NO}`,
              route_description: '',
              start: '',
              end: '',
              directions: {
                '1': [],
                '2': []
              },
              center: null
            };
          }

          if (allHats[HAT_NO].directions[YON]) {
            allHats[HAT_NO].directions[YON].push([lat, lng]);
          }
        });

        // Her hat için güzergah merkez noktası hesapla
        Object.values(allHats).forEach(route => {
          let centerPoint = null;
          if (route.directions['1'].length > 0) {
            centerPoint = route.directions['1'].find(coord => Array.isArray(coord) && coord.length === 2 && !isNaN(coord[0]) && !isNaN(coord[1]));
          }
          if (!centerPoint && route.directions['2'].length > 0) {
            centerPoint = route.directions['2'].find(coord => Array.isArray(coord) && coord.length === 2 && !isNaN(coord[0]) && !isNaN(coord[1]));
          }
          route.center = centerPoint || [38.419, 27.128]; // İzmir koordinatı varsayılan
        });

        setRoutes(allHats);
        console.log("Toplam durak sayısı:", processedStops.length);
        console.log("Toplam hat sayısı:", Object.keys(allHats).length);
      })
      .catch(err => {
        console.error("Güzergah verisi alınırken hata oluştu:", err);
      });

  }, []);

  // Arama ve diğer fonksiyonlar aynı...

  const handleSearch = (term) => {
    setSearchTerm(term);
    setSelectedItem(null); 
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);

    if (term.trim() === '') {
      setFilteredItems([]);
      return;
    }

    const lowerCaseTerm = term.toLowerCase();
    let currentFilteredItems = [];

    const foundRoutes = Object.values(routes).filter(route => 
      route.route_number.toLowerCase().includes(lowerCaseTerm)
    );

    if (foundRoutes.length === 0) {
      const foundStops = stops.filter(stop => 
        stop.name.toLowerCase().includes(lowerCaseTerm) ||
        stop.id.toLowerCase().includes(lowerCaseTerm)
      );
      currentFilteredItems = foundStops;
    } else {
      currentFilteredItems = foundRoutes;
    }

    setFilteredItems(currentFilteredItems);
  };

  const handleVehicleClick = (item) => {
    setSelectedItem(item);

    if (item.route_number) {
      setSelectedRoute(item);
      setSelectedStop(null);
      if (item.center) {
        setMapCenter(item.center);
      } else {
        setMapCenter([38.419, 27.128]);
      }
    } else if (item.busLines) {
      setSelectedStop(item);
      setSelectedRoute(null);
      if (item.lat && item.lng && !isNaN(item.lat) && !isNaN(item.lng)) {
        setMapCenter([item.lat, item.lng]);
      } else {
        setMapCenter([38.419, 27.128]);
      }
//------------------------güzergah başlangıcıda varış kalkış durak bilgilerinin yazması için ekledim bu kısmı----------------------------
    } else if (item.HAT_NO) {
    const hatNo = item.HAT_NO.toString();
    const hat = hatlarData.records.find(r => r[1].toString() === hatNo);

    if (hat) {
      const routeObj = {
        id: hatNo,
        route_number: hatNo,
        route_name: hat[2] || `Hat ${hatNo}`,
        route_description: hat[3] || '',
        start: hat[5] || '',
        end: hat[6] || '',
        directions: routes[hatNo]?.directions || { '1': [], '2': [] },
        center: routes[hatNo]?.center || [38.419, 27.128]
      };

      setSelectedRoute(routeObj);
      setSelectedStop(null);
      setMapCenter(routeObj.center);
    }
  }

  };

  const togglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
  };


  console.log("Backend'den çekilen güzergahlar:", routes);


  return (
    <div className="app-layout">
      <Sidebar onTogglePanel={togglePanel} /> 
      <div className="main-container">
        <Navbar />
        <div className="content-area">
          <div className={`vehicle-list-wrapper ${isPanelOpen ? 'open' : ''}`}>
            <VehicleList
              items={filteredItems.length > 0 ? filteredItems : Object.values(routes)} 
              onVehicleClick={handleVehicleClick}
              selectedVehicle={selectedItem} 
              onClose={togglePanel} 
              onSearch={handleSearch} 
            />
          </div>
          <Map
            vehicles={vehicles}
            onVehicleClick={handleVehicleClick}
            selectedVehicle={selectedItem} 
            stops={stops} 
            routes={routes} 
            selectedRoute={selectedRoute}
            selectedStop={selectedStop}   
            mapCenter={mapCenter}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
