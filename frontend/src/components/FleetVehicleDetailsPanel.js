// frontend/src/components/FleetVehicleDetaigti alsPanel.js
import React, { useState, useEffect, useCallback } from 'react';
import './FleetVehicleDetailsPanel.css';

function FleetVehicleDetailsPanel({ onClose, selectedVehicle, selectedPopupInfo = [], onPopupInfoChange }) {
  const [selectedInfoForPopup, setSelectedInfoForPopup] = useState(() => 
    new Set(selectedPopupInfo.map(info => info.key))
  );
  const [activeCategory, setActiveCategory] = useState('live');

  const generateVehicleSpecificData = (vehicleId, plate) => {
    const validVehicleId = vehicleId || '0';
    const validPlate = plate || '000';
    
    const seed = parseInt(validVehicleId.toString().replace(/\D/g, '') || (validPlate.replace(/\D/g, '') || '1')) || 1;
    
    const random = (min, max, precision = 0) => {
      const pseudoRandom = ((seed * 9301 + 49297) % 233280) / 233280.0;
      const value = min + (pseudoRandom * (max - min));
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
    { key: 'speed', label: 'Araç Hızı', value: `${selectedVehicle.speed || 0} km/h`, icon: '⚡' },
    { key: 'plate', label: 'Plaka', value: selectedVehicle.plate || 'Bilinmiyor', icon: '🏷️' },
    { key: 'routeCode', label: 'Hat No', value: vehicleData.routeCode || 'Bilinmiyor', icon: '🔢' },
    { key: 'status', label: 'Durum', value: selectedVehicle.status || 'Bilinmiyor', icon: '🔵' },
    { key: 'lastGpsTime', label: 'Son GPS', value: selectedVehicle.lastGpsTime || 'Bilinmiyor', icon: '⏰' },
    { key: 'odometer', label: 'KM', value: `${(vehicleData.totalKm || 0).toLocaleString()} km`, icon: '📊' },
    { key: 'batteryVolt', label: 'Akü', value: `${vehicleData.batteryVolt || 0} V`, icon: '🔋' },
    { key: 'fuelRate', label: 'Yakıt', value: `${vehicleData.fuelRate || 0} L/saat`, icon: '⛽' },
    { key: 'location', label: 'Konum', value: `${selectedVehicle.location?.lat?.toFixed(4) || 'N/A'}, ${selectedVehicle.location?.lng?.toFixed(4) || 'N/A'}`, icon: '📍' },
    { key: 'driverName', label: 'Sürücü', value: vehicleData.driverName || 'Bilinmiyor', icon: '👨‍✈️' },
    { key: 'routeName', label: 'Rota Adı', value: vehicleData.routeName || 'Bilinmiyor', icon: '📍' },
    { key: 'samId', label: 'SAM ID', value: selectedVehicle.samId || `SAM${vehicleData.personnelNo || '0000000'}`, icon: '🆔' }
  ] : [];

  useEffect(() => {
    setSelectedInfoForPopup(new Set(selectedPopupInfo.map(info => info.key)));
  }, [selectedPopupInfo]);


  useEffect(() => {
    if (!onPopupInfoChange) {
      return;
    }

    if (!selectedVehicle) {
        onPopupInfoChange([]);
        return;
    }

    const updatedSelectedOptions = importantInfoOptions.filter(option => 
      selectedInfoForPopup.has(option.key)
    );
    onPopupInfoChange(updatedSelectedOptions);

  }, [selectedVehicle, onPopupInfoChange, selectedInfoForPopup, importantInfoOptions]);

  const handleInfoToggle = useCallback((infoKey) => {
    setSelectedInfoForPopup(prevKeys => {
      const newKeys = new Set(prevKeys);
      if (newKeys.has(infoKey)) {
        newKeys.delete(infoKey);
      } else {
        newKeys.add(infoKey);
      }
      return newKeys;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allKeys = new Set(importantInfoOptions.map(option => option.key));
    setSelectedInfoForPopup(allKeys);
  }, [importantInfoOptions]);

  const handleClearAll = useCallback(() => {
    setSelectedInfoForPopup(new Set());
  }, []);

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
          { icon: '🆔', label: 'Araç ID', value: selectedVehicle.vehicleId || 'N/A' },
          { icon: '🆔', label: 'SAM ID', value: selectedVehicle.samId || `SAM${vehicleData.personnelNo || 'N/A'}` },
          { icon: '🏷️', label: 'Plaka', value: selectedVehicle.plate || 'N/A' },
          { icon: '⚡', label: 'Hız', value: `${selectedVehicle.speed || 0} km/h` },
          { icon: '📍', label: 'Konum (Enlem)', value: selectedVehicle.location?.lat?.toFixed(6) || 'N/A' },
          { icon: '📍', label: 'Konum (Boylam)', value: selectedVehicle.location?.lng?.toFixed(6) || 'N/A' },
          { icon: '⏰', label: 'Son GPS Zamanı', value: `${selectedVehicle.lastGpsTime || 'N/A'} (26 saniye önce)` },
          { icon: '🔵', label: 'Durum', value: selectedVehicle.status || 'N/A' },
          { icon: '📡', label: 'Event', value: 'GPS_Online (0-0)' },
          { icon: '🕒', label: 'UTC TIME', value: new Date().toLocaleTimeString('tr-TR') },
          { icon: '📞', label: 'Contact Status', value: 'On' },
          { icon: '📡', label: 'GPS Status', value: 'On' }
        ];
      case 'vds':
        return [
          { icon: '📊', label: 'Total KM', value: `${(vehicleData.totalKm || 0).toLocaleString()} km` },
          { icon: '⛽', label: 'Total Fuel Used', value: `${(vehicleData.totalFuel || 0).toLocaleString()} L` },
          { icon: '🔧', label: 'Engine Status', value: '1' },
          { icon: '🔋', label: 'Battery Volt', value: `${vehicleData.batteryVolt || 0} V` },
          { icon: '🌡️', label: 'Engine Cool Temp.', value: `${vehicleData.engineCoolTemp || 0} deg C` },
          { icon: '⛽', label: 'Fuel Temperature', value: `${vehicleData.fuelTemp || 0} deg C` },
          { icon: '🌡️', label: 'Engine Oil Temp.', value: `${vehicleData.oilTemp || 0} deg C` },
          { icon: '⚡', label: 'Engine Speed', value: `${vehicleData.engineSpeed || 0} rpm` },
          { icon: '⛽', label: 'Fuel Rate', value: `${vehicleData.fuelRate || 0} L/saat` },
          { icon: '⚙️', label: 'Gear Info', value: `${vehicleData.gearInfo || 0} gear` }
        ];
      case 'avl':
        return [
          { icon: '🎫', label: 'Trip No', value: (vehicleData.tripNo || 0).toString() },
          { icon: '🏷️', label: 'Edge Code', value: 'G01' },
          { icon: '🏢', label: 'Company Adı', value: 'ESHOT' },
          { icon: '📝', label: 'Route Code', value: vehicleData.routeCode || 'N/A' },
          { icon: '📍', label: 'Route Name', value: vehicleData.routeName || 'N/A' },
          { icon: '🛤️', label: 'Path Code', value: `${vehicleData.pathCode || 'N/A'} ${vehicleData.routeName || 'N/A'}` },
          { icon: '📅', label: 'Start Date Time', value: vehicleData.startDateTime || 'N/A' },
          { icon: '👨‍✈️', label: 'Driver', value: `${vehicleData.personnelNo || 'N/A'} ${vehicleData.driverName || 'N/A'}` },
          { icon: '🚌', label: 'Bus Duty No', value: '1' }
        ];
      case 'driver':
        return [
          { icon: '🆔', label: 'Personel No', value: (vehicleData.personnelNo || 0).toString() },
          { icon: '👤', label: 'Adı Soyadı', value: vehicleData.driverName || 'N/A' },
          { icon: '📞', label: 'Telefon', value: '+90 5777332204' }
        ];
      case 'route':
        return [
          { icon: '🔢', label: 'Hat Numarası', value: vehicleData.routeCode || 'N/A' },
          { icon: '📍', label: 'Hat Adı', value: vehicleData.routeName || 'N/A' },
          { icon: '📝', label: 'Rota Kodu', value: vehicleData.routeCode || 'N/A' },
          { icon: '🛤️', label: 'Path Kodu', value: vehicleData.pathCode || 'N/A' },
          { icon: '🏢', label: 'Firma', value: 'ESHOT' },
          { icon: '🎫', label: 'Trip No', value: (vehicleData.tripNo || 0).toString() }
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

  const currentData = getCategoryData(activeCategory);

  return (
    <div className="fleet-details-panel">
      <div className="fleet-details-header">
        <div className="header-content">
          <h2>{selectedVehicle.vehicleId || 'V001'} {selectedVehicle.plate || 'Bilinmiyor'}</h2>
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
              <>
                <p className="description">Harita üzerindeki araç pop-up'larında görünmesini istediğiniz verileri seçin.</p>
                <div className="action-buttons">
                  <button className="action-button" onClick={handleSelectAll}>Tümünü Seç</button>
                  <button className="action-button" onClick={handleClearAll}>Seçimi Temizle</button>
                </div>
                <div className="info-selection-grid">
                  {importantInfoOptions.map(option => (
                    <div 
                      key={option.key} 
                      className={`info-selection-item ${selectedInfoForPopup.has(option.key) ? 'selected' : ''}`}
                      onClick={() => handleInfoToggle(option.key)}
                    >
                      <div className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={selectedInfoForPopup.has(option.key)}
                          // ✅ DÜZELTİLDİ: 'readOnly' prop'u yerine CSS ile pointer-events: none; kullanacağız
                          // onChange kaldırıldı
                        />
                        <span className="slider round"></span>
                      </div>
                      <span className="info-icon">{option.icon}</span>
                      <span className="info-label">{option.label}</span>
                    </div>
                  ))}
                </div>
              </>
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