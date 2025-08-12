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
  selectedRouteIds, 
  onToggleSelectedRoute, 
  onClearSelectedRoutes, 
  onSelectAllRoutes,
  selectedRoute, // Animsyonlu güzrgah tekli rota
  currentDirection, 
  onToggleDirection, // Yön değiştirmek için geen callback
  theme 
}) {
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleRouteCheckboxChange = (e, routeId) => {
    e.stopPropagation(); 
    onToggleSelectedRoute(routeId);
  };

  const handleToggleRouteProgress = (e) => {
    e.stopPropagation(); 
    onToggleRouteProgressPanelActive();
  };

  const handleToggleDirectionClick = (e) => {
    e.stopPropagation(); 
    if (onToggleDirection) {
        onToggleDirection();
    }
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
      <div className="route-selection-controls">
        <span className="selected-route-count">
            {selectedRouteIds.length} hat seçili
        </span>
        {selectedRouteIds.length < items.length && items.length > 0 && (
            <button onClick={onSelectAllRoutes} className="control-button select-all-routes-button">
                Tümünü Seç
            </button>
        )}
        {selectedRouteIds.length > 0 && (
            <button onClick={onClearSelectedRoutes} className="control-button clear-all-routes-button">
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
                <div className="item-title" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                        <label className="route-checkbox-label" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <input
                                type="checkbox"
                                checked={selectedRouteIds.includes(item.id)}
                                onChange={(e) => handleRouteCheckboxChange(e, item.id)}
                                className="vehicle-list-checkbox"
                            />
                            <div className="route-summary-text">
                                <strong>Hat No: {item.route_number}</strong>
                                {item.route_name && <span className="route-name-short"> ({item.route_name})</span>}
                                <br />
                                <span className="route-points-display">{item.start_point} &rarr; {item.end_point}</span>
                            </div>
                        </label>
                    </div>
                    <button className="expand-toggle-button" onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}>
                        <span
                            className="material-icons"
                            style={{ color: theme === 'dark' ? '#f0f0f0' : '#a79e9eff' }}
                        >
                            {selectedVehicle?.id === item.id ? 'expand_less' : 'expand_more'}
                        </span>
                    </button>
                </div>


                {selectedVehicle?.id === item.id && (
                  <div className="item-details">
                    <div className="route-progress-checkbox-container">
                        <label className="checkbox-label" onClick={(e) => e.stopPropagation()}>
                            <input
                                type="checkbox"
                                checked={isRouteProgressPanelActive}
                                onChange={handleToggleRouteProgress}
                                className="route-progress-checkbox"
                            />
                            <span className="route-progress-text">Güzergah Takip İçin Tıklayın</span>
                        </label>
                    </div>
                    {/* GidişDönüş Butonu */}
                    {selectedRoute?.id === item.id && selectedRoute?.directions?.['2']?.length > 0 &&  (
                        <div className="direction-toggle-container">
                            <button
                                className="direction-button control-button"
                                onClick={handleToggleDirectionClick}
                            >
                                Yön: {currentDirection === '1' ? 'Gidiş' : 'Dönüş'}
                            </button>
                        </div>
                    )}
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