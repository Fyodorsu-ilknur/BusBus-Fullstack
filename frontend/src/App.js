// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './store';
import {
  setAllRoutes, clearSelectedRoutes, toggleSelectedRoute, selectAllRoutes,
  toggleSelectedStop, clearSelectedStops, setAllStops, selectAllStops
} from './store/selectedItemsSlice';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import VehicleList from './components/VehicleList';
import Map from './components/Map';
import RouteDetailsPanel from './components/RouteDetailsPanel';
import DepartureTimesPanel from './components/DepartureTimesPanel';
import RouteProgressPanel from './components/RouteProgressPanel';
import StopSelector from './components/StopSelector';
import RouteNavigationPanel from './components/RouteNavigationPanel';
import './App.css';

function App() {
  const dispatch = useDispatch();
  const allRoutes = useSelector(state => state.selectedItems.allRoutes);
  const selectedRouteIds = useSelector(state => state.selectedItems.selectedRouteIds);
  const allStops = useSelector(state => state.selectedItems.allStops);
  const selectedStopIds = useSelector(state => state.selectedItems.selectedStopIds);

  const [vehicles, setVehicles] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null); // Tekli seçilen hat için kullanılır (animasyon)
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isRouteDetailsPanelOpen, setIsRouteDetailsPanelOpen] = useState(false);
  const [isDepartureTimesPanelOpen, setIsDepartureTimesPanelOpen] = useState(false);
  const [isStopSelectorOpen, setIsStopSelectorOpen] = useState(false);
  const [isRouteNavigationPanelOpen, setIsRouteNavigationPanelOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null); // Animasyonu gösterilecek olan route objesi
  const [selectedStop, setSelectedStop] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [routesForSelectedStop, setRoutesForSelectedStop] = useState([]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [currentAnimatedStop, setCurrentAnimatedStop] = useState(null);
  const [theme, setTheme] = useState('light');
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  const [isRouteProgressPanelActive, setIsRouteProgressPanelActive] = useState(false);
  const [navigationRoute, setNavigationRoute] = useState(null);
  const [currentDirection, setCurrentDirection] = useState('1');
  const [animatedDistanceToDestination, setAnimatedDistanceToDestination] = useState(null);
  const [animatedTimeToDestination, setAnimatedTimeToDestination] = useState(null);


  const handleToggleSelectedRoute = useCallback((routeId) => {
    dispatch(toggleSelectedRoute(routeId));
  }, [dispatch]);

  const handleClearSelectedRoutes = useCallback(() => {
    dispatch(clearSelectedRoutes());
  }, [dispatch]);

  const handleSelectAllRoutes = useCallback(() => {
    dispatch(selectAllRoutes());
  }, [dispatch]);

  const handleSelectAllStops = useCallback(() => {
    dispatch(selectAllStops());
  }, [dispatch]);

  const handleClearSelectedStops = useCallback(() => {
    dispatch(clearSelectedStops());
  }, [dispatch]);

  const handleToggleSelectedStop = useCallback((stopId) => {
    dispatch(toggleSelectedStop(stopId));
  }, [dispatch]);

  const handleToggleDirection = useCallback((direction) => {
    setCurrentDirection(direction);
  }, []);

  const handleVehicleClick = async (item) => {
    console.log("handleVehicleClick çağrıldı, item:", item);
    if (selectedItem?.id === item?.id) {
        setSelectedItem(null);
        setSelectedRoute(null); // Animasyon rotasını temizle
        setMapCenter(null); // Harita merkezini sıfırla
        setCurrentAnimatedStop(null);
        setIsRouteProgressPanelActive(false); // Durak takip panelini kapat
        setAnimatedDistanceToDestination(null); // Pop-up mesafeyi temizle
        setAnimatedTimeToDestination(null); // Pop-up süreyi temizle
        return; // İşlemi burada sonlandır.
    }

    setSelectedItem(item); // Yeni item seçildi
    console.log("selectedItem güncellendi:", item);

    if (item?.route_number) {
        try {
             const response1 = await fetch(`http://localhost:5000/api/route-details/${item.route_number}/1`);
          const data1 = response1.ok ? await response1.json() : { coordinates: [], stops: [] };

          const response2 = await fetch(`http://localhost:5000/api/route-details/${item.route_number}/2`);
          const data2 = response2.ok ? await response2.json() : { coordinates: [], stops: [] };

          const fullRouteData = {
              ...item,
              directions: {
                  '1': data1.coordinates || [],
                  '2': data2.coordinates || []
              },
              directionsStops: {
                  '1': data1.stops || [],
                  '2': data2.stops || []
              },
              stops: data1.stops || [],
              start_point: data1.start_point || item.start_point || '',
              end_point: data1.end_point || item.end_point || '',
              center: data1.coordinates && data1.coordinates.length > 0 ? [data1.coordinates[0][1], data1.coordinates[0][0]] : [27.128, 38.419]
          };
          
          setSelectedRoute(fullRouteData); // Animasyonu başlatacak rotayı set et
          setMapCenter(fullRouteData.center);
          
          console.log("Full route data with both directions:", fullRouteData);
          
      } catch (error) {
          console.error("Harita için güzergah detayları çekilirken hata:", error);
          setSelectedRoute(null);
          setMapCenter([27.128, 38.419]);
      }
  } else { // item?.route_number yoksa, her şeyi sıfırla
      setSelectedItem(null);
      setSelectedRoute(null);
      setMapCenter(null);
      setCurrentAnimatedStop(null);
      setIsRouteProgressPanelActive(false);
  }
};

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
        console.log("API'den gelen RAW data (App.js):", data);
        let processedRoutes = [];

        if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
            dispatch(setAllRoutes(data));
            processedRoutes = Object.values(data);
        } else if (Array.isArray(data)) {
             const routesObject = {};
             data.forEach(route => {
               if (route && route.id) {
                 routesObject[route.id] = { 
                   ...route, 
                   start_point: route.start_point || '', 
                   end_point: route.end_point || '' 
                 };
               }
             });
             dispatch(setAllRoutes(routesObject));
             processedRoutes = Object.values(routesObject);
        }
        else {
            console.error("API'den beklenen veri formatı (obje veya dizi) gelmedi. Gelen veri:", data);
            dispatch(setAllRoutes({}));
        }
        console.log("İşlenmiş rotalar dizisi (App.js):", processedRoutes);
        setFilteredItems(processedRoutes);
      })
      .catch(err => {
        console.error("Hat verisi alınırken hata oluştu (App.js):", err);
        dispatch(setAllRoutes({}));
        setFilteredItems([]);
      });
  }, [dispatch]);

  const handleSearch = useCallback(async (term) => {
    setSearchTerm(term);
    // Arama yapıldığında tüm seçili/animasyonlu durumları sıfırla
    setSelectedItem(null);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    setNavigationRoute(null);

    const lowerCaseTerm = term.toLowerCase().trim();

    if (lowerCaseTerm === '') {
      setFilteredItems(Object.values(allRoutes));
      return;
    }

    const currentFilteredItems = Object.values(allRoutes).filter(route =>
      (route.route_number && route.route_number.toLowerCase().includes(lowerCaseTerm)) ||
      (route.route_name && route.route_name.toLowerCase().includes(lowerCaseTerm)) ||
      (route.start_point && route.start_point.toLowerCase().includes(lowerCaseTerm)) ||
      (route.end_point && route.end_point.toLowerCase().includes(lowerCaseTerm))
    );

    setFilteredItems(currentFilteredItems);
  }, [allRoutes]);


  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedItem(null); // Paneli kapatırken selectedItem ve selectedRoute'u temizle
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
    setNavigationRoute(null);
    setAnimatedDistanceToDestination(null);
    setAnimatedTimeToDestination(null);
  }, [dispatch]);

  const closeRouteDetailsPanel = useCallback(() => {
    setIsRouteDetailsPanelOpen(false);
    setSelectedRoute(null); // Güzergah detay paneli kapanınca selectedRoute'u temizle
    setSelectedItem(null); // Animasyonu durdurmak için
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    setCurrentDirection('1');
    setNavigationRoute(null);
    setAnimatedDistanceToDestination(null);
    setAnimatedTimeToDestination(null);
  }, []);

  const closeDepartureTimesPanel = useCallback(() => {
    setIsDepartureTimesPanelOpen(false);
    setSelectedRoute(null);
    setSelectedItem(null); // Animasyonu durdurmak için
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
    setNavigationRoute(null);
    setAnimatedDistanceToDestination(null);
    setAnimatedTimeToDestination(null);
  }, [dispatch]);

  const closeStopSelectorPanel = useCallback(() => {
    setIsStopSelectorOpen(false);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setSelectedRoute(null);
    setSelectedItem(null); // Animasyonu durdurmak için
    setIsRouteProgressPanelActive(false);
    setCurrentDirection('1');
    dispatch(clearSelectedStops());
    setNavigationRoute(null);
    setAnimatedDistanceToDestination(null);
    setAnimatedTimeToDestination(null);
  }, [dispatch]);

  const closeRouteNavigationPanel = useCallback(() => {
    setIsRouteNavigationPanelOpen(false);
    setNavigationRoute(null);
    setSelectedRoute(null);
    setSelectedItem(null); // Animasyonu durdurmak için
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    setCurrentDirection('1');
    dispatch(clearSelectedRoutes());
    setAnimatedDistanceToDestination(null);
    setAnimatedTimeToDestination(null);
  }, [dispatch]);

  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev);
    setIsRouteDetailsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsStopSelectorOpen(false);
    setIsRouteNavigationPanelOpen(false);
    setIsSidebarExpanded(true);
    setSelectedItem(null); // Yeni panel açıldığında selectedItem'ı temizle
    setSelectedRoute(null); // Yeni panel açıldığında animasyonu durdur
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
    setNavigationRoute(null);
    setAnimatedDistanceToDestination(null);
    setAnimatedTimeToDestination(null);
  }, [dispatch]);

  const toggleRouteDetailsPanel = useCallback(() => {
    setIsRouteDetailsPanelOpen(prev => !prev);
    setIsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsStopSelectorOpen(false);
    setIsRouteNavigationPanelOpen(false);
    setIsSidebarExpanded(true);
    setSelectedItem(null); // Yeni panel açıldığında selectedItem'ı temizle
    setSelectedRoute(null); // Yeni panel açıldığında animasyonu durdur
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    setCurrentDirection('1');
    setNavigationRoute(null);
    setAnimatedDistanceToDestination(null);
    setAnimatedTimeToDestination(null);
  }, []);

  const toggleDepartureTimesPanel = useCallback(() => {
    setIsDepartureTimesPanelOpen(prev => !prev);
    setIsPanelOpen(false);
    setIsRouteDetailsPanelOpen(false);
    setIsStopSelectorOpen(false);
    setIsRouteNavigationPanelOpen(false);
    setIsSidebarExpanded(true);
    setSelectedItem(null); // Yeni panel açıldığında selectedItem'ı temizle
    setSelectedRoute(null); // Yeni panel açıldığında animasyonu durdur
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
    setNavigationRoute(null);
    setAnimatedDistanceToDestination(null);
    setAnimatedTimeToDestination(null);
  }, [dispatch]);

  const toggleStopSelectorPanel = useCallback(() => {
    setIsStopSelectorOpen(prev => !prev);
    setIsPanelOpen(false);
    setIsRouteDetailsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsRouteNavigationPanelOpen(false);
    setIsSidebarExpanded(true);
    setSelectedItem(null); // Yeni panel açıldığında selectedItem'ı temizle
    setSelectedRoute(null); // Yeni panel açıldığında animasyonu durdur
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
    setNavigationRoute(null);
    setAnimatedDistanceToDestination(null);
    setAnimatedTimeToDestination(null);
  }, [dispatch]);

  const toggleRouteNavigationPanel = useCallback(() => {
    setIsRouteNavigationPanelOpen(prev => !prev);
    setIsPanelOpen(false);
    setIsRouteDetailsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsStopSelectorOpen(false);
    setIsSidebarExpanded(true);
    setSelectedItem(null); // Yeni panel açıldığında selectedItem'ı temizle
    setSelectedRoute(null); // Yeni panel açıldığında animasyonu durdur
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    setNavigationRoute(null);
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
    setAnimatedDistanceToDestination(null);
    setAnimatedTimeToDestination(null);
  }, [dispatch]);

  const toggleSidebarExpansion = useCallback(() => {
    setIsSidebarExpanded(prev => {
      const newExpandedState = !prev;
      if (!newExpandedState) { // Sidebar kapanırken
        setIsPanelOpen(false);
        setIsRouteDetailsPanelOpen(false);
        setIsDepartureTimesPanelOpen(false);
        setIsStopSelectorOpen(false);
        setIsRouteNavigationPanelOpen(false);
        setSelectedItem(null); // Sidebar kapanırken selectedItem'ı temizle
        setSelectedRoute(null); // Sidebar kapanırken animasyonu durdur
        setSelectedStop(null);
        setMapCenter(null);
        setCurrentAnimatedStop(null);
        setIsRouteProgressPanelActive(false);
        dispatch(clearSelectedRoutes());
        setCurrentDirection('1');
        setNavigationRoute(null);
        setAnimatedDistanceToDestination(null);
        setAnimatedTimeToDestination(null);
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

  const handleAnimatedDataChange = useCallback((distance, time) => {
    setAnimatedDistanceToDestination(distance);
    setAnimatedTimeToDestination(time);
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

  const handleRouteFound = useCallback((routeData) => {
    setNavigationRoute(routeData);
    if (routeData && routeData.segments && routeData.segments.length > 0) {
      const firstSegment = routeData.segments[0];
      if (firstSegment.coordinates && firstSegment.coordinates.length > 0) {
        const firstCoord = firstSegment.coordinates[0];
        setMapCenter([firstCoord[1], firstCoord[0]]);
      }
    }
    setIsPanelOpen(false);
    setIsRouteDetailsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsStopSelectorOpen(false);
    setSelectedRoute(null); // Navigasyon başladığında animasyonu durdur
    setSelectedItem(null); // Navigasyon başladığında animasyonu durdur
    setSelectedStop(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
    setAnimatedDistanceToDestination(null);
    setAnimatedTimeToDestination(null);
  }, [dispatch]);


  return (
    <Provider store={store}>
      <div className={`app-layout ${isSidebarExpanded ? 'sidebar-expanded' : ''} ${theme}`}>
        <Navbar toggleSidebar={toggleSidebarExpansion} toggleTheme={toggleTheme} isMobileView={isMobileView} />

        <Sidebar
          onTogglePanel={togglePanel}
          onToggleRouteDetailsPanel={toggleRouteDetailsPanel}
          onToggleDepartureTimesPanel={toggleDepartureTimesPanel}
          onToggleStopSelectorPanel={toggleStopSelectorPanel}
          onToggleRouteNavigationPanel={toggleRouteNavigationPanel}
          isExpanded={isSidebarExpanded}
        />

        <div className="main-container">
          <div className="content-area">
            <div className="map-container">
              <Map
                vehicles={vehicles}
                onVehicleClick={handleVehicleClick}
                selectedVehicle={selectedItem}
                selectedRoute={selectedRoute}
                mapCenter={mapCenter}
                selectedStop={selectedStop}
                onCurrentStopChange={handleCurrentStopChange}
                onAnimatedDataChange={handleAnimatedDataChange}
                currentAnimatedStop={currentAnimatedStop}
                currentDirection={currentDirection}
                selectedRouteIds={selectedRouteIds}
                allRoutes={allRoutes}
                theme={theme}
                isPanelOpen={isPanelOpen}
                isRouteDetailsPanelOpen={isRouteDetailsPanelOpen}
                isDepartureTimesPanelOpen={isDepartureTimesPanelOpen}
                isRouteNavigationPanelOpen={isRouteNavigationPanelOpen}
                navigationRoute={navigationRoute}
                animatedDistanceToDestination={animatedDistanceToDestination}
                animatedTimeToDestination={animatedTimeToDestination}
              />
            </div>

            {isPanelOpen && (
              <div className={`panel-wrapper ${isPanelOpen ? 'open' : ''}`}>
                <VehicleList
                  items={filteredItems}
                  onClose={closePanel}
                  onItemClick={handleVehicleClick}
                  searchTerm={searchTerm}
                  onSearch={handleSearch}
                  selectedRouteIds={selectedRouteIds}
                  onToggleSelectedRoute={handleToggleSelectedRoute}
                  onClearSelectedRoutes={handleClearSelectedRoutes}
                  onSelectAllRoutes={handleSelectAllRoutes}
                  selectedRoute={selectedRoute}
                  currentDirection={currentDirection}
                  onToggleDirection={handleToggleDirection}
                  isRouteProgressPanelActive={isRouteProgressPanelActive}
                  onToggleRouteProgressPanelActive={toggleRouteProgressPanelActive}
                  theme={theme}
                />
              </div>
            )}

            {isRouteDetailsPanelOpen && (
              <div className={`panel-wrapper ${isRouteDetailsPanelOpen ? 'open' : ''}`}>
                <RouteDetailsPanel onClose={closeRouteDetailsPanel} allRoutes={allRoutes} onVehicleClick={handleVehicleClick} />
              </div>
            )}

            {isDepartureTimesPanelOpen && (
              <div className={`panel-wrapper ${isDepartureTimesPanelOpen ? 'open' : ''}`}>
                <DepartureTimesPanel onClose={closeDepartureTimesPanel} allRoutes={allRoutes} />
              </div>
            )}

            {isStopSelectorOpen && (
              <div className={`panel-wrapper ${isStopSelectorOpen ? 'open' : ''}`}>
                <StopSelector
                  onClose={closeStopSelectorPanel}
                  onStopSelectForMap={handleStopSelectForMap}
                  allStops={Object.values(allStops)}
                  selectedStopIds={selectedStopIds}
                  onToggleSelectedStop={handleToggleSelectedStop}
                  onClearSelectedStops={handleClearSelectedStops}
                  onSelectAllStops={handleSelectAllStops}
                />
              </div>
            )}

            {isRouteNavigationPanelOpen && (
              <div className={`panel-wrapper ${isRouteNavigationPanelOpen ? 'open' : ''}`}>
                <RouteNavigationPanel
                  onClose={closeRouteNavigationPanel}
                  allStops={Object.values(allStops)}
                  onRouteFound={handleRouteFound}
                />
              </div>
            )}
          </div>
        </div>

        {/* RouteProgressPanel sadece selectedRoute varsa ve aktifse gösterilir */}
        {selectedRoute && isRouteProgressPanelActive && (
          <RouteProgressPanel
            route={selectedRoute}
            currentAnimatedStop={currentAnimatedStop}
            onClose={() => setIsRouteProgressPanelActive(false)}
            currentDirection={currentDirection}
            onToggleDirection={handleToggleDirection}
            distanceToDestination={animatedDistanceToDestination}
            timeToDestination={animatedTimeToDestination}
          />
        )}
      </div>
    </Provider>
  );
}

export default App;