import React, { useState, useEffect, useCallback } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './store';
//  REDUX 
import {
  setAllRoutes,
  clearSelectedRoutes,
  toggleSelectedRoute,
  selectAllRoutes,
  toggleSelectedStop,   
  clearSelectedStops,
  setAllStops,
  selectAllStops
} from './store/selectedItemsSlice';

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
  const dispatch = useDispatch();
  const allRoutes = useSelector(state => state.selectedItems.allRoutes);
  const selectedRouteIds = useSelector(state => state.selectedItems.selectedRouteIds);
  const allStops = useSelector(state => state.selectedItems.allStops);
  const selectedStopIds = useSelector(state => state.selectedItems.selectedStopIds); 

const handleToggleSelectedRoute = useCallback((routeId) => {
  dispatch(toggleSelectedRoute(routeId));
}, [dispatch]);

const handleClearSelectedRoutes = useCallback(() => {
  dispatch(clearSelectedRoutes());
}, [dispatch]);

const handleSelectAllRoutes = useCallback(() => {
  dispatch(selectAllRoutes());
}, [dispatch]);

// DURAK İİN CALLBACK
const handleSelectAllStops = useCallback(() => {
  dispatch(selectAllStops());
}, [dispatch]);

const handleClearSelectedStops = useCallback(() => {
  dispatch(clearSelectedStops());
}, [dispatch]);

const handleToggleSelectedStop = useCallback((stopId) => {
  dispatch(toggleSelectedStop(stopId)); 
}, [dispatch]);


  const [vehicles, setVehicles] = useState([]);
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
  const [isRouteProgressPanelActive, setIsRouteProgressPanelActive] = useState(false);

  const [currentDirection, setCurrentDirection] = useState('1');

  const handleToggleDirection = useCallback(() => {
    setCurrentDirection(prevDir => prevDir === '1' ? '2' : '1');
  }, []);


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
        console.log("API'den gelen RAW data:", data);

        if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
            dispatch(setAllRoutes(data));
            setFilteredItems(Object.values(data));
        } else if (Array.isArray(data)) {
             const routesObject = {};
             data.forEach(route => {
               if (route && route.id) {
                 routesObject[route.id] = route;
               }
             });
             dispatch(setAllRoutes(routesObject));
             setFilteredItems(Object.values(routesObject));
        }
        else {
            console.error("API'den beklenen veri formatı (obje veya dizi) gelmedi. Gelen veri:", data);
            dispatch(setAllRoutes({}));
            setFilteredItems([]);
        }
      })
      .catch(err => {
        console.error("Hat verisi alınırken hata oluştu (App.js):", err);
        dispatch(setAllRoutes({}));
        setFilteredItems([]);
      });
  }, [dispatch]);

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

  const handleVehicleClick = async (item) => {
    setSelectedItem(item);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    setCurrentDirection('1');

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
                stops: data1.stops || [],
                start_point: data1.start_point || item.start_point,
                end_point: data1.end_point || item.end_point,
                center: data1.coordinates && data1.coordinates.length > 0 ? data1.coordinates[0] : [38.419, 27.128]
            };
            setSelectedRoute(fullRouteData);
            setMapCenter([fullRouteData.center[1], fullRouteData.center[0]]);
        } catch (error) {
            console.error("Harita için güzergah detayları çekilirken hata:", error);
            setSelectedRoute(null);
            setMapCenter([27.128, 38.419]);
        }
    } else {
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
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
  }, [dispatch]);

  const closeRouteDetailsPanel = useCallback(() => {
    setIsRouteDetailsPanelOpen(false);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
  }, [dispatch]);

  const closeDepartureTimesPanel = useCallback(() => {
    setIsDepartureTimesPanelOpen(false);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
  }, [dispatch]);

  const closeStopSelectorPanel = useCallback(() => {
    setIsStopSelectorOpen(false);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setSelectedRoute(null);
    setIsRouteProgressPanelActive(false);
    setCurrentDirection('1');
    dispatch(clearSelectedStops()); 
  }, [dispatch]);

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
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
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
    setCurrentDirection('1');
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
    setCurrentDirection('1');
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
    setCurrentDirection('1');
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
        setCurrentDirection('1');
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
            selectedRoute={selectedRoute}
            selectedStop={selectedStop}
            mapCenter={mapCenter}
            zoomLevel={selectedStop ? 14 : 12}
            onCurrentStopChange={handleCurrentStopChange}
            displayStartEndMarkers={isRouteDetailsPanelOpen || isDepartureTimesPanelOpen}
            startPointInfo={selectedRoute ? {name: selectedRoute.start_point, lat: selectedRoute.stops[0]?.lat, lng: selectedRoute.stops[0]?.lng} : null}
            endPointInfo={selectedRoute ? {name: selectedRoute.end_point, lat: selectedRoute.stops[selectedRoute.stops.length-1]?.lat, lng: selectedRoute.stops[selectedRoute.stops.length-1]?.lng} : null}
            currentAnimatedStop={currentAnimatedStop}
            selectedRouteIds={selectedRouteIds}
            allRoutes={allRoutes}
            currentDirection={currentDirection}
            theme={theme}
            key={theme}
          />

          {isPanelOpen && (
            <div className="panel-wrapper open">
              <VehicleList
                items={filteredItems.length > 0 ? filteredItems : Object.values(allRoutes)}
                onVehicleClick={handleVehicleClick}
                selectedVehicle={selectedItem}
                onClose={closePanel}
                onSearch={handleSearch}
                routesForSelectedStop={[]}
                isRouteProgressPanelActive={isRouteProgressPanelActive}
                onToggleRouteProgressPanelActive={toggleRouteProgressPanelActive}
                selectedRouteIds={selectedRouteIds}
                onToggleSelectedRoute={handleToggleSelectedRoute}
                onClearSelectedRoutes={handleClearSelectedRoutes}
                onSelectAllRoutes={handleSelectAllRoutes}
                selectedRoute={selectedRoute}
                currentDirection={currentDirection}
                onToggleDirection={handleToggleDirection}
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
                allStops={allStops}
                selectedStopIds={selectedStopIds}
                onToggleSelectedStop={handleToggleSelectedStop}
                onClearSelectedStops={handleClearSelectedStops}
                onSelectAllStops={handleSelectAllStops}
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