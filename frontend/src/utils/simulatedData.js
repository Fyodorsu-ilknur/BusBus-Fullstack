// frontend/src/utils/simulatedData.js

// İzmir merkez koordinatları
const IZMIR_CENTER = [27.1428, 38.4237];
const IZMIR_BOUNDS = {
  minLat: 38.35,
  maxLat: 38.50,
  minLng: 27.05,
  maxLng: 27.25
};

// Araç tipleri ve özellikleri
const VEHICLE_TYPES = [
  { type: 'standard', name: 'Standart Otobüs', capacity: 90, fuelType: 'diesel' },
  { type: 'articulated', name: 'Körüklü Otobüs', capacity: 150, fuelType: 'diesel' },
  { type: 'electric', name: 'Elektrikli Otobüs', capacity: 85, fuelType: 'electric' },
  { type: 'hybrid', name: 'Hibrit Otobüs', capacity: 95, fuelType: 'hybrid' }
];

// Durum tipleri
const STATUS_TYPES = ['Aktif', 'Bakımda', 'Servis Dışı'];

// Hat kodları (İzmir'deki gerçek hatlar)
const ROUTE_CODES = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '25', '30', '32', '35', '40', '50', '52', '55', '60', '65',
  '70', '75', '80', '85', '90', '95', '100', '110', '120', '130'
];

// Rastgele koordinat üretme fonksiyonu (İzmir sınırları içinde)
function generateRandomCoordinate() {
  return [
    Math.random() * (IZMIR_BOUNDS.maxLng - IZMIR_BOUNDS.minLng) + IZMIR_BOUNDS.minLng,
    Math.random() * (IZMIR_BOUNDS.maxLat - IZMIR_BOUNDS.minLat) + IZMIR_BOUNDS.minLat
  ];
}

// Plaka üretme fonksiyonu (İzmir - 35 plaka kodu)
function generatePlateNumber(id) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letter1 = letters.charAt(Math.floor(Math.random() * letters.length));
  const letter2 = letters.charAt(Math.floor(Math.random() * letters.length));
  const numbers = String(id).padStart(4, '0');
  
  return `35 ${letter1}${letter2} ${numbers}`;
}

// Rastgele tarih üretme (son bakım için)
function generateRandomDate(daysBack) {
  const today = new Date();
  const randomDays = Math.floor(Math.random() * daysBack);
  const randomDate = new Date(today);
  randomDate.setDate(today.getDate() - randomDays);
  return randomDate;
}

// Araç yaşı hesaplama
function calculateVehicleAge(year) {
  return new Date().getFullYear() - year;
}

