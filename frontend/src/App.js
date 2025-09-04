// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './store';
import FleetTrackingPanel from './components/FleetTrackingPanel';
import FleetFiltersPanel from './components/FleetFiltersPanel';
import FilteredVehiclesPanel from './components/FilteredVehiclesPanel';
import HistoricalTrackingPanel from './components/HistoricalTrackingPanel'; // ✅ YENİ: Geçmiş İzleme paneli

import FleetVehicleDetailsPanel from './components/FleetVehicleDetailsPanel';

import {
  setAllRoutes, clearSelectedRoutes, toggleSelectedRoute, selectAllRoutes,
  toggleSelectedStop, clearSelectedStops, setAllStops, selectAllStops, selectMultipleStops
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

const logVehiclePosition = async (vehicle) => {
  try {
    const response = await fetch('http://localhost:5000/api/vehicle-history/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vehicleId: vehicle.id,
        lat: vehicle.location.lat,
        lng: vehicle.location.lng,
        speed: vehicle.speed,
        direction: 0, // Şimdilik sabit, sonra hesaplanabilir
        status: vehicle.status,
        routeCode: vehicle.routeCode || null
      })
    });

    if (!response.ok) {
      console.error('Logging hatası:', response.status);
    }
  } catch (error) {
    // Logging hatalarını sessizce geç, ana uygulamayı etkilemesin
    console.warn('Araç logging hatası:', error);
  }
};

