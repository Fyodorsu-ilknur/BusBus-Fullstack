// frontend/src/components/VehicleList.js
import React, { useState, useEffect } from 'react';
import './VehicleList.css';

function VehicleList({ 
  items, 
  onVehicleClick, 
  selectedVehicle,
  onClose, 
  onSearch, 
  isRouteProgressPanelActive, 
  onToggleRouteProgressPanelActive,
  // YENİ PROP'lar
  selectedRouteIds, // Redux'tan gelen seçili rota ID'leri
  onToggleSelectedRoute, // Redux action'ını çağırmak için
  onClearSelectedRoutes // Tüm rota seçimlerini temizlemek için
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // selectedVehicle değiştiğinde detay panelini aç/kapat
  useEffect(() => {
    if (!selectedVehicle && isRouteProgressPanelActive) {
      onToggleRouteProgressPanelActive(false);
    }
  }, [selectedVehicle, isRouteProgressPanelActive, onToggleRouteProgressPanelActive]);

  const handleSearchChange = (event) => {
    const term = event.target.value;
    setSearchTerm(term);
    onSearch(term);

    if (selectedVehicle) {
      onVehicleClick(null);
    }
  };

  const handleItemClick = (item) => {
    if (!item || !item.route_number) { 
        console.warn("Geçersiz veya eksik item bilgisi alındı:", item);
        return;
    }

    // Eğer tıklanan öğe zaten seçili olan öğe ise seçimi kaldır (kapat)
    if (selectedVehicle?.id === item.id) {
      onVehicleClick(null);
      if (isRouteProgressPanelActive) {
          onToggleRouteProgressPanelActive(false);
      }
    } else {
      onVehicleClick(item);
      if (isRouteProgressPanelActive) {
          onToggleRouteProgressPanelActive(false);
      }
    }
  };

  // Checkbox'a tıklanınca tetiklenecek fonksiyon
  const handleRouteCheckboxChange = (e, routeId) => {
    e.stopPropagation(); // li'nin click olayını engelle
    // e.preventDefault(); // Checkbox'ın varsayılan işaretleme davranışını engelleme
    onToggleSelectedRoute(routeId); // Redux action'ını çağır
  };

  const handleToggleRouteProgress = (e) => {
    e.stopPropagation(); // li'nin click olayını engelle
    e.preventDefault(); // Checkbox'ın varsayılan davranışını engelle
    onToggleRouteProgressPanelActive(); 
  };

  return (
    <div className="vehicle-list-container">
      <div className="list-header">
        <h2>Aktif Araçlar / Arama Sonuçları</h2>
        <button onClick={onClose} className="close-button">X</button>
      </div>
      <input
        type="text"
        placeholder="Hat No veya Hat Adı Giriniz"
        className="search-input"
        value={searchTerm}
        onChange={handleSearchChange}
      />
      <div className="route-selection-controls"> {/* Yeni kontrol div'i */}
        <span className="selected-route-count">
            {selectedRouteIds.length} hat seçili
        </span>
        {selectedRouteIds.length > 0 && (
            <button onClick={onClearSelectedRoutes} className="clear-all-routes-button"> {/* Yeni buton */}
                Tüm Seçili Hatları Temizle
            </button>
        )}
      </div>
      <ul className="list-items">
        {items.length > 0 ? (
          items.map((item) => (
            item && item.route_number ? ( 
              <li
                key={item.id} 
                className={`vehicle-item ${selectedVehicle?.id === item.id ? 'selected' : ''}`}
                onClick={() => handleItemClick(item)} 
              >
                <div className="item-title">
                    <label className="route-checkbox-label" onClick={(e) => e.stopPropagation()}> {/* Label'ı dışa taşıdık */}
                        <input
                            type="checkbox"
                            checked={selectedRouteIds.includes(item.id)} // Redux'tan gelen seçili ID'lere göre
                            onChange={(e) => handleRouteCheckboxChange(e, item.id)} // Yeni handler
                            className="vehicle-list-checkbox"
                        />
                        <span className="checkmark"></span>
                        Otobüs Numarası: <strong>{item.route_number}</strong>
                    </label>
                </div>

                {selectedVehicle?.id === item.id && ( 
                  <div className="item-details">
                    <div>Hat Güzergahı: {item.route_name || 'Bilgi Yok'}</div>
                    <div className="route-progress-checkbox-container">
                        <label className="checkbox-label" onClick={(e) => e.stopPropagation()}> {/* Bu da li click'i engellesin */}
                            <input
                                type="checkbox"
                                checked={isRouteProgressPanelActive} 
                                onChange={handleToggleRouteProgress} 
                                className="route-progress-checkbox"
                            />
                            Güzergah Takip İçin Tıklayın
                        </label>
                    </div>
                  </div>
                )}
              </li>
            ) : null
          ))
        ) : (
          <p className="no-results">Sonuç bulunamadı.</p>
        )}
      </ul>
    </div>
  );
}

export default VehicleList;