// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { Provider } from 'react-redux';
import store from './store';
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
  const [vehicles, setVehicles] = useState([]);
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isRouteDetailsPanelOpen, setIsRouteDetailsPanelOpen] = useState(false);
  const [isDepartureTimesPanelOpen, setIsDepartureTimesPanelOpen] = useState(false);
  const [isStopSelectorOpen, setIsStopSelectorOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [routesForSelectedStop, setRoutesForSelectedStop] = useState([]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [currentAnimatedStop, setCurrentAnimatedStop] = useState(null);
  const [theme, setTheme] = useState('light');
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);

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
    fetch('http://localhost:5000/api/routes')
      .then(res => res.json())
      .then(data => {
        setRoutes(data);
        setFilteredItems(Object.values(data));
      })
      .catch(err => {
        console.error("Hat verisi alınırken hata oluştu (App.js):", err);
        setRoutes({});
        setFilteredItems([]);
      });

    setStops([]);
  }, []);

  const handleSearch = useCallback(async (term) => {
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

    const currentFilteredItems = Object.values(routes).filter(route =>
      (route.route_number && route.route_number.toLowerCase().includes(lowerCaseTerm)) ||
      (route.route_name && route.route_name.toLowerCase().includes(lowerCaseTerm))
    );

    setFilteredItems(currentFilteredItems);
  }, [routes]);

  const handleVehicleClick = async (item) => {
    setSelectedItem(item);
    setSelectedRoute(null);
    setSelectedStop(null); // Durağı temizle
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
    }
  };

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedItem(null);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
  }, []);

  const closeRouteDetailsPanel = useCallback(() => {
    setIsRouteDetailsPanelOpen(false);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
  }, []);

  const closeDepartureTimesPanel = useCallback(() => {
    setIsDepartureTimesPanelOpen(false);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
  }, []);

  const closeStopSelectorPanel = useCallback(() => {
    setIsStopSelectorOpen(false);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setSelectedRoute(null);
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
  }, []);

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
  }, []);

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
  }, []);

  const toggleStopSelectorPanel = useCallback(() => {
    setIsStopSelectorOpen(prev => !prev);
    setIsPanelOpen(false);
    setIsRouteDetailsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsSidebarExpanded(true);
    setSelectedItem(null);
    setSelectedRoute(null);
    setMapCenter(null); // MapCenter'ı burada temizle
    setCurrentAnimatedStop(null);
  }, []);

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
      }
      return newExpandedState;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  const handleCurrentStopChange = useCallback((stop) => {
    setCurrentAnimatedStop(stop);
  }, []);

  // DÜZELTİLDİ: handleStopSelectForMap fonksiyonu
  const handleStopSelectForMap = useCallback((stop) => {
    setSelectedStop(stop); // Seçilen durağı state'e kaydet
    // Eğer 'stop' null değilse VE koordinatları sayı ise mapCenter'ı ayarla
    if (stop && typeof stop.lng === 'number' && typeof stop.lat === 'number') {
      setMapCenter([stop.lng, stop.lat]);
    } else {
      // Eğer 'stop' null ise veya koordinatlar geçerli değilse mapCenter'ı null yap
      setMapCenter(null);
    }
  }, []);


  return (
    <Provider store={store}>
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
              stops={stops}
              routes={routes}
              selectedRoute={selectedRoute}
              selectedStop={selectedStop}
              mapCenter={mapCenter}
              zoomLevel={selectedStop ? 14 : 12}
              onCurrentStopChange={handleCurrentStopChange}
              displayStartEndMarkers={isRouteDetailsPanelOpen || isDepartureTimesPanelOpen}
              startPointInfo={selectedRoute ? {name: selectedRoute.start_point, lat: selectedRoute.stops[0]?.lat, lng: selectedRoute.stops[0]?.lng} : null}
              endPointInfo={selectedRoute ? {name: selectedRoute.end_point, lat: selectedRoute.stops[selectedRoute.stops.length-1]?.lat, lng: selectedRoute.stops[selectedRoute.stops.length-1]?.lng} : null}
            />

            {isPanelOpen && (
              <div className="panel-wrapper open">
                <VehicleList
                  items={filteredItems.length > 0 ? filteredItems : Object.values(routes)}
                  onVehicleClick={handleVehicleClick}
                  selectedVehicle={selectedItem}
                  onClose={closePanel}
                  onSearch={handleSearch}
                  routesForSelectedStop={[]}
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

            {isPanelOpen && selectedRoute && (
              <RouteProgressPanel
                selectedRoute={selectedRoute}
                currentStop={currentAnimatedStop}
              />
            )}
          </div>
        </div>
      </div>
    </Provider>
  );
}

export default App;