// frontend/src/components/FleetVehicleDetailsPanel.js
import React, { useState } from 'react';
import './FleetVehicleDetailsPanel.css';

function FleetVehicleDetailsPanel({ onClose, selectedVehicle, selectedPopupInfo = [], onPopupInfoChange }) {
  const [activeTab, setActiveTab] = useState('general'); // Sekmeler için state

  if (!selectedVehicle) {
    return null;
  }

  // Pop-up için seçilebilir bilgiler
  const popupInfoOptions = [
    { key: 'speed', label: 'Hız', value: `${selectedVehicle.speed} km/h` },
    { key: 'plate', label: 'Plaka', value: selectedVehicle.plate },
    { key: 'routeCode', label: 'Hat No', value: selectedVehicle.routeCode },
    { key: 'routeName', label: 'Rota Adı', value: selectedVehicle.routeName },
    { key: 'driverName', label: 'Sürücü', value: selectedVehicle.driverInfo?.name },
    { key: 'companyAd', label: 'Firma', value: selectedVehicle.companyAd }
  ];

  const handlePopupInfoToggle = (infoKey) => {
    if (!onPopupInfoChange) return;
    
    const newSelection = selectedPopupInfo.includes(infoKey)
      ? selectedPopupInfo.filter(key => key !== infoKey)
      : [...selectedPopupInfo, infoKey];
    
    onPopupInfoChange(newSelection);
  };

  return (
    <div className="fleet-details-panel">
      <div className="fleet-details-header">
        <h2>Araç Detayları: {selectedVehicle.plate}</h2>
        <button onClick={onClose} className="close-button">X</button>
      </div>

      {/* Sekme Navigasyonu */}
      <div className="details-tabs">
        <button 
          className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <span className="tab-icon">ℹ️</span>
          Genel
        </button>
        <button 
          className={`tab-button ${activeTab === 'operational' ? 'active' : ''}`}
          onClick={() => setActiveTab('operational')}
        >
          <span className="tab-icon">🚌</span>
          Operasyonel
        </button>
        <button 
          className={`tab-button ${activeTab === 'driver' ? 'active' : ''}`}
          onClick={() => setActiveTab('driver')}
        >
          <span className="tab-icon">👤</span>
          Sürücü
        </button>
        <button 
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="tab-icon">⚙️</span>
          Ayarlar
        </button>
      </div>

      <div className="fleet-details-content">
        {/* Genel Bilgiler Sekmesi */}
        {activeTab === 'general' && (
          <div className="details-section">
            <h3>Genel Bilgiler</h3>
            <ul className="details-list">
              <li><strong>Araç ID:</strong> {selectedVehicle.vehicleId}</li>
              <li><strong>Plaka:</strong> {selectedVehicle.plate}</li>
              <li><strong>Hız:</strong> {selectedVehicle.speed} km/h</li>
              <li><strong>Konum:</strong> Lat {selectedVehicle.location?.lat?.toFixed(6)}, Lng {selectedVehicle.location?.lng?.toFixed(6)}</li>
              <li><strong>Durum:</strong> {selectedVehicle.status}</li>
              <li><strong>Son GPS Zamanı:</strong> {selectedVehicle.lastGpsTime}</li>
              <li><strong>Kilometre:</strong> {selectedVehicle.odometer?.toLocaleString()} km</li>
              <li><strong>Motor Durumu:</strong> {selectedVehicle.engineStatus}</li>
              <li><strong>Akü Voltajı:</strong> {selectedVehicle.batteryVolt}</li>
              <li><strong>Yakıt Oranı:</strong> {selectedVehicle.fuelRate}</li>
            </ul>
          </div>
        )}

        {/* Operasyonel Bilgiler Sekmesi */}
        {activeTab === 'operational' && (
          <div className="details-section">
            <h3>Operasyonel Bilgiler</h3>
            <ul className="details-list">
              <li><strong>Trip No:</strong> {selectedVehicle.tripNo}</li>
              <li><strong>Firma Adı:</strong> {selectedVehicle.companyAd}</li>
              <li><strong>Rota No:</strong> {selectedVehicle.routeCode}</li>
              <li><strong>Rota Adı:</strong> {selectedVehicle.routeName}</li>
              <li><strong>Path Code:</strong> {selectedVehicle.pathCode}</li>
              <li><strong>Başlangıç Zamanı:</strong> {selectedVehicle.startDateTime}</li>
              <li><strong>Bitiş Zamanı:</strong> {selectedVehicle.endDateTime}</li>
              <li><strong>Aktif Çiftleştirme:</strong> {selectedVehicle.activeCouple}</li>
              <li><strong>SAM ID:</strong> {selectedVehicle.samId}</li>
            </ul>
          </div>
        )}

        {/* Sürücü Bilgileri Sekmesi */}
        {activeTab === 'driver' && (
          <div className="details-section">
            <h3>Sürücü Bilgileri</h3>
            <ul className="details-list">
              <li><strong>Personel No:</strong> {selectedVehicle.driverInfo?.personnelNo}</li>
              <li><strong>Adı Soyadı:</strong> {selectedVehicle.driverInfo?.name}</li>
              <li><strong>Telefon No:</strong> +90 XXX XXX XX XX</li>
            </ul>
          </div>
        )}

        {/* Ayarlar Sekmesi */}
        {activeTab === 'settings' && (
          <div className="details-section">
            <h3>Pop-up Bilgi Ayarları</h3>
            <p className="settings-description">
              Harita üzerinde gösterilecek bilgileri seçin:
            </p>
            <div className="popup-settings">
              {popupInfoOptions.map(option => (
                <label key={option.key} className="setting-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedPopupInfo.includes(option.key)}
                    onChange={() => handlePopupInfoToggle(option.key)}
                  />
                  <span className="checkmark"></span>
                  {option.label}: {option.value}
                </label>
              ))}
            </div>
            <div className="settings-actions">
              <button 
                className="btn-secondary"
                onClick={() => onPopupInfoChange && onPopupInfoChange([])}
              >
                Tümünü Temizle
              </button>
              <button 
                className="btn-primary"
                onClick={() => onPopupInfoChange && onPopupInfoChange(popupInfoOptions.map(opt => opt.key))}
              >
                Tümünü Seç
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FleetVehicleDetailsPanel;