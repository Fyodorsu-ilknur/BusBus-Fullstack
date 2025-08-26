// frontend/src/components/SettingsPanel.js
import React, { useState, useEffect, useCallback } from 'react';
import './SettingsPanel.css'; // Yeni bir CSS dosyası oluşturulacak

function SettingsPanel({ onClose, selectedPopupInfo = [], onPopupInfoChange }) {
  // `selectedPopupInfo` prop'u, App.js'teki global pop-up seçimlerini temsil eder.
  // Bu paneller arası senkronizasyon için kullanılır.
  const [localSelectedInfoKeys, setLocalSelectedInfoKeys] = useState(() => 
    new Set(selectedPopupInfo.map(info => info.key))
  );

  // Mevcut tüm olası pop-up seçenekleri (FleetVehicleDetailsPanel'den kopyalandı)
  // Bu liste, kullanıcının seçebileceği tüm verileri temsil eder.
  const allPopupOptions = [
    { key: 'speed', label: 'Araç Hızı', value: '45 km/h', icon: '⚡' },
    { key: 'plate', label: 'Plaka', value: '35 XYZ 123', icon: '🏷️' },
    { key: 'routeCode', label: 'Hat No', value: 'T1', icon: '🔢' },
    { key: 'status', label: 'Durum', value: 'Aktif', icon: '🔵' },
    { key: 'lastGpsTime', label: 'Son GPS', value: '14:00:25', icon: '⏰' },
    { key: 'odometer', label: 'KM', value: '100.000 km', icon: '📊' },
    { key: 'batteryVolt', label: 'Akü', value: '28 V', icon: '🔋' },
    { key: 'fuelRate', label: 'Yakıt', value: '15 L/saat', icon: '⛽' },
    { key: 'location', label: 'Konum', value: '38.4192, 27.1287', icon: '📍' },
    { key: 'driverName', label: 'Sürücü', value: 'Mehmet Yılmaz', icon: '👨‍✈️' },
    { key: 'routeName', label: 'Rota Adı', value: 'İBNİ SİNA GAR', icon: '📍' },
    { key: 'samId', label: 'SAM ID', value: 'SAM1234567', icon: '🆔' }
  ];

  // `selectedPopupInfo` prop'u değiştiğinde (örneğin App.js'ten),
  // lokal state'i de güncelle. Bu, farklı paneller arası senkronizasyon sağlar.
  useEffect(() => {
    setLocalSelectedInfoKeys(new Set(selectedPopupInfo.map(info => info.key)));
  }, [selectedPopupInfo]);

  // Tümünü Seç
  const handleSelectAll = useCallback(() => {
    const allKeys = new Set(allPopupOptions.map(option => option.key));
    setLocalSelectedInfoKeys(allKeys);
    // App.js'e güncel listeyi gönder
    if (onPopupInfoChange) {
      onPopupInfoChange(allPopupOptions);
    }
  }, [allPopupOptions, onPopupInfoChange]);

  // Seçimi Temizle
  const handleClearAll = useCallback(() => {
    setLocalSelectedInfoKeys(new Set());
    // App.js'e boş listeyi gönder
    if (onPopupInfoChange) {
      onPopupInfoChange([]);
    }
  }, [onPopupInfoChange]);

  // Tek bir bilgi öğesinin seçilme durumunu değiştirme
  const handleToggleInfo = useCallback((infoKey) => {
    setLocalSelectedInfoKeys(prevKeys => {
      const newKeys = new Set(prevKeys);
      if (newKeys.has(infoKey)) {
        newKeys.delete(infoKey);
      } else {
        newKeys.add(infoKey);
      }

      // App.js'e güncel seçili bilgileri gönder
      if (onPopupInfoChange) {
        const updatedSelectedInfo = allPopupOptions.filter(option => newKeys.has(option.key));
        onPopupInfoChange(updatedSelectedInfo);
      }
      return newKeys;
    });
  }, [allPopupOptions, onPopupInfoChange]);


  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Ayarlar</h2>
        <button onClick={onClose} className="close-button">X</button>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h3>Canlı Veriler (Harita Pop-up)</h3>
          <p className="description">Harita üzerindeki araç pop-up'larında görünmesini istediğiniz verileri seçin.</p>
          
          <div className="action-buttons">
            <button className="action-button" onClick={handleSelectAll}>Tümünü Seç</button>
            <button className="action-button" onClick={handleClearAll}>Seçimi Temizle</button>
          </div>

          <div className="data-selection-grid">
            {allPopupOptions.map(option => (
              <div 
                key={option.key} 
                className={`data-selection-item ${localSelectedInfoKeys.has(option.key) ? 'selected' : ''}`}
                onClick={() => handleToggleInfo(option.key)}
              >
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={localSelectedInfoKeys.has(option.key)}
                    onChange={() => handleToggleInfo(option.key)} // Gerekirse ek bir onChange event'i
                  />
                  <span className="slider round"></span>
                </div>
                <span className="data-icon">{option.icon}</span>
                <span className="data-label">{option.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;