// Simüle edilmiş araç verisi oluşturma
function createSimulatedVehicle(id) {
  const vehicleType = VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
  const status = STATUS_TYPES[Math.floor(Math.random() * STATUS_TYPES.length)];
  const routeCode = ROUTE_CODES[Math.floor(Math.random() * ROUTE_CODES.length)];
  const modelYear = 2010 + Math.floor(Math.random() * 14); // 2010-2023 arası
  const lastMaintenanceDate = generateRandomDate(365); // Son 1 yıl içinde
  const daysSinceLastMaintenance = Math.floor((new Date() - lastMaintenanceDate) / (1000 * 60 * 60 * 24));
  
  return {
    id: id,
    plate: generatePlateNumber(id),
    routeCode: routeCode,
    status: status,
    type: vehicleType.type,
    capacity: vehicleType.capacity,
    fuelType: vehicleType.fuelType,
    
    // Konum bilgileri
    position: generateRandomCoordinate(),
    
    // Sensör verileri
    speed: status === 'Aktif' ? Math.floor(Math.random() * 60) + 5 : 0, // 5-65 km/h
    motorTemp: Math.floor(Math.random() * 40) + 60, // 60-100°C
    fuelLevel: Math.floor(Math.random() * 100) + 1, // 1-100%
    
    // Araç bilgileri
    age: calculateVehicleAge(modelYear),
    modelYear: modelYear,
    mileage: Math.floor(Math.random() * 800000) + 50000, // 50k-850k km
    
    // Özel özellikler
    wheelchairAccessible: Math.random() > 0.7, // %30 ihtimalle
    airConditioning: Math.random() > 0.2, // %80 ihtimalle
    wifiEnabled: Math.random() > 0.6, // %40 ihtimalle
    
    // Bakım bilgileri
    lastMaintenanceDate: lastMaintenanceDate,
    daysSinceLastMaintenance: daysSinceLastMaintenance,
    nextMaintenanceDate: new Date(lastMaintenanceDate.getTime() + (90 * 24 * 60 * 60 * 1000)), // 90 gün sonra
    
    // Operasyonel bilgiler
    totalDistance: Math.floor(Math.random() * 500) + 50, // Günlük km
    totalPassengers: Math.floor(Math.random() * 800) + 100, // Günlük yolcu
    fuelConsumption: (Math.random() * 15 + 25).toFixed(2), // 25-40 L/100km
    
    // Sürücü bilgileri
    driverName: `Sürücü ${id}`,
    driverLicense: `D${String(id).padStart(6, '0')}`,
    
    // Güzergah bilgileri
    currentStop: `Durak ${Math.floor(Math.random() * 50) + 1}`,
    nextStop: `Durak ${Math.floor(Math.random() * 50) + 1}`,
    
    // Zaman bilgileri
    departureTime: new Date(),
    estimatedArrival: new Date(Date.now() + Math.random() * 30 * 60 * 1000), // 0-30 dk sonra
    
    // Performans metrikleri
    onTimePerformance: Math.floor(Math.random() * 30) + 70, // %70-100
    averageSpeed: Math.floor(Math.random() * 20) + 25, // 25-45 km/h
    
    // Durum göstergeleri
    engineStatus: Math.random() > 0.05 ? 'Normal' : 'Uyarı', // %5 uyarı
    brakeStatus: Math.random() > 0.02 ? 'Normal' : 'Uyarı', // %2 uyarı
    tireStatus: Math.random() > 0.03 ? 'Normal' : 'Uyarı', // %3 uyarı
    
    // İletişim bilgileri
    gpsSignal: Math.random() > 0.05 ? 'Güçlü' : 'Zayıf', // %5 zayıf sinyal
    radioStatus: Math.random() > 0.02 ? 'Çevrimiçi' : 'Çevrimdışı', // %2 çevrimdışı
    
    // Enerji bilgileri (elektrikli araçlar için)
    batteryLevel: vehicleType.fuelType === 'electric' ? Math.floor(Math.random() * 100) + 1 : null,
    chargingStatus: vehicleType.fuelType === 'electric' ? 
      (Math.random() > 0.8 ? 'Şarj Oluyor' : 'Şarj Olmuyor') : null,
    
    // Son güncellenme zamanı
    lastUpdate: new Date(),
    
    // Ek bilgiler
    isSelected: false,
    hasAlerts: Math.random() > 0.85, // %15 uyarı
    alertCount: Math.floor(Math.random() * 3),
    priority: Math.random() > 0.9 ? 'high' : (Math.random() > 0.7 ? 'medium' : 'low')
  };
}

// Filo araçlarını oluştur
export function generateSimulatedVehicles(count = 100) {
  const vehicles = [];
  
  for (let i = 1; i <= count; i++) {
    vehicles.push(createSimulatedVehicle(i));
  }
  
  return vehicles;
}

// Gerçek zamanlı veri güncellemesi (simülasyon)
export function updateVehicleData(vehicle) {
  if (vehicle.status === 'Aktif') {
    // Sadece aktif araçların verilerini güncelle
    return {
      ...vehicle,
      speed: Math.max(0, vehicle.speed + (Math.random() - 0.5) * 10),
      motorTemp: Math.max(60, Math.min(100, vehicle.motorTemp + (Math.random() - 0.5) * 5)),
      fuelLevel: Math.max(1, Math.min(100, vehicle.fuelLevel - Math.random() * 0.5)),
      batteryLevel: vehicle.batteryLevel ? 
        Math.max(1, Math.min(100, vehicle.batteryLevel - Math.random() * 0.3)) : null,
      position: [
        vehicle.position[0] + (Math.random() - 0.5) * 0.001,
        vehicle.position[1] + (Math.random() - 0.5) * 0.001
      ],
      totalDistance: vehicle.totalDistance + Math.random() * 2,
      totalPassengers: vehicle.totalPassengers + Math.floor(Math.random() * 10),
      lastUpdate: new Date()
    };
  }
  
  return vehicle;
}

// Filtreleme yardımcı fonksiyonları
export function filterVehiclesByStatus(vehicles, status) {
  if (status === 'all') return vehicles;
  return vehicles.filter(vehicle => 
    vehicle.status.toLowerCase().replace(' ', '-') === status
  );
}

export function filterVehiclesByRoute(vehicles, routeCodes) {
  if (!routeCodes || routeCodes.length === 0) return vehicles;
  return vehicles.filter(vehicle => 
    routeCodes.includes(vehicle.routeCode)
  );
}

export function filterVehiclesBySpecialRequirements(vehicles, requirements) {
  return vehicles.filter(vehicle => {
    if (requirements.wheelchairAccessible && !vehicle.wheelchairAccessible) return false;
    if (requirements.airConditioning && !vehicle.airConditioning) return false;
    if (requirements.wifiEnabled && !vehicle.wifiEnabled) return false;
    return true;
  });
}

