import React, { useState, useRef, useEffect } from 'react';
import './FleetVehicleDetailsPanel.css';

function FleetVehicleDetailsPanel({ onClose, selectedVehicle, selectedPopupInfo = [], onPopupInfoChange }) {
  const [selectedInfoForPopup, setSelectedInfoForPopup] = useState(new Set(['speed', 'plate', 'routeCode', 'status', 'lastGpsTime', 'odometer']));
  const [activeCategory, setActiveCategory] = useState('live');

  // Her araç için farklı random değerler üret
  const generateVehicleSpecificData = (vehicleId, plate) => {
    const seed = vehicleId ? parseInt(vehicleId.toString().replace(/\D/g, '')) || 1 : 
                 plate ? plate.replace(/\D/g, '').slice(-3) || 123 : 123;
    
    const random = (min, max, precision = 0) => {
      const baseRandom = ((seed * 9301 + 49297) % 233280) / 233280;
      const value = min + (baseRandom * (max - min));
      return precision > 0 ? parseFloat(value.toFixed(precision)) : Math.floor(value);
    };
    
    const routes = [
      { code: '368', name: 'ÜMİT MAH. - BORNOVA METRO' },
      { code: '50010', name: 'İBNİ SİNA GAR' },
      { code: 'T1', name: 'KONAK - ALIAĞA' },
      { code: '401', name: 'KARŞIYAKA - ALSANCAK' },
      { code: '250', name: 'GAZİEMİR - KONAK' },
      { code: '35', name: 'BUCA - KONAK' },
      { code: '52', name: 'ÜÇYOL - ALSANCAK' },
      { code: '105', name: 'BORNOVA - KONAK' }
    ];
    
    const selectedRoute = routes[seed % routes.length];
    
    const drivers = [
      'BURAK KORKMAZ', 'MEHMET YILMAZ', 'AHMET KAYA', 'MUSTAFA ÖZ',
      'VEYSİL EKİN', 'HASAN DEMİR', 'ALİ VURAL', 'EMRE ÖZKAN'
    ];

    return {
      routeCode: selectedRoute.code,
      routeName: selectedRoute.name,
      totalKm: random(400000, 600000, 2),
      totalFuel: random(600000, 800000),
      batteryVolt: random(24, 32, 1),
      engineCoolTemp: random(75, 95),
      fuelTemp: random(40, 60),
      oilTemp: random(80, 110, 2),
      engineSpeed: random(700, 1000),
      fuelRate: random(10, 20),
      gearInfo: random(1, 5),
      tripNo: random(350000, 400000),
      personnelNo: random(20000, 30000),
      driverName: drivers[seed % drivers.length],
      wheelchairAccess: random(0, 100) > 40,
      bikeRack: random(0, 100) > 60,
      pathCode: `${selectedRoute.code}00`,
      startDateTime: '20.08.2025 16:33:19',
      endDateTime: '20.08.2025 17:33:19'
    };
  };

  const vehicleData = selectedVehicle ? generateVehicleSpecificData(selectedVehicle.vehicleId, selectedVehicle.plate) : null;

  const importantInfoOptions = selectedVehicle && vehicleData ? [
    { key: 'speed', label: 'Araç Hızı', value: `${selectedVehicle.speed || 45} km/h`, icon: '⚡' },
    { key: 'plate', label: 'Plaka', value: selectedVehicle.plate, icon: '🏷️' },
    { key: 'routeCode', label: 'Hat No', value: vehicleData.routeCode, icon: '🔢' },
    { key: 'status', label: 'Durum', value: selectedVehicle.status || 'Aktif', icon: '🔵' },
    { key: 'lastGpsTime', label: 'Son GPS', value: selectedVehicle.lastGpsTime || '14:00:25', icon: '⏰' },
    { key: 'odometer', label: 'KM', value: `${vehicleData.totalKm.toLocaleString()} km`, icon: '📊' },
    { key: 'batteryVolt', label: 'Akü', value: `${vehicleData.batteryVolt} V`, icon: '🔋' },
    { key: 'fuelRate', label: 'Yakıt', value: `${vehicleData.fuelRate} L/saat`, icon: '⛽' },
    { key: 'location', label: 'Konum', value: `${selectedVehicle.location?.lat?.toFixed(4) || '38.4192'}, ${selectedVehicle.location?.lng?.toFixed(4) || '27.1287'}`, icon: '📍' },
    { key: 'driverName', label: 'Sürücü', value: vehicleData.driverName, icon: '👨‍✈️' },
    { key: 'routeName', label: 'Rota Adı', value: vehicleData.routeName, icon: '📍' },
    { key: 'samId', label: 'SAM ID', value: selectedVehicle.samId || `SAM${vehicleData.personnelNo}`, icon: '🆔' }
  ] : [];

  // ✅ DÜZELTME: useEffect dependency array'ine selectedInfoForPopup eklendi
  useEffect(() => {
    console.log('🔄 useEffect tetiklendi');
    console.log('  - selectedVehicle:', selectedVehicle?.plate);
    console.log('  - onPopupInfoChange var mı:', !!onPopupInfoChange);
    console.log('  - importantInfoOptions uzunluğu:', importantInfoOptions.length);
    console.log('  - selectedInfoForPopup:', Array.from(selectedInfoForPopup));
    
    if (onPopupInfoChange && selectedVehicle && importantInfoOptions.length > 0) {
      const initialSelectedOptions = importantInfoOptions.filter(option => 
        selectedInfoForPopup.has(option.key)
      );
      console.log('📤 Seçimler Map\'e gönderiliyor:', initialSelectedOptions);
      onPopupInfoChange(initialSelectedOptions);
    } else {
      console.log('❌ useEffect koşulları sağlanmadı');
    }
  }, [selectedVehicle, onPopupInfoChange, selectedInfoForPopup, importantInfoOptions]);

  if (!selectedVehicle) {
    return null;
  }

  const categoryIcons = [
    { key: 'live', icon: 'ℹ️', title: 'Canlı Veriler', color: '#007bff' },
    { key: 'vehicle', icon: '📱', title: 'Araç Bilgileri', color: '#28a745' },
    { key: 'vds', icon: '⚙️', title: 'VDS Verileri', color: '#ffc107' },
    { key: 'avl', icon: '🚌', title: 'AVL Verileri', color: '#007bff' },
    { key: 'driver', icon: '👤', title: 'Şoför Bilgileri', color: '#6f42c1' },
    { key: 'route', icon: '🚏', title: 'Hat ve Rota Bilgileri', color: '#17a2b8' },
    { key: 'accessibility', icon: '♿', title: 'Erişilebilirlik', color: '#e83e8c' }
  ];

  const getCategoryData = (categoryKey) => {
    if (!vehicleData) return [];
    
    switch(categoryKey) {
      case 'live':
        return importantInfoOptions;
      case 'vehicle':
        return [
          { icon: '🆔', label: 'Araç ID', value: selectedVehicle.vehicleId || 'V001' },
          { icon: '🆔', label: 'SAM ID', value: selectedVehicle.samId || `SAM${vehicleData.personnelNo}` },
          { icon: '🏷️', label: 'Plaka', value: selectedVehicle.plate },
          { icon: '⚡', label: 'Hız', value: `${selectedVehicle.speed || 45} km/h` },
          { icon: '📍', label: 'Konum (Enlem)', value: selectedVehicle.location?.lat?.toFixed(6) || '38.419200' },
          { icon: '📍', label: 'Konum (Boylam)', value: selectedVehicle.location?.lng?.toFixed(6) || '27.128700' },
          { icon: '⏰', label: 'Son GPS Zamanı', value: `${selectedVehicle.lastGpsTime || '14:00:25'} (26 saniye önce)` },
          { icon: '🔵', label: 'Durum', value: selectedVehicle.status || 'Aktif' },
          { icon: '📡', label: 'Event', value: 'GPS_Online (0-0)' },
          { icon: '🕒', label: 'UTC TIME', value: new Date().toLocaleTimeString('tr-TR') },
          { icon: '📞', label: 'Contact Status', value: 'On' },
          { icon: '📡', label: 'GPS Status', value: 'On' }
        ];
      case 'vds':
        return [
          { icon: '📊', label: 'Total KM', value: `${vehicleData.totalKm.toLocaleString()} km` },
          { icon: '⛽', label: 'Total Fuel Used', value: `${vehicleData.totalFuel.toLocaleString()} L` },
          { icon: '🔧', label: 'Engine Status', value: '1' },
          { icon: '🔋', label: 'Battery Volt', value: `${vehicleData.batteryVolt} V` },
          { icon: '🌡️', label: 'Engine Cool Temp.', value: `${vehicleData.engineCoolTemp} deg C` },
          { icon: '⛽', label: 'Fuel Temperature', value: `${vehicleData.fuelTemp} deg C` },
          { icon: '🌡️', label: 'Engine Oil Temp.', value: `${vehicleData.oilTemp} deg C` },
          { icon: '⚡', label: 'Engine Speed', value: `${vehicleData.engineSpeed} rpm` },
          { icon: '⛽', label: 'Fuel Rate', value: `${vehicleData.fuelRate} L/saat` },
          { icon: '⚙️', label: 'Gear Info', value: `${vehicleData.gearInfo} gear` }
        ];
      case 'avl':
        return [
          { icon: '🎫', label: 'Trip No', value: vehicleData.tripNo.toString() },
          { icon: '🏷️', label: 'Edge Code', value: 'G01' },
          { icon: '🏢', label: 'Company Adı', value: 'ESHOT' },
          { icon: '📝', label: 'Route Code', value: vehicleData.routeCode },
          { icon: '📍', label: 'Route Name', value: vehicleData.routeName },
          { icon: '🛤️', label: 'Path Code', value: `${vehicleData.pathCode} ${vehicleData.routeName}` },
          { icon: '📅', label: 'Start Date Time', value: vehicleData.startDateTime },
          { icon: '👨‍✈️', label: 'Driver', value: `${vehicleData.personnelNo} ${vehicleData.driverName}` },
          { icon: '🚌', label: 'Bus Duty No', value: '1' }
        ];
      case 'driver':
        return [
          { icon: '🆔', label: 'Personel No', value: vehicleData.personnelNo.toString() },
          { icon: '👤', label: 'Adı Soyadı', value: vehicleData.driverName },
          { icon: '📞', label: 'Telefon', value: '+90 5777332204' }
        ];
      case 'route':
        return [
          { icon: '🔢', label: 'Hat Numarası', value: vehicleData.routeCode },
          { icon: '📍', label: 'Hat Adı', value: vehicleData.routeName },
          { icon: '📝', label: 'Rota Kodu', value: vehicleData.routeCode },
          { icon: '🛤️', label: 'Path Kodu', value: vehicleData.pathCode },
          { icon: '🏢', label: 'Firma', value: 'ESHOT' },
          { icon: '🎫', label: 'Trip No', value: vehicleData.tripNo.toString() }
        ];
      case 'accessibility':
        return [
          { icon: '♿', label: 'Tekerlekli Sandalye', value: vehicleData.wheelchairAccess ? 'Uygun' : 'Uygun Değil', status: vehicleData.wheelchairAccess },
          { icon: '🚲', label: 'Bisiklet Rafı', value: vehicleData.bikeRack ? 'Mevcut' : 'Mevcut Değil', status: vehicleData.bikeRack }
        ];
      default:
        return [];
    }
  };

  // ✅ DÜZELTME: Debug logları eklendi
  const handleInfoToggle = (infoKey) => {
    console.log('🔧 handleInfoToggle çağrıldı, infoKey:', infoKey);
    
    const newSelected = new Set(selectedInfoForPopup);
    if (newSelected.has(infoKey)) {
      newSelected.delete(infoKey);
      console.log('❌ Seçim kaldırıldı:', infoKey);
    } else {
      newSelected.add(infoKey);
      console.log('✅ Seçim eklendi:', infoKey);
    }
    
    console.log('📝 Yeni seçim seti:', Array.from(newSelected));
    setSelectedInfoForPopup(newSelected);
    
    if (onPopupInfoChange) {
      const selectedOptions = importantInfoOptions.filter(option => newSelected.has(option.key));
      console.log('📤 onPopupInfoChange\'e gönderilen veri:', selectedOptions);
      onPopupInfoChange(selectedOptions);
    } else {
      console.log('❌ onPopupInfoChange fonksiyonu yok!');
    }
  };

  const currentData = getCategoryData(activeCategory);

  return (
    <div className="fleet-details-panel">
      <div className="fleet-details-header">
        <div className="header-content">
          <h2>{selectedVehicle.vehicleId || 'V001'} {selectedVehicle.plate}</h2>
          <div className="status-badge online">Çalışıyor</div>
        </div>
        <button onClick={onClose} className="close-button">✕</button>
      </div>

      <div className="category-icons-container">
        {categoryIcons.map(category => (
          <button
            key={category.key}
            className={`category-icon-btn ${activeCategory === category.key ? 'active' : ''}`}
            onClick={() => setActiveCategory(category.key)}
            style={{ borderColor: category.color }}
            title={category.title}
          >
            <span className="icon">{category.icon}</span>
          </button>
        ))}
      </div>

      <div className="fleet-details-content">
        <div className="detail-category">
          <div className="category-header">
            <span className="category-icon">{categoryIcons.find(c => c.key === activeCategory)?.icon}</span>
            <h3>{categoryIcons.find(c => c.key === activeCategory)?.title}</h3>
          </div>
          
          <div className="category-content">
            {activeCategory === 'live' ? (
              <div className="info-selection-grid">
                {currentData.map(option => (
                  <div 
                    key={option.key} 
                    className={`info-selection-item ${selectedInfoForPopup.has(option.key) ? 'selected' : ''}`}
                    onClick={() => handleInfoToggle(option.key)}
                  >
                    <span className="info-icon">{option.icon}</span>
                    <div className="info-details">
                      <div className="info-label">{option.label}</div>
                      <div className="info-value">{option.value}</div>
                    </div>
                    {selectedInfoForPopup.has(option.key) && <span className="check-mark">✓</span>}
                  </div>
                ))}
              </div>
            ) : (
              currentData.map((item, index) => (
                <div key={index} className="detail-row">
                  <span className="detail-icon">{item.icon}</span>
                  <span className="detail-label">{item.label}:</span>
                  <span className="detail-value">
                    {item.value}
                    {item.status !== undefined && (
                      <span className={`status-indicator ${item.status ? 'positive' : 'negative'}`}>
                        {item.status ? '✅' : '❌'}
                      </span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FleetVehicleDetailsPanel;