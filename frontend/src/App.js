// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux'; // useDispatch ve useSelector eklendi
import store from './store';
// setAllRoutes action'ını import ediyoruz
import { setAllRoutes, clearSelectedRoutes, toggleSelectedRoute } from './store/selectedItemsSlice'; 

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import VehicleList from './components/VehicleList';
import Map from './components/Map';
import RouteDetailsPanel from './components/RouteDetailsPanel';
import DepartureTimesPanel from './components/DepartureTimesPanel';
import RouteProgressPanel from './components/RouteProgressPanel';
import StopSelector from './components/StopSelector';
import './App.css';

function App() {
  const dispatch = useDispatch(); // useDispatch hook'unu App bileşeninde kullanıyoruz
  const allRoutes = useSelector(state => state.selectedItems.allRoutes); // Redux'tan allRoutes'u alıyoruz 
  const selectedRouteIds = useSelector(state => state.selectedItems.selectedRouteIds);
  const allStops = useSelector(state => state.selectedItems.allStops); // allStops'u da Redux'tan alıyoruz

const handleToggleSelectedRoute = useCallback((routeId) => {
  dispatch(toggleSelectedRoute(routeId));
}, [dispatch]);

const handleClearSelectedRoutes = useCallback(() => {
  dispatch(clearSelectedRoutes());
}, [dispatch]);

  const [vehicles, setVehicles] = useState([]);
  // stops state'i kaldırıldı, artık Redux'taki allStops kullanılıyor 
  // const [routes, setRoutes] = useState({}); // <-- BU STATE KALDIRILDI! Artık Redux'tan allRoutes kullanıyoruz.

  const [selectedItem, setSelectedItem] = useState(null); // Tekli seçilen otobüs hattı (animasyon için)
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isRouteDetailsPanelOpen, setIsRouteDetailsPanelOpen] = useState(false);
  const [isDepartureTimesPanelOpen, setIsDepartureTimesPanelOpen] = useState(false);
  const [isStopSelectorOpen, setIsStopSelectorOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null); // Bu hala tekli güzergah animasyonu için kullanılacak
  const [selectedStop, setSelectedStop] = useState(null); 
  const [mapCenter, setMapCenter] = useState(null);
  const [routesForSelectedStop, setRoutesForSelectedStop] = useState([]); // Bu da StopSelector'da kalacak
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [currentAnimatedStop, setCurrentAnimatedStop] = useState(null);
  const [theme, setTheme] = useState('light');
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  const [isRouteProgressPanelActive, setIsRouteProgressPanelActive] = useState(false); 

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    // Hat verilerini API'den çek ve Redux'a kaydet
    fetch('http://localhost:5000/api/routes')
      .then(res => res.json())
      .then(data => {
        // setRoutes(data); // <-- KALDIRILDI
        dispatch(setAllRoutes(data)); // Redux'a kaydet
        setFilteredItems(Object.values(data));
      })
      .catch(err => {
        console.error("Hat verisi alınırken hata oluştu (App.js):", err);
        // setRoutes({}); // <-- KALDIRILDI
        dispatch(setAllRoutes({})); // Redux'ı boşalt
        setFilteredItems([]);
      });
  }, [dispatch]); // dispatch bağımlılığı eklendi

  // SADECE HATLAR İÇİN ARAMA YAPACAK ŞEKİLDE GÜNCELLENDİ
  const handleSearch = useCallback(async (term) => {
    setSearchTerm(term);
    setSelectedItem(null);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);

    const lowerCaseTerm = term.toLowerCase().trim();

    if (lowerCaseTerm === '') {
      setFilteredItems(Object.values(allRoutes)); // <-- allRoutes Redux'tan geliyor
      return;
    }

    const currentFilteredItems = Object.values(allRoutes).filter(route => // <-- allRoutes Redux'tan geliyor
      (route.route_number && route.route_number.toLowerCase().includes(lowerCaseTerm)) ||
      (route.route_name && route.route_name.toLowerCase().includes(lowerCaseTerm))
    );

    setFilteredItems(currentFilteredItems);
  }, [allRoutes]); // allRoutes bağımlılığı eklendi

  const handleVehicleClick = async (item) => {
    setSelectedItem(item); // Bu, VehicleList'teki tekli seçimi ve detay panelini kontrol eder
    setSelectedRoute(null); // Önceki animasyonu temizle
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false); // Yeni bir araç seçildiğinde güzergah takip panelini kapat

    if (item?.route_number) { // item null olabilir, kontrol ekledik
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
                setSelectedRoute(fullRouteData); // Tekli güzergah animasyonu için rota bilgisini set et
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
    } else { // Eğer item null ise veya route_number yoksa, her şeyi sıfırla
        setSelectedItem(null);
        setSelectedRoute(null);
        setMapCenter(null);
        setCurrentAnimatedStop(null);
        setIsRouteProgressPanelActive(false);
    }
  };

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedItem(null);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes()); // Panel kapatıldığında seçili rotaları temizle
  }, [dispatch]);

  const closeRouteDetailsPanel = useCallback(() => {
    setIsRouteDetailsPanelOpen(false);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
  }, [dispatch]);

  const closeDepartureTimesPanel = useCallback(() => {
    setIsDepartureTimesPanelOpen(false);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
  }, [dispatch]);

  const closeStopSelectorPanel = useCallback(() => {
    setIsStopSelectorOpen(false);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setSelectedRoute(null);
    setIsRouteProgressPanelActive(false);
    // Burada selectedRouteIds'ı temizlemiyoruz, kullanıcının seçimi kalabilir.
    // İhtiyaç olursa burada da dispatch(clearSelectedStops()); çağrılabilir.
  }, []);

  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev);
    setIsRouteDetailsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsStopSelectorOpen(false);
    setIsSidebarExpanded(true);
    setSelectedItem(null);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes()); // Panel açıldığında seçili rotaları temizle
  }, [dispatch]);

  const toggleRouteDetailsPanel = useCallback(() => {
    setIsRouteDetailsPanelOpen(prev => !prev);
    setIsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsStopSelectorOpen(false);
    setIsSidebarExpanded(true);
    setSelectedItem(null);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
  }, [dispatch]);

  const toggleDepartureTimesPanel = useCallback(() => {
    setIsDepartureTimesPanelOpen(prev => !prev);
    setIsPanelOpen(false);
    setIsRouteDetailsPanelOpen(false);
    setIsStopSelectorOpen(false);
    setIsSidebarExpanded(true);
    setSelectedItem(null);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
  }, [dispatch]);

  const toggleStopSelectorPanel = useCallback(() => {
    setIsStopSelectorOpen(prev => !prev);
    setIsPanelOpen(false);
    setIsRouteDetailsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsSidebarExpanded(true);
    setSelectedItem(null);
    setSelectedRoute(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
  }, [dispatch]);

  const toggleSidebarExpansion = useCallback(() => {
    setIsSidebarExpanded(prev => {
      const newExpandedState = !prev;
      if (!newExpandedState) {
        setIsPanelOpen(false);
        setIsRouteDetailsPanelOpen(false);
        setIsDepartureTimesPanelOpen(false);
        setIsStopSelectorOpen(false);
        setSelectedItem(null);
        setSelectedRoute(null);
        setSelectedStop(null);
        setMapCenter(null);
        setCurrentAnimatedStop(null);
        setIsRouteProgressPanelActive(false);
        dispatch(clearSelectedRoutes());
      }
      return newExpandedState;
    });
  }, [dispatch]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  const handleCurrentStopChange = useCallback((stop) => {
    setCurrentAnimatedStop(stop);
  }, []);

  const handleStopSelectForMap = useCallback((stop) => {
    setSelectedStop(stop);
    if (stop && typeof stop.lng === 'number' && typeof stop.lat === 'number') {
      setMapCenter([stop.lng, stop.lat]);
    } else {
      setMapCenter(null);
    }
  }, []);

  const toggleRouteProgressPanelActive = useCallback(() => {
    setIsRouteProgressPanelActive(prev => !prev);
  }, []);

  return (
    <div className={`app-layout ${isSidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'} ${theme}-theme ${isMobileView ? 'mobile-view' : 'desktop-view'}`}>
      <Navbar onToggleSidebarExpansion={toggleSidebarExpansion} onToggleTheme={toggleTheme} currentTheme={theme} />

      <Sidebar
        onTogglePanel={togglePanel}
        onToggleRouteDetailsPanel={toggleRouteDetailsPanel}
        onToggleDepartureTimesPanel={toggleDepartureTimesPanel}
        onToggleStopSelectorPanel={toggleStopSelectorPanel}
        isExpanded={isSidebarExpanded}
      />

      <div className="main-container">
        <div className="content-area">
          <Map
            vehicles={vehicles}
            onVehicleClick={handleVehicleClick}
            selectedVehicle={selectedItem}
            
            selectedRoute={selectedRoute} // Tekli güzergah animasyonu için
            selectedStop={selectedStop}
            mapCenter={mapCenter}
            zoomLevel={selectedStop ? 14 : 12}
            onCurrentStopChange={handleCurrentStopChange}
            displayStartEndMarkers={isRouteDetailsPanelOpen || isDepartureTimesPanelOpen}
            startPointInfo={selectedRoute ? {name: selectedRoute.start_point, lat: selectedRoute.stops[0]?.lat, lng: selectedRoute.stops[0]?.lng} : null}
            endPointInfo={selectedRoute ? {name: selectedRoute.end_point, lat: selectedRoute.stops[selectedRoute.stops.length-1]?.lat, lng: selectedRoute.stops[selectedRoute.stops.length-1]?.lng} : null}
            currentAnimatedStop={currentAnimatedStop}
            // YENİ PROP'lar: Çoklu güzergah çizimi için
            selectedRouteIds={selectedRouteIds} 
            allRoutes={allRoutes} // Map'e tüm rotaları tekrar geçiyoruz
          />

          {isPanelOpen && (
            <div className="panel-wrapper open">
              <VehicleList
                items={filteredItems.length > 0 ? filteredItems : Object.values(allRoutes)} // <-- allRoutes Redux'tan geliyor
                onVehicleClick={handleVehicleClick}
                selectedVehicle={selectedItem}
                onClose={closePanel}
                onSearch={handleSearch}
                routesForSelectedStop={[]}
                isRouteProgressPanelActive={isRouteProgressPanelActive} 
                onToggleRouteProgressPanelActive={toggleRouteProgressPanelActive}
                // YENİ PROP'lar: Çoklu rota seçimi için
                selectedRouteIds={selectedRouteIds} 
                onToggleSelectedRoute={handleToggleSelectedRoute} 
                onClearSelectedRoutes={handleClearSelectedRoutes} 
              />
            </div>
          )}

          {isRouteDetailsPanelOpen && (
            <div className="panel-wrapper open">
               <RouteDetailsPanel onClose={closeRouteDetailsPanel} />
            </div>
          )}

          {isDepartureTimesPanelOpen && (
            <div className="panel-wrapper open">
              <DepartureTimesPanel onClose={closeDepartureTimesPanel} />
            </div>
          )}

          {isStopSelectorOpen && (
            <div className="panel-wrapper open">
              <StopSelector 
                onClose={closeStopSelectorPanel} 
                onStopSelectForMap={handleStopSelectForMap}
              />
            </div>
          )}

          {isPanelOpen && selectedRoute && isRouteProgressPanelActive && ( 
            <RouteProgressPanel
              selectedRoute={selectedRoute}
              currentStop={currentAnimatedStop}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;