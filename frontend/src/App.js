// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import VehicleList from './components/VehicleList';
import Map from './components/Map';
import RouteDetailsPanel from './components/RouteDetailsPanel';
import DepartureTimesPanel from './components/DepartureTimesPanel';
import './App.css';

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [stops, setStops] = useState([]); // Durak arama sonuçlarını tutacak
  const [routes, setRoutes] = useState({}); // Hat verisini tutacak
  const [selectedItem, setSelectedItem] = useState(null); // Seçili hat veya durak
  const [isPanelOpen, setIsPanelOpen] = useState(true); // Aktif Araçlar paneli için
  const [isRouteDetailsPanelOpen, setIsRouteDetailsPanelOpen] = useState(false); // Güzergah Detayları paneli için
  const [isDepartureTimesPanelOpen, setIsDepartureTimesPanelOpen] = useState(false); // Kalkış Saatleri paneli için
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState([]); // VehicleList'e gönderilen filtrelenmiş öğeler
  const [selectedRoute, setSelectedRoute] = useState(null); // Haritada çizilecek güzergah için
  const [selectedStop, setSelectedStop] = useState(null); // Haritada gösterilecek durak için
  const [mapCenter, setMapCenter] = useState(null);

  // Uygulama ilk yüklendiğinde hatları çeker
  useEffect(() => {
    fetch('http://localhost:5000/api/routes')
      .then(res => res.json())
      .then(data => {
        setRoutes(data);
        // console.log("Backend'den çekilen hatlar (App.js):", data); // Debug için
        // İlk açılışta varsayılan bir hat seçili hale getirebiliriz (örn: 5)
        if (data['5']) {
          handleVehicleClick(data['5']);
        } else if (Object.values(data).length > 0) {
          handleVehicleClick(Object.values(data)[0]);
        }
      })
      .catch(err => {
        console.error("Hat verisi alınırken hata oluştu (App.js):", err);
        setRoutes({}); // Hata durumunda boş bırak
      });

    setStops([]); // Başlangıçta durakları boş bırakıyoruz, arama ile dolacak

  }, []);

  // Arama Fonksiyonu: Hat veya Durak Arama
  const handleSearch = async (term) => {
    setSearchTerm(term);
    setSelectedItem(null);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);

    const lowerCaseTerm = term.toLowerCase().trim();

    if (lowerCaseTerm === '') {
      setFilteredItems(Object.values(routes)); // Arama boşsa tüm hatları göster
      return;
    }

    let currentFilteredItems = [];
    // Düzenli ifadeler: sadece rakamlar veya sadece harfler (Türkçe karakterler dahil)
    const isNumericTerm = /^\d+$/.test(lowerCaseTerm);
    const isAlphabeticTerm = /^[a-zA-ZğüşöçıİĞÜŞÖÇ]+$/.test(lowerCaseTerm);

    let foundStops = [];
    let foundRoutes = [];

    // Senaryo 1: Sadece Sayısal Arama (örn: "105") -> Sadece Otobüs Hatlarını Göster
    if (isNumericTerm) {
        // Sadece hatları filtrele (numaraya göre)
        foundRoutes = Object.values(routes).filter(route =>
            (route.route_number && route.route_number.toLowerCase().includes(lowerCaseTerm))
        );
        currentFilteredItems = foundRoutes;

    // Senaryo 2: Sadece Alfabetik Arama (örn: "Altıntepe") -> Sadece Durakları Göster
    } else if (isAlphabeticTerm) {
        // Durakları backend'den çek
        try {
            const stopsResponse = await fetch(`http://localhost:5000/api/stops?search=${encodeURIComponent(lowerCaseTerm)}`);
            if (stopsResponse.ok) {
                const allFetchedStops = await stopsResponse.json();
                // Sadece durak ismine göre filtrele (stop_id'si sayısal olan durakları elemek için)
                foundStops = allFetchedStops.filter(stop =>
                    stop.name && stop.name.toLowerCase().includes(lowerCaseTerm)
                );
            } else {
                console.error("Durak araması yapılırken hata:", stopsResponse.status, await stopsResponse.text());
            }
        } catch (error) {
            console.error("Durak araması yapılırken genel hata:", error);
        }
        currentFilteredItems = foundStops;

    // Senaryo 3: Karışık Arama (örn: "15A") veya Diğer Durumlar -> Hem Durak Hem Hat Ara
    } else {
        // Durakları çek (hem isim hem ID'ye göre eşleşebilir)
        try {
            const stopsResponse = await fetch(`http://localhost:5000/api/stops?search=${encodeURIComponent(lowerCaseTerm)}`);
            if (stopsResponse.ok) {
                foundStops = await stopsResponse.json();
            } else {
                console.error("Durak araması yapılırken hata:", stopsResponse.status, await stopsResponse.text());
            }
        } catch (error) {
            console.error("Durak araması yapılırken genel hata:", error);
        }

        // Hatları filtrele (numara veya isme göre)
        foundRoutes = Object.values(routes).filter(route =>
            (route.route_number && route.route_number.toLowerCase().includes(lowerCaseTerm)) ||
            (route.route_name && route.route_name.toLowerCase().includes(lowerCaseTerm))
        );

        // Birleştir: Önce duraklar, sonra hatlar (çakışmaları önlemek için)
        currentFilteredItems = [...foundStops, ...foundRoutes.filter(r => !foundStops.some(s => s.id === r.id))];
    }

    setFilteredItems(currentFilteredItems);
  };

  // handleVehicleClick: VehicleList'ten bir öğeye (hat veya durak) tıklanıldığında
  const handleVehicleClick = async (item) => {
    setSelectedItem(item);
    setSelectedStop(null);
    setSelectedRoute(null);

    if (item.route_number) { // Seçilen öğe bir hat ise
        try {
            // Haritada güzergahı çizmek için detayları backend'den çek
            const response = await fetch(`http://localhost:5000/api/route-details/${item.route_number}/1`); // Gidiş yönü
            if (response.ok) {
                const data = await response.json();
                const fullRouteData = {
                    ...item,
                    directions: {
                        '1': data.coordinates, // Map.js [lat, lng] bekler
                        '2': []
                    },
                    // Harita ortalaması için ilk koordinatı kullan
                    center: data.coordinates && data.coordinates.length > 0 ? data.coordinates[0] : [38.419, 27.128] // [lat, lng] formatında
                };
                setSelectedRoute(fullRouteData);
                setMapCenter([fullRouteData.center[1], fullRouteData.center[0]]); // Map.js'e [lng, lat] olarak gönder
            } else {
                console.error("Harita için güzergah detayları çekilemedi:", item.route_number, response.status, await response.text());
                setSelectedRoute(null);
                setMapCenter([27.128, 38.419]); // İzmir varsayılan [lng, lat]
            }
        } catch (error) {
            console.error("Harita için güzergah detayları çekilirken hata:", error);
            setSelectedRoute(null);
            setMapCenter([27.128, 38.419]); // İzmir varsayılan [lng, lat]
        }
    } else if (item.id && item.name) { // Seçilen öğe bir durak ise (stops API'sinden gelenler 'id' ve 'name' içerir)
        setSelectedStop(item); // selectedStop'u güncelle
        setSelectedRoute(null); // Seçili güzergahı temizle
        setMapCenter([item.lng, item.lat]); // Haritayı durağın konumuna odakla [lng, lat]
    }
  };

  // Panel açma/kapatma fonksiyonları (diğer panelleri otomatik kapatır)
  const togglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
    setIsRouteDetailsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
  };

  const toggleRouteDetailsPanel = () => {
    setIsRouteDetailsPanelOpen(!isRouteDetailsPanelOpen);
    setIsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
  };

  const toggleDepartureTimesPanel = () => {
    setIsDepartureTimesPanelOpen(!isDepartureTimesPanelOpen);
    setIsPanelOpen(false);
    setIsRouteDetailsPanelOpen(false);
  }; // <-- Buradaki hatayı düzeltmek için son '}' karakterini ekledik

  return (
    <div className="app-layout">
      <Sidebar
        onTogglePanel={togglePanel}
        onToggleRouteDetailsPanel={toggleRouteDetailsPanel}
        onToggleDepartureTimesPanel={toggleDepartureTimesPanel}
      />
      <div className="main-container">
        <Navbar />
        <div className="content-area">
          {/* Aktif Araçlar / Arama Paneli */}
          {isPanelOpen && (
            <div className="panel-wrapper open">
              <VehicleList
                items={filteredItems.length > 0 ? filteredItems : Object.values(routes)}
                onVehicleClick={handleVehicleClick}
                selectedVehicle={selectedItem}
                onClose={togglePanel}
                onSearch={handleSearch}
              />
            </div>
          )}

          {/* Güzergah Detayları Paneli */}
          {isRouteDetailsPanelOpen && (
            <div className="panel-wrapper open">
               <RouteDetailsPanel
                  onClose={toggleRouteDetailsPanel}
               />
            </div>
          )}

          {/* Kalkış Saatleri Paneli */}
          {isDepartureTimesPanelOpen && (
            <div className="panel-wrapper open">
              <DepartureTimesPanel
                onClose={toggleDepartureTimesPanel}
              />
            </div>
          )}

          {/* Harita */}
          <Map
            vehicles={vehicles}
            onVehicleClick={handleVehicleClick}
            selectedVehicle={selectedItem}
            stops={stops} // Durak arama sonuçları için Map'e gönderiliyor (haritada marker gösterimi için)
            routes={routes} // Genel hat bilgileri (Map'e prop olarak gider)
            selectedRoute={selectedRoute} // Haritada çizilecek olan güzergah
            selectedStop={selectedStop} // Haritada gösterilecek olan durak
            mapCenter={mapCenter}
          />
        </div>
      </div>
    </div>
  );
}

export default App;