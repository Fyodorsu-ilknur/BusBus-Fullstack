// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import VehicleList from './components/VehicleList';
import Map from './components/Map';
import RouteDetailsPanel from './components/RouteDetailsPanel';
import DepartureTimesPanel from './components/DepartureTimesPanel';
import RouteProgressPanel from './components/RouteProgressPanel';
import './App.css';

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  // MEVCUT PANEL STATE İSİMLERİ KORUNDU
  const [isPanelOpen, setIsPanelOpen] = useState(false); // VehicleList (Aktif Araçlar / Arama) paneli
  const [isRouteDetailsPanelOpen, setIsRouteDetailsPanelOpen] = useState(false);
  const [isDepartureTimesPanelOpen, setIsDepartureTimesPanelOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [routesForSelectedStop, setRoutesForSelectedStop] = useState([]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [currentAnimatedStop, setCurrentAnimatedStop] = useState(null);
  const [theme, setTheme] = useState('light'); // Tema durumu ('light' veya 'dark')


  useEffect(() => {
    fetch('http://localhost:5000/api/routes')
      .then(res => res.json())
      .then(data => {
        setRoutes(data);
      })
      .catch(err => {
        console.error("Hat verisi alınırken hata oluştu (App.js):", err);
        setRoutes({});
      });

    setStops([]);
  }, []);

  const handleSearch = async (term) => {
    setSearchTerm(term);
    setSelectedItem(null);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);

    const lowerCaseTerm = term.toLowerCase().trim();

    if (lowerCaseTerm === '') {
      setFilteredItems(Object.values(routes));
      return;
    }

    let currentFilteredItems = [];
    const isNumericTerm = /^\d+$/.test(lowerCaseTerm);
    const isAlphabeticTerm = /^[a-zA-ZğüşöçıİĞÜŞÖÇ]+$/.test(lowerCaseTerm);

    let foundStops = [];
    let foundRoutes = [];

    if (isNumericTerm) {
        foundRoutes = Object.values(routes).filter(route =>
            (route.route_number && route.route_number.toLowerCase().includes(lowerCaseTerm))
        );

        try {
            const stopsResponse = await fetch(`http://localhost:5000/api/stops?search=${encodeURIComponent(lowerCaseTerm)}`);
            if (stopsResponse.ok) {
                foundStops = await stopsResponse.json();
            } else {
                console.error("Durak araması yapılırken hata (sayısal):", stopsResponse.status, await stopsResponse.text());
            }
        } catch (error) {
            console.error("Durak araması yapılırken genel hata (sayısal):", error);
        }
        currentFilteredItems = [...foundRoutes, ...foundStops.filter(stop =>
            !foundRoutes.some(route => stop.id === route.id)
        )];

    } else if (isAlphabeticTerm) {
        try {
            const stopsResponse = await fetch(`http://localhost:5000/api/stops?search=${encodeURIComponent(lowerCaseTerm)}`);
            if (stopsResponse.ok) {
                const allFetchedStops = await stopsResponse.json();
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

    } else {
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

        foundRoutes = Object.values(routes).filter(route =>
            (route.route_number && route.route_number.toLowerCase().includes(lowerCaseTerm)) ||
            (route.route_name && route.route_name.toLowerCase().includes(lowerCaseTerm))
        );

        currentFilteredItems = [...foundStops, ...foundRoutes.filter(r => !foundStops.some(s => s.id === r.id))];
    }

    setFilteredItems(currentFilteredItems);
  };

  const handleVehicleClick = async (item) => {
    setSelectedItem(item);
    setSelectedStop(null);
    setSelectedRoute(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);

    if (item.route_number) {
        try {
            const response = await fetch(`http://localhost:5000/api/route-details/${item.route_number}/1`);
            if (response.ok) {
                const data = await response.json();
                const fullRouteData = {
                    ...item,
                    directions: {
                        '1': data.coordinates,
                        '2': []
                    },
                    stops: data.stops,
                    start_point: data.start_point,
                    end_point: data.end_point,
                    center: data.coordinates && data.coordinates.length > 0 ? data.coordinates[0] : [38.419, 27.128]
                };
                setSelectedRoute(fullRouteData);
                setMapCenter([fullRouteData.center[1], fullRouteData.center[0]]);
            } else {
                console.error("Harita için güzergah detayları çekilemedi:", item.route_number, response.status, await response.text());
                setSelectedRoute(null);
                setMapCenter([27.128, 38.419]);
            }
        } catch (error) {
            console.error("Harita için güzergah detayları çekilirken hata:", error);
            setSelectedRoute(null);
            setMapCenter([27.128, 38.419]);
        }
    } else if (item.id && item.name) {
        setSelectedStop(item);
        setSelectedRoute(null);
        setMapCenter([item.lng, item.lat]);

        try {
            const response = await fetch(`http://localhost:5000/api/stop-routes/${item.id}`);
            if (response.ok) {
                const data = await response.json();
                setRoutesForSelectedStop(data);
            } else {
                console.error("Duraktan geçen hatlar çekilemedi:", item.id, response.status, await response.text());
                setRoutesForSelectedStop([]);
            }
        } catch (error) {
            console.error("Duraktan geçen hatlar çekilirken hata:", error);
            setRoutesForSelectedStop([]);
        }
    }
  };

  // HER PANEL İÇİN AYRI KAPATMA FONKSİYONLARI (X BUTONU İÇİN) - önceki güncellememde eklenmişti ve çalışıyor
  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const closeRouteDetailsPanel = useCallback(() => {
    setIsRouteDetailsPanelOpen(false);
  }, []);

  const closeDepartureTimesPanel = useCallback(() => {
    setIsDepartureTimesPanelOpen(false);
  }, []);

  // SİDEBAR İKONLARINA TIKLANDIĞINDA PANELLERİ TOGGLE (AÇ/KAPAT) EDEN VE DİĞERLERİNİ KAPATAN FONKSİYONLAR - önceki güncellememde eklenmişti ve çalışıyor
  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev); // Kendi durumunu toggle et
    setIsRouteDetailsPanelOpen(false); // Diğer panelleri kapat
    setIsDepartureTimesPanelOpen(false); // Diğer panelleri kapat
    setIsSidebarExpanded(true); // İkon tıklandığında sidebar'ın açık olduğundan emin ol
    setSelectedRoute(null);
    setCurrentAnimatedStop(null);
  }, []);

  const toggleRouteDetailsPanel = useCallback(() => {
    setIsRouteDetailsPanelOpen(prev => !prev); // Kendi durumunu toggle et
    setIsPanelOpen(false); // Diğer panelleri kapat
    setIsDepartureTimesPanelOpen(false); // Diğer panelleri kapat
    setIsSidebarExpanded(true); // İkon tıklandığında sidebar'ın açık olduğundan emin ol
    setSelectedRoute(null);
    setCurrentAnimatedStop(null);
  }, []);

  const toggleDepartureTimesPanel = useCallback(() => {
    setIsDepartureTimesPanelOpen(prev => !prev); // Kendi durumunu toggle et
    setIsPanelOpen(false); // Diğer panelleri kapat
    setIsRouteDetailsPanelOpen(false); // Diğer panelleri kapat
    setIsSidebarExpanded(true); // İkon tıklandığında sidebar'ın açık olduğundan emin ol
    setSelectedRoute(null);
    setCurrentAnimatedStop(null);
  }, []);

  // *** İĞRENÇ BEYAZ FAZLALIK PANELİN ÇÖZÜMÜ BURADA! ***
  // Hamburger menü sidebar'ı açıp kapatırken, TÜM panelleri koşulsuz olarak kapatır.
  const toggleSidebarExpansion = useCallback(() => {
    setIsSidebarExpanded(prev => {
      const newExpandedState = !prev; // Sidebar'ın yeni durumunu hesapla
      // BU SATIRLAR, HAMBURGER MENÜYE TIKLANDIĞINDA FAZLADAN PANELİ KAPATIR:
      setIsPanelOpen(false);
      setIsRouteDetailsPanelOpen(false);
      setIsDepartureTimesPanelOpen(false);
      // Diğer durumları da sıfırlıyoruz ki animasyonlar veya seçili öğeler etkilenmesin
      setSelectedRoute(null);
      setCurrentAnimatedStop(null);
      return newExpandedState; // Sidebar'ın durumunu güncelle
    });
  }, []);

  // Tema değiştirme fonksiyonu
  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);


  const handleCurrentStopChange = useCallback((stop) => {
    setCurrentAnimatedStop(stop);
  }, []);

  return (
    // app-layout'a tema sınıfı eklendi
    <div className={`app-layout ${isSidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'} ${theme}-theme`}>
      {/* Navbar'a tema değiştirme prop'u verildi */}
      <Navbar onToggleSidebarExpansion={toggleSidebarExpansion} onToggleTheme={toggleTheme} currentTheme={theme} />

      <Sidebar
        onTogglePanel={togglePanel}
        onToggleRouteDetailsPanel={toggleRouteDetailsPanel}
        onToggleDepartureTimesPanel={toggleDepartureTimesPanel}
        isExpanded={isSidebarExpanded}
      />

      <div className={`main-container ${isSidebarExpanded ? 'sidebar-expanded-padding' : 'sidebar-collapsed-padding'}`}>
        <div className="content-area">
          {/* Panel görünürlük durumlarını kendi state'leri ile kontrol et */}
          {isPanelOpen && (
            <div className="panel-wrapper open">
              <VehicleList
                items={filteredItems.length > 0 ? filteredItems : Object.values(routes)}
                onVehicleClick={handleVehicleClick}
                selectedVehicle={selectedItem}
                onClose={closePanel} // Doğru kapatma fonksiyonu
                onSearch={handleSearch}
                routesForSelectedStop={routesForSelectedStop}
              />
            </div>
          )}

          {isRouteDetailsPanelOpen && (
            <div className="panel-wrapper open">
               <RouteDetailsPanel
                  onClose={closeRouteDetailsPanel} // Doğru kapatma fonksiyonu
               />
            </div>
          )}

          {isDepartureTimesPanelOpen && (
            <div className="panel-wrapper open">
              <DepartureTimesPanel
                onClose={closeDepartureTimesPanel} // Doğru kapatma fonksiyonu
              />
            </div>
          )}

          {/* RouteProgressPanel'i sadece 'Aktif Araçlar' paneli açık VE bir hat seçili olduğunda göster */}
          {isPanelOpen && selectedRoute && (
            <RouteProgressPanel
              selectedRoute={selectedRoute}
              currentStop={currentAnimatedStop}
            />
          )}

          <Map
            vehicles={vehicles}
            onVehicleClick={handleVehicleClick}
            selectedVehicle={selectedItem}
            stops={stops}
            routes={routes}
            selectedRoute={isPanelOpen ? selectedRoute : null}
            selectedStop={selectedStop}
            mapCenter={mapCenter}
            onCurrentStopChange={handleCurrentStopChange}
            displayStartEndMarkers={isRouteDetailsPanelOpen || isDepartureTimesPanelOpen}
            startPointInfo={selectedRoute ? {name: selectedRoute.start_point, lat: selectedRoute.stops[0]?.lat, lng: selectedRoute.stops[0]?.lng} : null}
            endPointInfo={selectedRoute ? {name: selectedRoute.end_point, lat: selectedRoute.stops[selectedRoute.stops.length-1]?.lat, lng: selectedRoute.stops[selectedRoute.stops.length-1]?.lng} : null}
          />
        </div>
      </div>
    </div>
  );
}

export default App;