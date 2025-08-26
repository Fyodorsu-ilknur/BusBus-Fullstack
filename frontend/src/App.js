// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './store';
import FleetTrackingPanel from './components/FleetTrackingPanel';
import FleetVehicleDetailsPanel from './components/FleetVehicleDetailsPanel';
// import SettingsPanel from './components/SettingsPanel'; // ✅ KALDIRILDI: SettingsPanel import'u

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

  // Redux state selectors
  const allRoutes = useSelector(state => state.selectedItems.allRoutes);
  const selectedRouteIds = useSelector(state => state.selectedItems.selectedRouteIds);
  const allStops = useSelector(state => state.selectedItems.allStops);
  const selectedStopIds = useSelector(state => state.selectedItems.selectedStopIds);

  // Lokal state'ler
  const [vehicles, setVehicles] = useState([]);
  const [selectedFleetVehicle, setSelectedFleetVehicle] = useState(null);
  const [selectedFleetVehicles, setSelectedFleetVehicles] = useState([]);
  
  // Pop-up entegrasyonu için state'ler
  // Bu state artık FleetVehicleDetailsPanel'den güncellenecek, App.js sadece Map'e iletecek
  const [selectedPopupInfo, setSelectedPopupInfo] = useState([
    { key: 'speed', label: 'Araç Hızı', value: '41 km/h', icon: '⚡' },
    { key: 'plate', label: 'Plaka', value: '35 NGK 802', icon: '🏷️' },
    { key: 'routeCode', label: 'Hat No', value: 'T1', icon: '🔢' },
    { key: 'status', label: 'Durum', value: 'Aktif/Çalışıyor', icon: '🔵' },
    { key: 'lastGpsTime', label: 'Son GPS', value: '14:26:53', icon: '⏰' },
    { key: 'odometer', label: 'KM', value: '522.005,32 km', icon: '📊' }
  ]);
  const [selectedVehicleForPanel, setSelectedVehicleForPanel] = useState(null); // Şu an kullanılmıyor, ileride kaldırılabilir
  const [isPanelOpenForVehicleDetails, setIsPanelOpenForVehicleDetails] = useState(false); // Şu an kullanılmıyor, ileride kaldırılabilir

  const [selectedItem, setSelectedItem] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isRouteDetailsPanelOpen, setIsRouteDetailsPanelOpen] = useState(false);
  const [isDepartureTimesPanelOpen, setIsDepartureTimesPanelOpen] = useState(false);
  const [isStopSelectorOpen, setIsStopSelectorOpen] = useState(false);
  const [isRouteNavigationPanelOpen, setIsRouteNavigationPanelOpen] = useState(false);
  const [isFleetTrackingPanelOpen, setIsFleetTrackingPanelOpen] = useState(false);
  // const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false); // ✅ KALDIRILDI: Ayarlar paneli state'i
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
  const [navigationRoute, setNavigationRoute] = useState(null);
  const [currentDirection, setCurrentDirection] = useState('1');
  const [animatedDistanceToDestination, setAnimatedDistanceToDestination] = useState(null);
  const [animatedTimeToDestination, setAnimatedTimeToDestination] = useState(null);

  const handlePopupInfoChange = useCallback((newSelectedInfo) => {
    console.log('Pop-up bilgileri güncelleniyor:', newSelectedInfo);
    setSelectedPopupInfo(newSelectedInfo);
  }, []);

  // handleOpenPanel artık Map tarafından çağrılmayacak, FleetTrackingPanel tarafından yönetilecek
  // const handleOpenPanel = useCallback((vehicle) => {
  //   console.log('Panel açılıyor:', vehicle);
  //   setSelectedVehicleForPanel(vehicle);
  //   setIsPanelOpenForVehicleDetails(true);
  // }, []);

  // -------- Genel Kullanım Fonksiyonları --------
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

  // -------- Simülasyon Verisi Üretimi İçin Yardımcı Fonksiyonlar --------
  const getRandomLocation = useCallback(() => {
    const izmirCenterLat = 38.419;
    const izmirCenterLng = 27.128;
    const range = 0.05; // +/- 0.05 derece enlem/boylam

    const lat = izmirCenterLat + (Math.random() * 2 - 1) * range;
    const lng = izmirCenterLng + (Math.random() * 2 - 1) * range;
    return [lng, lat];
  }, []);

  const getRandomSpeed = useCallback(() => Math.floor(Math.random() * 80) + 10, []);

  const generateRandomPlate = useCallback(() => {
    const allowedChars = 'ABCEFGHIKLMNPRSTUYZ'; 
    const nums = '0123456789';
    let plate = '35 ';
    
    for (let i = 0; i < 3; i++) {
        plate += allowedChars.charAt(Math.floor(Math.random() * allowedChars.length));
    }
    plate += ' ';
    for (let i = 0; i < 3; i++) {
        plate += nums.charAt(Math.floor(Math.random() * nums.length));
    }
    return plate;
  }, []);

  const createInitialSimulatedVehicle = useCallback((vehicleId, routeData) => {
      const randomLocation = getRandomLocation();
      const randomSpeed = getRandomSpeed();
      const randomOdometer = Math.floor(Math.random() * 100000) + 10000;
      const now = new Date();
      
      const statusesWeighted = [
          'Aktif/Çalışıyor', 'Aktif/Çalışıyor', 'Aktif/Çalışıyor',
          'Aktif/Çalışıyor', 'Aktif/Çalışıyor', 'Aktif/Çalışıyor',
          'Aktif/Çalışıyor',
          'Servis Dışı',
          'Bakımda'
      ];
      const randomStatus = statusesWeighted[Math.floor(Math.random() * statusesWeighted.length)];

      return {
          id: `vehicle-${vehicleId}`,
          vehicleId: vehicleId,
          plate: generateRandomPlate(),
          speed: randomSpeed,
          location: {
              lat: randomLocation[1],
              lng: randomLocation[0]
          },
          status: randomStatus,
          lastGpsTime: now.toLocaleTimeString('tr-TR'),
          odometer: randomOdometer,
          activeCouple: Math.random() > 0.5 ? 'Evet' : 'Hayır',
          samId: `0${Math.floor(Math.random() * 9000000) + 1000000}`,
          engineStatus: Math.random() > 0.1 ? 'Çalışıyor' : 'Durduruldu',
          batteryVolt: `${Math.floor(Math.random() * 4) + 24} V`,
          fuelRate: `${(Math.random() * 0.5 + 0.1).toFixed(2)} L/Saat`,
          driverInfo: {
              personnelNo: Math.floor(Math.random() * 100000),
              name: Math.random() > 0.5 ? 'CAN AHMET' : 'VEYSEL EKİN'
          },
          tripNo: Math.floor(Math.random() * 1000000),
          companyAd: routeData?.company || 'Eshot (Otobüs)',
          routeCode: routeData?.route_number || vehicleId.toString(),
          routeName: routeData?.route_name || `Rota ${vehicleId}`,
          pathCode: `PATH-${routeData?.route_number || vehicleId}`,
          startDateTime: now.toLocaleDateString('tr-TR') + ' ' + now.toLocaleTimeString('tr-TR'),
          endDateTime: new Date(now.getTime() + 3600 * 1000).toLocaleDateString('tr-TR') + ' ' + new Date(now.getTime() + 3600 * 1000).toLocaleTimeString('tr-TR'),
          routeData: routeData
      };
  }, [getRandomLocation, getRandomSpeed, generateRandomPlate]);

  // -------- Panel Yönetimi ve Tıklama Fonksiyonları --------
  const handleVehicleClick = async (item) => {
    console.log("handleVehicleClick çağrıldı, item:", item);
    if (selectedItem?.id === item?.id || !item) {
        setSelectedItem(null);
        setSelectedRoute(null);
        setMapCenter(null);
        setCurrentAnimatedStop(null);
        setIsRouteProgressPanelActive(false);
        setAnimatedDistanceToDestination(null);
        setAnimatedTimeToDestination(null);
        return;
    }

    setSelectedItem(item);
    console.log("selectedItem güncellendi:", item);

    if (item?.route_number) {
        try {
          let fullRouteData = item;
          if (!item.directions || !item.directions['1'] || !item.directions['2']) {
             console.log("Item üzerinde directions bulunamadı, API'den çekiliyor:", item.route_number);
             const response1 = await fetch(`http://localhost:5000/api/route-details/${item.route_number}/1`);
             const data1 = response1.ok ? await response1.json() : { coordinates: [], stops: [] };

             const response2 = await fetch(`http://localhost:5000/api/route-details/${item.route_number}/2`);
             const data2 = response2.ok ? await response2.json() : { coordinates: [], stops: [] };

             fullRouteData = {
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
          }

          setSelectedRoute(fullRouteData);
          setMapCenter(fullRouteData.center || [27.128, 38.419]);

          console.log("Full route data with both directions (after fetch if needed):", fullRouteData);

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

  const handleFleetVehicleSelect = useCallback((vehicle) => {
    console.log("Filo Takip Panelinde araç seçildi/seçim kaldırıldı:", vehicle);

    // selectedFleetVehicles state'ini güncelle
    setSelectedFleetVehicles(prevSelected => {
      const isAlreadySelected = prevSelected.some(v => v.id === vehicle.id);
      if (isAlreadySelected) {
        const newSelection = prevSelected.filter(v => v.id !== vehicle.id);
        return newSelection;
      } else {
        const newSelection = [...prevSelected, vehicle];
        return newSelection;
      }
    });

    // ✅ YENİ MANTIK: Eğer seçilen araç zaten `selectedFleetVehicle` ise, null yap (kapat). Aksi takdirde yeni seçilen aracı ata.
    // Bu, tekli seçimi toggle etme işlevi görür.
    setSelectedFleetVehicle(prevVehicle => 
      prevVehicle?.id === vehicle.id ? null : vehicle
    );

  }, []); // selectedFleetVehicles bağımlılıktan kaldırıldı, çünkü setSelectedFleetVehicles fonksiyonu prevSelected ile çalışıyor

  const handleSearch = useCallback(async (term) => {
    setSearchTerm(term);
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
  }, [allRoutes, setFilteredItems, setSelectedItem, setSelectedRoute, setSelectedStop, setMapCenter, setCurrentAnimatedStop, setIsRouteProgressPanelActive, setNavigationRoute, setSearchTerm]);

  // -------- Genel Efektler (Resize, İlk Veri Yükleme, Simülasyon) --------
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
    const fetchRoutesAndDirections = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/routes');
        const data = await res.json();

        console.log("API'den gelen RAW data (App.js):", data);
        const routesObject = {};
        let initialRoutes = [];

        if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
          initialRoutes = Object.values(data);
        } else if (Array.isArray(data)) {
          initialRoutes = data;
        } else {
          console.error("API'den beklenen veri formatı (obje veya dizi) gelmedi. Gelen veri:", data);
          dispatch(setAllRoutes({}));
          setFilteredItems([]);
          return;
        }

        const processedRoutes = await Promise.all(initialRoutes.map(async (route) => {
          let routeWithDirections = { ...route };
          if (!route.directions) {
            try {
              const response1 = await fetch(`http://localhost:5000/api/route-details/${route.route_number}/1`);
              const data1 = response1.ok ? await response1.json() : { coordinates: [], stops: [] };

              const response2 = await fetch(`http://localhost:5000/api/route-details/${route.route_number}/2`);
              const data2 = response2.ok ? await response2.json() : { coordinates: [], stops: [] };

              routeWithDirections.directions = {
                '1': data1.coordinates || [],
                '2': data2.coordinates || []
              };
              routeWithDirections.directionsStops = {
                '1': data1.stops || [],
                '2': data2.stops || []
              };
            } catch (error) {
              console.warn(`Rota ${route.route_number} için directions verisi çekilemedi:`, error);
              routeWithDirections.directions = { '1': [], '2': [] };
              routeWithDirections.directionsStops = { '1': [], '2': [] };
            }
          }
          return {
            ...routeWithDirections,
            start_point: routeWithDirections.start_point || '',
            end_point: routeWithDirections.end_point || ''
          };
        }));

        processedRoutes.forEach(route => {
          if (route && route.id) {
            routesObject[route.id] = route;
          }
        });

        dispatch(setAllRoutes(routesObject));
        setFilteredItems(Object.values(routesObject));
        console.log("İşlenmiş rotalar dizisi (App.js, with directions):", Object.values(routesObject));

      } catch (err) {
        console.error("Hat verisi alınırken hata oluştu (App.js):", err);
        dispatch(setAllRoutes({}));
        setFilteredItems([]);
      }
    };

    fetchRoutesAndDirections();
  }, [dispatch, setFilteredItems]);

  useEffect(() => {
    if (vehicles.length === 0 && Object.keys(allRoutes).length > 0) {
      const routesList = Object.values(allRoutes);
      console.log("Mevcut rotalar:", routesList.length);
      
      const initialVehicles = Array.from({ length: 394 }, (_, i) => {
        const vehicleId = i + 1;
        const assignedRoute = routesList[i % routesList.length];
        return createInitialSimulatedVehicle(vehicleId, assignedRoute);
      });
      
      setVehicles(initialVehicles);
      console.log(`394 araç oluşturuldu. ${routesList.length} farklı rota kullanıldı.`);
    }

    const intervalId = setInterval(() => {
      setVehicles(prevVehicles => {
        return prevVehicles.map(vehicle => {
          // Eğer selectedFleetVehicles boşsa veya araç seçili değilse, tüm araçları güncelle.
          // Aksi takdirde sadece seçili olanları güncelle (performans için)
          const isSelected = selectedFleetVehicles.some(v => v.id === vehicle.id);
          if (selectedFleetVehicles.length > 0 && !isSelected) {
            return vehicle; // Seçili değilse güncelleme
          }

          const newLocation = getRandomLocation();
          const newSpeed = getRandomSpeed();
          const now = new Date();
          const newOdometer = vehicle.odometer + Math.floor(Math.random() * 5) + 1;
          
          return {
            ...vehicle,
            speed: newSpeed,
            location: {
              lat: newLocation[1],
              lng: newLocation[0]
            },
            lastGpsTime: now.toLocaleTimeString('tr-TR'),
            odometer: newOdometer,
          };
        });
      });
    }, 60000);

    return () => clearInterval(intervalId);

  }, [allRoutes, vehicles.length, createInitialSimulatedVehicle, getRandomLocation, getRandomSpeed, selectedFleetVehicles]);

  // -------- Panel Açma/Kapatma Fonksiyonları --------
  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedItem(null);
    setSelectedRoute(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    setAnimatedDistanceToDestination(null);
    setAnimatedTimeToDestination(null);
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
    setNavigationRoute(null);
  }, [dispatch]);

  const closeRouteDetailsPanel = useCallback(() => {
    setIsRouteDetailsPanelOpen(false);
    setSelectedRoute(null);
    setSelectedItem(null);
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
    setSelectedItem(null);
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
    setSelectedItem(null);
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
    setSelectedItem(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    setCurrentDirection('1');
    dispatch(clearSelectedRoutes());
    setAnimatedDistanceToDestination(null);
    setAnimatedTimeToDestination(null);
  }, [dispatch]);

  const closeFleetTrackingPanel = useCallback(() => {
    setIsFleetTrackingPanelOpen(false);
    setSelectedFleetVehicle(null); // Panel kapanırken seçili aracı temizle
    setSelectedFleetVehicles([]); // Panel kapanırken çoklu seçimi temizle
    setMapCenter(null);
    setSelectedPopupInfo([]); // ✅ YENİ: Panel kapanırken pop-up bilgilerini temizle
  }, []);

  // const closeSettingsPanel = useCallback(() => { // ✅ KALDIRILDI
  //   setIsSettingsPanelOpen(false);
  // }, []);

  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev);
    setIsRouteDetailsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsStopSelectorOpen(false);
    setIsRouteNavigationPanelOpen(false);
    setIsFleetTrackingPanelOpen(false);
    // setIsSettingsPanelOpen(false); // ✅ KALDIRILDI
    setIsSidebarExpanded(true);
    setSelectedItem(null);
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
    setSelectedFleetVehicle(null); // Diğer panel açıldığında seçimi temizle
    setSelectedFleetVehicles([]);
    setSelectedPopupInfo([]); // ✅ YENİ: Diğer panel açıldığında pop-up bilgilerini temizle
  }, [dispatch]);

  const toggleRouteDetailsPanel = useCallback(() => {
    setIsRouteDetailsPanelOpen(prev => !prev);
    setIsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsStopSelectorOpen(false);
    setIsRouteNavigationPanelOpen(false);
    setIsFleetTrackingPanelOpen(false);
    // setIsSettingsPanelOpen(false); // ✅ KALDIRILDI
    setIsSidebarExpanded(true);
    setSelectedItem(null);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    setCurrentDirection('1');
    setNavigationRoute(null);
    setAnimatedDistanceToDestination(null);
    setAnimatedTimeToDestination(null);
    setSelectedFleetVehicle(null);
    setSelectedFleetVehicles([]);
    setSelectedPopupInfo([]); // ✅ YENİ
  }, []);

  const toggleDepartureTimesPanel = useCallback(() => {
    setIsDepartureTimesPanelOpen(prev => !prev);
    setIsPanelOpen(false);
    setIsRouteDetailsPanelOpen(false);
    setIsStopSelectorOpen(false);
    setIsRouteNavigationPanelOpen(false);
    setIsFleetTrackingPanelOpen(false);
    // setIsSettingsPanelOpen(false); // ✅ KALDIRILDI
    setIsSidebarExpanded(true);
    setSelectedItem(null);
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
    setSelectedFleetVehicle(null);
    setSelectedFleetVehicles([]);
    setSelectedPopupInfo([]); // ✅ YENİ
  }, [dispatch]);

  const toggleStopSelectorPanel = useCallback(() => {
    setIsStopSelectorOpen(prev => !prev);
    setIsPanelOpen(false);
    setIsRouteDetailsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsRouteNavigationPanelOpen(false);
    setIsFleetTrackingPanelOpen(false);
    // setIsSettingsPanelOpen(false); // ✅ KALDIRILDI
    setIsSidebarExpanded(true);
    setSelectedItem(null);
    setSelectedRoute(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
    setNavigationRoute(null);
    setAnimatedDistanceToDestination(null);
    setAnimatedTimeToDestination(null);
    setSelectedFleetVehicle(null);
    setSelectedFleetVehicles([]);
    setSelectedPopupInfo([]); // ✅ YENİ
  }, [dispatch]);

  const toggleRouteNavigationPanel = useCallback(() => {
    setIsRouteNavigationPanelOpen(prev => !prev);
    setIsPanelOpen(false);
    setIsRouteDetailsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsStopSelectorOpen(false);
    setIsFleetTrackingPanelOpen(false);
    // setIsSettingsPanelOpen(false); // ✅ KALDIRILDI
    setIsSidebarExpanded(true);
    setSelectedItem(null);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    setNavigationRoute(null);
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
    setAnimatedDistanceToDestination(null);
    setAnimatedTimeToDestination(null);
    setSelectedFleetVehicle(null);
    setSelectedFleetVehicles([]);
    setSelectedPopupInfo([]); // ✅ YENİ
  }, [dispatch]);

  const toggleFleetTrackingPanel = useCallback(() => {
    setIsFleetTrackingPanelOpen(prev => !prev);
    setIsPanelOpen(false);
    setIsRouteDetailsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsStopSelectorOpen(false);
    setIsRouteNavigationPanelOpen(false);
    // setIsSettingsPanelOpen(false); // ✅ KALDIRILDI
    setIsSidebarExpanded(true);
    setSelectedItem(null);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    setNavigationRoute(null);
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
    setAnimatedDistanceToDestination(null);
    setAnimatedTimeToDestination(null);
    setSelectedFleetVehicle(null); // Panel açıldığında seçimi temizle
    setSelectedFleetVehicles([]);
    setSelectedPopupInfo([]); // ✅ YENİ
  }, [dispatch]);

  // const toggleSettingsPanel = useCallback(() => { // ✅ KALDIRILDI
  //   setIsSettingsPanelOpen(prev => !prev);
  //   setIsPanelOpen(false);
  //   setIsRouteDetailsPanelOpen(false);
  //   setIsDepartureTimesPanelOpen(false);
  //   setIsStopSelectorOpen(false);
  //   setIsRouteNavigationPanelOpen(false);
  //   setIsFleetTrackingPanelOpen(false);
  //   setIsSidebarExpanded(true);
  // }, []);

  const toggleSidebarExpansion = useCallback(() => {
    setIsSidebarExpanded(prev => {
      const newExpandedState = !prev;
      if (!newExpandedState) {
        setIsPanelOpen(false);
        setIsRouteDetailsPanelOpen(false);
        setIsDepartureTimesPanelOpen(false);
        setIsStopSelectorOpen(false);
        setIsRouteNavigationPanelOpen(false);
        setIsFleetTrackingPanelOpen(false);
        // setIsSettingsPanelOpen(false); // ✅ KALDIRILDI
        setSelectedItem(null);
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
        setSelectedFleetVehicle(null);
        setSelectedFleetVehicles([]);
        setSelectedPopupInfo([]); // ✅ YENİ
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
    setSelectedRoute(null);
    setSelectedItem(null);
    setSelectedStop(null);
    setMapCenter(null);
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
          onToggleFleetTrackingPanel={toggleFleetTrackingPanel}
          // onToggleSettingsPanel={toggleSettingsPanel} // ✅ KALDIRILDI: Sidebar'dan SettingsPanel prop'u
          isExpanded={isSidebarExpanded}
        />

        <div className="main-container">
          <div className="content-area">
            <div className="map-container">
              <Map
                vehicles={vehicles}
                selectedFleetVehicle={selectedFleetVehicle}
                selectedFleetVehicles={selectedFleetVehicles}
                // onFleetVehicleMarkerClick={handleFleetVehicleSelect} // ✅ KALDIRILDI: Map üzerindeki marker tıklanamaz olacak
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
                isFleetTrackingPanelOpen={isFleetTrackingPanelOpen}
                navigationRoute={navigationRoute}
                animatedDistanceToDestination={animatedDistanceToDestination}
                animatedTimeToDestination={animatedTimeToDestination}
                selectedPopupInfo={selectedPopupInfo}
                // onOpenPanel={handleOpenPanel} // ✅ KALDIRILDI: Map üzerindeki detaylı bilgiler butonu
                onPopupInfoChange={handlePopupInfoChange} // FleetVehicleDetailsPanel'den Map'e veri göndermek için
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

            {isFleetTrackingPanelOpen && (
              <div className={`panel-wrapper ${isFleetTrackingPanelOpen ? 'open' : ''}`}>
                <FleetTrackingPanel
                  onClose={closeFleetTrackingPanel}
                  vehicles={vehicles}
                  onVehicleSelect={handleFleetVehicleSelect}
                  selectedVehicles={selectedFleetVehicles}
                />
              </div>
            )}

            {/* ✅ KALDIRILDI: Ayarlar Paneli */}
            {/* {isSettingsPanelOpen && (
              <div className={`panel-wrapper ${isSettingsPanelOpen ? 'open' : ''}`}>
                <SettingsPanel
                  onClose={closeSettingsPanel}
                  selectedPopupInfo={selectedPopupInfo}
                  onPopupInfoChange={handlePopupInfoChange}
                />
              </div>
            )} */}

            {isFleetTrackingPanelOpen && selectedFleetVehicle && (
              <div className={`panel-wrapper ${isFleetTrackingPanelOpen ? 'open' : ''} details-panel-right`}>
                <FleetVehicleDetailsPanel
                  onClose={() => setSelectedFleetVehicle(null)}
                  selectedVehicle={selectedFleetVehicle}
                  selectedPopupInfo={selectedPopupInfo} // Map'e gidecek state'i alıyor
                  onPopupInfoChange={handlePopupInfoChange} // Map'e göndermek için App.js'e güncellenecek
                />
              </div>
            )}

          </div>
        </div>

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