// İstatistik hesaplama fonksiyonları
export function calculateFleetStatistics(vehicles) {
  const total = vehicles.length;
  const active = vehicles.filter(v => v.status === 'Aktif').length;
  const maintenance = vehicles.filter(v => v.status === 'Bakımda').length;
  const outOfService = vehicles.filter(v => v.status === 'Servis Dışı').length;
  
  const avgFuelLevel = vehicles.reduce((sum, v) => sum + v.fuelLevel, 0) / total;
  const avgSpeed = vehicles.filter(v => v.status === 'Aktif')
    .reduce((sum, v) => sum + v.speed, 0) / active;
  
  return {
    total,
    active,
    maintenance,
    outOfService,
    avgFuelLevel: avgFuelLevel.toFixed(1),
    avgSpeed: avgSpeed.toFixed(1),
    wheelchairAccessible: vehicles.filter(v => v.wheelchairAccessible).length,
    withWifi: vehicles.filter(v => v.wifiEnabled).length,
    withAC: vehicles.filter(v => v.airConditioning).length
  };
}

// Arama fonksiyonu
export function searchVehicles(vehicles, searchTerm) {
  if (!searchTerm) return vehicles;
  
  const term = searchTerm.toLowerCase();
  return vehicles.filter(vehicle => 
    vehicle.id.toString().includes(term) ||
    vehicle.plate.toLowerCase().includes(term) ||
    vehicle.routeCode.toLowerCase().includes(term) ||
    vehicle.status.toLowerCase().includes(term)
  );
}

// Sıralama fonksiyonları
export function sortVehicles(vehicles, sortBy, sortOrder = 'asc') {
  const sortedVehicles = [...vehicles].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'id':
        aValue = parseInt(a.id);
        bValue = parseInt(b.id);
        break;
      case 'plate':
        aValue = a.plate;
        bValue = b.plate;
        break;
      case 'route':
        aValue = a.routeCode;
        bValue = b.routeCode;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'fuelLevel':
        aValue = a.fuelLevel;
        bValue = b.fuelLevel;
        break;
      case 'speed':
        aValue = a.speed;
        bValue = b.speed;
        break;
      case 'age':
        aValue = a.age;
        bValue = b.age;
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
  
  return sortedVehicles;
}

// Uyarı durumlarını kontrol et
export function checkVehicleAlerts(vehicle) {
  const alerts = [];
  
  // Düşük yakıt seviyesi
  if (vehicle.fuelLevel < 15) {
    alerts.push({
      type: 'fuel',
      severity: 'high',
      message: 'Düşük yakıt seviyesi'
    });
  }
  
  // Yüksek motor sıcaklığı
  if (vehicle.motorTemp > 95) {
    alerts.push({
      type: 'temperature',
      severity: 'high',
      message: 'Yüksek motor sıcaklığı'
    });
  }
  
  // Bakım zamanı yaklaştı
  if (vehicle.daysSinceLastMaintenance > 80) {
    alerts.push({
      type: 'maintenance',
      severity: 'medium',
      message: 'Bakım zamanı yaklaştı'
    });
  }
  
  // Düşük batarya seviyesi (elektrikli araçlar için)
  if (vehicle.batteryLevel && vehicle.batteryLevel < 20) {
    alerts.push({
      type: 'battery',
      severity: 'medium',
      message: 'Düşük batarya seviyesi'
    });
  }
  
  // GPS sinyal problemi
  if (vehicle.gpsSignal === 'Zayıf') {
    alerts.push({
      type: 'gps',
      severity: 'low',
      message: 'Zayıf GPS sinyali'
    });
  }
  
  return alerts;
}

// Rapor verisi oluşturma
export function generateFleetReport(vehicles, timeframe = 'daily') {
  const stats = calculateFleetStatistics(vehicles);
  const alerts = vehicles.map(checkVehicleAlerts).flat();
  
  return {
    timestamp: new Date(),
    timeframe,
    summary: stats,
    alerts: {
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length,
      total: alerts.length
    },
    performance: {
      onTimeRate: vehicles.reduce((sum, v) => sum + v.onTimePerformance, 0) / vehicles.length,
      avgFuelConsumption: vehicles.reduce((sum, v) => sum + parseFloat(v.fuelConsumption), 0) / vehicles.length,
      totalDistance: vehicles.reduce((sum, v) => sum + v.totalDistance, 0),
      totalPassengers: vehicles.reduce((sum, v) => sum + v.totalPassengers, 0)
    }
  };
}