function App() {
  const dispatch = useDispatch();

  // Redux state selectors
  const allRoutes = useSelector(state => state.selectedItems.allRoutes);
  const selectedRouteIds = useSelector(state => state.selectedItems.selectedRouteIds);
  const allStops = useSelector(state => state.selectedItems.allStops);
  const selectedStopIds = useSelector(state => state.selectedItems.selectedStopIds);

  // Theme state - localStorage'dan yükle
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('app-theme');
    return savedTheme || 'light';
  });

  // Lokal state'ler
  const [vehicles, setVehicles] = useState([]);
  const [selectedFleetVehicle, setSelectedFleetVehicle] = useState(null);
  const [selectedFleetVehicles, setSelectedFleetVehicles] = useState([]);
  const [filteredFleetVehicles, setFilteredFleetVehicles] = useState([]);
  const [isFilteredVehiclesPanelOpen, setIsFilteredVehiclesPanelOpen] = useState(false);
  
  // Pop-up entegrasyonu için state'ler
  const [selectedPopupInfo, setSelectedPopupInfo] = useState([
    { key: 'speed', label: 'Araç Hızı', value: '41 km/h', icon: '⚡' },
    { key: 'plate', label: 'Plaka', value: '35 NGK 802', icon: '🏷️' },
    { key: 'routeCode', label: 'Hat No', value: 'T1', icon: '🔢' },
    { key: 'status', label: 'Durum', value: 'Aktif/Çalışıyor', icon: '🔵' },
    { key: 'lastGpsTime', label: 'Son GPS', value: '14:26:53', icon: '⏰' },
    { key: 'odometer', label: 'KM', value: '522.005,32 km', icon: '📊' }
  ]);

  // Panel state'leri
  const [selectedItem, setSelectedItem] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isRouteDetailsPanelOpen, setIsRouteDetailsPanelOpen] = useState(false);
  const [isDepartureTimesPanelOpen, setIsDepartureTimesPanelOpen] = useState(false);
  const [isStopSelectorOpen, setIsStopSelectorOpen] = useState(false);
  const [isFleetTrackingPanelOpen, setIsFleetTrackingPanelOpen] = useState(false);
  const [isFleetFiltersPanelOpen, setIsFleetFiltersPanelOpen] = useState(false);
  const [isHistoricalTrackingPanelOpen, setIsHistoricalTrackingPanelOpen] = useState(false); // ✅ YENİ: Geçmiş İzleme paneli

  // Diğer state'ler
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [routesForSelectedStop, setRoutesForSelectedStop] = useState([]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [currentAnimatedStop, setCurrentAnimatedStop] = useState(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  const [isRouteProgressPanelActive, setIsRouteProgressPanelActive] = useState(false);
  const [currentDirection, setCurrentDirection] = useState('1');
  //  YENİ: Geçmiş izleme states
  const [historicalTrackingData, setHistoricalTrackingData] = useState([]);
  const [currentHistoricalVehicle, setCurrentHistoricalVehicle] = useState(null);
  const [currentHistoricalIndex, setCurrentHistoricalIndex] = useState(0);
  const [isHistoricalMode, setIsHistoricalMode] = useState(false);

  // Theme değişikliklerini localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      document.documentElement.classList.add('dark-theme'); 
    } else {
      document.body.classList.remove('dark-theme');
      document.documentElement.classList.remove('dark-theme'); 
    }
  }, [theme]);

  // Dark Mode Toggle Fonksiyonu
  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  const handlePopupInfoChange = useCallback((newSelectedInfo) => {
    console.log('Pop-up bilgileri güncelleniyor:', newSelectedInfo);
    setSelectedPopupInfo(newSelectedInfo);
  }, []);

  // Filtrelenmiş araçları güncelleme fonksiyonu
  const handleFilteredVehiclesChange = useCallback((filtered) => {
    console.log('Filtrelenmiş araçlar güncelleniyor:', filtered.length);
    setFilteredFleetVehicles(filtered);
    if (filtered.length > 0) {
      setIsFilteredVehiclesPanelOpen(true);
    } else {
      setIsFilteredVehiclesPanelOpen(false);
    }
  }, []);

  // Sağ panel kapatma handler'ı
  const closeFilteredVehiclesPanel = useCallback(() => {
    setIsFilteredVehiclesPanelOpen(false);
  }, []);

  // ✅ YENİ: Geçmiş veri değişikliği handler
  const handleHistoricalDataChange = useCallback((data, vehicle, currentIndex = 0) => {
    setHistoricalTrackingData(data);
    setCurrentHistoricalVehicle(vehicle);
    setCurrentHistoricalIndex(currentIndex);
    setIsHistoricalMode(true);
    
    // Haritayı güncelle
    if (data && data[currentIndex]) {
      setMapCenter(data[currentIndex].location);
    }
  }, []);

  // Fleet vehicle seçim handler'ı
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

    // Toggle logic: Eğer seçilen araç zaten selectedFleetVehicle ise, null yap (kapat). Aksi takdirde yeni seçilen aracı ata.
    setSelectedFleetVehicle(prevVehicle => 
      prevVehicle?.id === vehicle.id ? null : vehicle
    );
  }, []);

  // Filtrelenmiş panelden araç seçme handler'ı
  const handleFilteredVehicleSelect = useCallback((vehicle) => {
    // Seçilen aracı ana filo takip panelindeki seçime ekle
    handleFleetVehicleSelect(vehicle);
    
    // Seçilen aracın detaylarını göster
    setSelectedFleetVehicle(vehicle);
    setMapCenter(vehicle.location ? [vehicle.location.lng, vehicle.location.lat] : null);
  }, [handleFleetVehicleSelect]);

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

  const handleSelectMultipleStops = useCallback((stopIds) => {
    dispatch(selectMultipleStops(stopIds));
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
    const range = 0.05;

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
          'Aktif', 'Aktif', 'Aktif', 'Aktif', 'Aktif', 'Aktif', 'Aktif',
          'Servis Dışı', 'Bakımda'
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
          routeData: routeData,
          
          // Filtreler için ek veriler
          motorTemp: Math.floor(Math.random() * 40) + 60,
          fuelLevel: Math.floor(Math.random() * 100) + 1,
          age: Math.floor(Math.random() * 15) + 1,
          mileage: Math.floor(Math.random() * 800000) + 50000,
          wheelchairAccessible: Math.random() > 0.7,
          airConditioning: Math.random() > 0.2,
          wifiEnabled: Math.random() > 0.6,
          type: ['standard', 'articulated', 'electric'][Math.floor(Math.random() * 3)],
          capacity: 80 + Math.floor(Math.random() * 70),
          daysSinceLastMaintenance: Math.floor(Math.random() * 90),
          fuelType: ['diesel', 'electric', 'hybrid', 'cng'][Math.floor(Math.random() * 4)]
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
       
        return;
    }

    setSelectedItem(item);
    console.log("selectedItem güncellendi:", item);

    if (item?.route_number) {
        try {
          let fullRouteData = item;
          if (!item.directions || !item.directions['1'] || item.directions['1'].length === 0) {
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

  // Ana hat listesini çek
  useEffect(() => {
    const fetchRoutes = async () => {
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

        initialRoutes.forEach(route => {
          if (route && route.id) {
            routesObject[route.id] = {
              ...route,
              start_point: route.start_point || '',
              end_point: route.end_point || '',
              directions: { '1': [], '2': [] }, 
              directionsStops: { '1': [], '2': [] }
            };
          }
        });

        dispatch(setAllRoutes(routesObject));
        setFilteredItems(Object.values(routesObject));
        console.log("Sadece ana hat listesi yüklendi:", Object.values(routesObject));

      } catch (err) {
        console.error("Hat verisi alınırken hata oluştu (App.js):", err);
        dispatch(setAllRoutes({}));
        setFilteredItems([]);
      }
    };

    fetchRoutes();
  }, [dispatch]);

  // Araçları oluştur ve simüle et
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
      setFilteredFleetVehicles(initialVehicles);
      console.log(`394 araç oluşturuldu. ${routesList.length} farklı rota kullanıldı.`);
    }

   const intervalId = setInterval(() => {
  setVehicles(prevVehicles => {
    return prevVehicles.map(vehicle => {
      const isSelected = selectedFleetVehicles.some(v => v.id === vehicle.id);
      if (selectedFleetVehicles.length > 0 && !isSelected) {
        return vehicle;
      }

      const newLocation = getRandomLocation();
      const newSpeed = getRandomSpeed();
      const now = new Date();
      const newOdometer = vehicle.odometer + Math.floor(Math.random() * 5) + 1;
      
      const updatedVehicle = {
        ...vehicle,
        speed: newSpeed,
        location: {
          lat: newLocation[1],
          lng: newLocation[0]
        },
        lastGpsTime: now.toLocaleTimeString('tr-TR'),
        odometer: newOdometer,
      };

      if (vehicle.status?.toLowerCase().includes('aktif')) {
        logVehiclePosition(updatedVehicle);
      }

      return updatedVehicle; 
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
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
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
  }, [dispatch]);

  const closeFleetTrackingPanel = useCallback(() => {
    setIsFleetTrackingPanelOpen(false);
    setSelectedFleetVehicle(null);
    setSelectedFleetVehicles([]);
    setMapCenter(null);
    setSelectedPopupInfo([]);
  }, []);

  const closeFleetFiltersPanel = useCallback(() => {
    setIsFleetFiltersPanelOpen(false);
    setIsFilteredVehiclesPanelOpen(false);
    setFilteredFleetVehicles([]);
  }, []);

  // ✅ YENİ: Geçmiş izleme panel kapatma fonksiyonu
  const closeHistoricalTrackingPanel = useCallback(() => {
    setIsHistoricalTrackingPanelOpen(false);
    setIsHistoricalMode(false);
    setHistoricalTrackingData([]);
    setCurrentHistoricalVehicle(null);
    setCurrentHistoricalIndex(0);
  }, []);

  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev);
    setIsRouteDetailsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsStopSelectorOpen(false);
    setIsFleetTrackingPanelOpen(false);
    setIsFleetFiltersPanelOpen(false);
    setIsHistoricalTrackingPanelOpen(false); // ✅ YENİ
    setIsFilteredVehiclesPanelOpen(false);
    setIsSidebarExpanded(true);
    setSelectedItem(null);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
    setSelectedFleetVehicle(null);
    setSelectedFleetVehicles([]);
    setSelectedPopupInfo([]);
    setIsHistoricalMode(false);
    setHistoricalTrackingData([]);
    setCurrentHistoricalVehicle(null);
  }, [dispatch]);

  const toggleRouteDetailsPanel = useCallback(() => {
    setIsRouteDetailsPanelOpen(prev => !prev);
    setIsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsStopSelectorOpen(false);
    setIsFleetTrackingPanelOpen(false);
    setIsFleetFiltersPanelOpen(false);
    setIsHistoricalTrackingPanelOpen(false); // ✅ YENİ
    setIsFilteredVehiclesPanelOpen(false);
    setIsSidebarExpanded(true);
    setSelectedItem(null);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    setCurrentDirection('1');
    setSelectedFleetVehicle(null);
    setSelectedFleetVehicles([]);
    setSelectedPopupInfo([]);
    setIsHistoricalMode(false);
    setHistoricalTrackingData([]);
    setCurrentHistoricalVehicle(null);
  }, []);

  const toggleDepartureTimesPanel = useCallback(() => {
    setIsDepartureTimesPanelOpen(prev => !prev);
    setIsPanelOpen(false);
    setIsRouteDetailsPanelOpen(false);
    setIsStopSelectorOpen(false);
    setIsFleetTrackingPanelOpen(false);
    setIsFleetFiltersPanelOpen(false);
    setIsHistoricalTrackingPanelOpen(false); // ✅ YENİ
    setIsFilteredVehiclesPanelOpen(false);
    setIsSidebarExpanded(true);
    setSelectedItem(null);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
    setSelectedFleetVehicle(null);
    setSelectedFleetVehicles([]);
    setSelectedPopupInfo([]);
    setIsHistoricalMode(false);
    setHistoricalTrackingData([]);
    setCurrentHistoricalVehicle(null);
  }, [dispatch]);

  const toggleStopSelectorPanel = useCallback(() => {
    setIsStopSelectorOpen(prev => !prev);
    setIsPanelOpen(false);
    setIsRouteDetailsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsFleetTrackingPanelOpen(false);
    setIsFleetFiltersPanelOpen(false);
    setIsHistoricalTrackingPanelOpen(false); // ✅ YENİ
    setIsFilteredVehiclesPanelOpen(false);
    setIsSidebarExpanded(true);
    setSelectedItem(null);
    setSelectedRoute(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
    setSelectedFleetVehicle(null);
    setSelectedFleetVehicles([]);
    setSelectedPopupInfo([]);
    setIsHistoricalMode(false);
    setHistoricalTrackingData([]);
    setCurrentHistoricalVehicle(null);
  }, [dispatch]);

  const toggleFleetTrackingPanel = useCallback(() => {
    setIsFleetTrackingPanelOpen(prev => !prev);
    setIsPanelOpen(false);
    setIsRouteDetailsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsStopSelectorOpen(false);
    setIsFleetFiltersPanelOpen(false);
    setIsHistoricalTrackingPanelOpen(false); // ✅ YENİ
    setIsFilteredVehiclesPanelOpen(false);
    setIsSidebarExpanded(true);
    setSelectedItem(null);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
    setSelectedFleetVehicle(null);
    setSelectedFleetVehicles([]);
    setSelectedPopupInfo([]);
    setIsHistoricalMode(false);
    setHistoricalTrackingData([]);
    setCurrentHistoricalVehicle(null);
  }, [dispatch]);

  const toggleFleetFiltersPanel = useCallback(() => {
    setIsFleetFiltersPanelOpen(prev => !prev);
    setIsPanelOpen(false);
    setIsRouteDetailsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsStopSelectorOpen(false);
    setIsFleetTrackingPanelOpen(false);
    setIsHistoricalTrackingPanelOpen(false); // ✅ YENİ
    setIsFilteredVehiclesPanelOpen(false);
    setIsSidebarExpanded(true);
    setSelectedItem(null);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
    setSelectedFleetVehicle(null);
    setSelectedFleetVehicles([]);
    setSelectedPopupInfo([]);
    setIsHistoricalMode(false);
    setHistoricalTrackingData([]);
    setCurrentHistoricalVehicle(null);
  }, [dispatch]);

  // ✅ YENİ: Geçmiş izleme panel toggle fonksiyonu
  const toggleHistoricalTrackingPanel = useCallback(() => {
    setIsHistoricalTrackingPanelOpen(prev => !prev);
    setIsPanelOpen(false);
    setIsRouteDetailsPanelOpen(false);
    setIsDepartureTimesPanelOpen(false);
    setIsStopSelectorOpen(false);
    setIsFleetTrackingPanelOpen(false);
    setIsFleetFiltersPanelOpen(false);
    setIsFilteredVehiclesPanelOpen(false);
    setIsSidebarExpanded(true);
    setSelectedItem(null);
    setSelectedRoute(null);
    setSelectedStop(null);
    setMapCenter(null);
    setCurrentAnimatedStop(null);
    setIsRouteProgressPanelActive(false);
    dispatch(clearSelectedRoutes());
    setCurrentDirection('1');
    setSelectedFleetVehicle(null);
    setSelectedFleetVehicles([]);
    setSelectedPopupInfo([]);
    // Panel kapandığında geçmiş modunu kapat
    if (isHistoricalTrackingPanelOpen) {
      setIsHistoricalMode(false);
      setHistoricalTrackingData([]);
      setCurrentHistoricalVehicle(null);
    }
  }, [dispatch, isHistoricalTrackingPanelOpen]);

  const handleMenuClick = useCallback((menuItem) => {
    switch (menuItem) {
      case 'vehicle-list':
        togglePanel();
        break;
      case 'route-details':
        toggleRouteDetailsPanel();
        break;
      case 'departure-times':
        toggleDepartureTimesPanel();
        break;
      case 'stop-selector':
        toggleStopSelectorPanel();
        break;
      case 'fleet-tracking':
        toggleFleetTrackingPanel();
        break;
      case 'fleet-filters':
        toggleFleetFiltersPanel();
        break;
      case 'historical-tracking': // ✅ YENİ
        toggleHistoricalTrackingPanel();
        break;
      default:
        console.log('Bilinmeyen menü öğesi:', menuItem);
    }
  }, [togglePanel, toggleRouteDetailsPanel, toggleDepartureTimesPanel, toggleStopSelectorPanel, toggleFleetTrackingPanel, toggleFleetFiltersPanel, toggleHistoricalTrackingPanel]);

  const toggleSidebarExpansion = useCallback(() => {
    setIsSidebarExpanded(prev => {
      const newExpandedState = !prev;
      if (!newExpandedState) {
        setIsPanelOpen(false);
        setIsRouteDetailsPanelOpen(false);
        setIsDepartureTimesPanelOpen(false);
        setIsStopSelectorOpen(false);
        setIsFleetTrackingPanelOpen(false);
        setIsFleetFiltersPanelOpen(false);
        setIsHistoricalTrackingPanelOpen(false); // ✅ YENİ
        setIsFilteredVehiclesPanelOpen(false);
        setSelectedItem(null);
        setSelectedRoute(null);
        setSelectedStop(null);
        setMapCenter(null);
        setCurrentAnimatedStop(null);
        setIsRouteProgressPanelActive(false);
        dispatch(clearSelectedRoutes());
        setCurrentDirection('1');
        setSelectedFleetVehicle(null);
        setSelectedFleetVehicles([]);
        setSelectedPopupInfo([]);
        setIsHistoricalMode(false);
        setHistoricalTrackingData([]);
        setCurrentHistoricalVehicle(null);
      }
      return newExpandedState;
    });
  }, [dispatch]);

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
    <Provider store={store}>
      <div className={`app-layout ${isSidebarExpanded ? 'sidebar-expanded' : ''} ${theme === 'dark' ? 'dark-theme' : ''}`}>
        <Navbar 
          toggleSidebar={toggleSidebarExpansion} 
          onToggleTheme={toggleTheme}
          currentTheme={theme}
          isMobileView={isMobileView} 
        />

        <Sidebar
          onMenuClick={handleMenuClick}
          isExpanded={isSidebarExpanded}
          theme={theme}
        />

        <div className="main-container">
          <div className="content-area">
            <div className="map-container">
              <Map
                vehicles={vehicles}
                selectedFleetVehicle={selectedFleetVehicle}
                selectedFleetVehicles={selectedFleetVehicles}
                selectedVehicle={selectedItem}
                selectedRoute={selectedRoute}
                mapCenter={mapCenter}
                selectedStop={selectedStop}
                onCurrentStopChange={handleCurrentStopChange}
          
                currentAnimatedStop={currentAnimatedStop}
                currentDirection={currentDirection}
                selectedRouteIds={selectedRouteIds}
                allRoutes={allRoutes}
                theme={theme}
                isPanelOpen={isPanelOpen}
                isRouteDetailsPanelOpen={isRouteDetailsPanelOpen}
                isDepartureTimesPanelOpen={isDepartureTimesPanelOpen}
                isFleetTrackingPanelOpen={isFleetTrackingPanelOpen}
                selectedPopupInfo={selectedPopupInfo}
                onPopupInfoChange={handlePopupInfoChange}
                // ✅ YENİ: Geçmiş izleme props
                historicalTrackingData={historicalTrackingData}
                currentHistoricalVehicle={currentHistoricalVehicle}
                currentHistoricalIndex={currentHistoricalIndex}
                isHistoricalMode={isHistoricalMode}
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
                <RouteDetailsPanel onClose={closeRouteDetailsPanel} allRoutes={allRoutes} onVehicleClick={handleVehicleClick} theme={theme} />
              </div>
            )}

            {isDepartureTimesPanelOpen && (
              <div className={`panel-wrapper ${isDepartureTimesPanelOpen ? 'open' : ''}`}>
                <DepartureTimesPanel onClose={closeDepartureTimesPanel} allRoutes={allRoutes} theme={theme} />
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
                  onSelectMultipleStops={handleSelectMultipleStops}
                  theme={theme}
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
                  theme={theme}
                />
              </div>
            )}

            {isFleetFiltersPanelOpen && (
              <div className={`panel-wrapper ${isFleetFiltersPanelOpen ? 'open' : ''}`}>
                <FleetFiltersPanel
                  isOpen={isFleetFiltersPanelOpen}
                  onClose={closeFleetFiltersPanel}
                  vehicles={vehicles}
                  onFilteredVehiclesChange={handleFilteredVehiclesChange}
                  theme={theme}
                />
              </div>
            )}

            {/* ✅ YENİ: Geçmişe Dönük İzleme Paneli */}
            {isHistoricalTrackingPanelOpen && (
              <div className={`panel-wrapper ${isHistoricalTrackingPanelOpen ? 'open' : ''}`}>
                <HistoricalTrackingPanel
                  onClose={closeHistoricalTrackingPanel}
                  vehicles={vehicles}
                  theme={theme}
                  onHistoricalDataChange={handleHistoricalDataChange}
                />
              </div>
            )}

            {isFleetTrackingPanelOpen && selectedFleetVehicle && (
              <div className={`panel-wrapper ${isFleetTrackingPanelOpen ? 'open' : ''} details-panel-right`}>
                <FleetVehicleDetailsPanel
                  onClose={() => setSelectedFleetVehicle(null)}
                  selectedVehicle={selectedFleetVehicle}
                  selectedPopupInfo={selectedPopupInfo}
                  onPopupInfoChange={handlePopupInfoChange}
                  theme={theme}
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
           
            theme={theme}
          />
        )}

        {/* Sağ Taraf Filtrelenmiş Araçlar Paneli */}
        <FilteredVehiclesPanel
          filteredVehicles={filteredFleetVehicles}
          isOpen={isFilteredVehiclesPanelOpen}
          onClose={closeFilteredVehiclesPanel}
          onVehicleSelect={handleFilteredVehicleSelect}
          theme={theme}
        />
      </div>
    </Provider>
  );
}

export default App;