// frontend/src/components/FilteredVehiclesPanel.js
import React from "react";
import "./FilteredVehiclesPanel.css";

function FilteredVehiclesPanel({ 
  filteredVehicles = [], 
  isOpen = false, 
  onClose,
  onVehicleSelect,
  theme = 'light'
}) {
  if (!isOpen) return null;

  return (
    <div className={`filtered-vehicles-panel ${theme}`}>
      <div className="filtered-vehicles-header">
        <h3>Filtrelenmiş Araçlar</h3>
        <div className="header-info">
          <span className="result-count">{filteredVehicles.length} araç</span>
          <button onClick={onClose} className="close-button">×</button>
        </div>
      </div>

      <div className="filtered-vehicles-content">
        {filteredVehicles.length > 0 ? (
          <div className="vehicles-list">
            {filteredVehicles.map((vehicle) => (
              <div key={vehicle.id} 
                className="vehicle-item"
                onClick={() => onVehicleSelect && onVehicleSelect(vehicle)}
              >
                <div className="vehicle-single-row">
                  <span className="vehicle-id">#{vehicle.id}</span>
                  <span className="vehicle-plate">{vehicle.plate || 'Bilinmeyen'}</span>
                  <span className={`status-dot ${vehicle.status?.toLowerCase().replace(' ', '-') || 'aktif'}`}></span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-vehicles">
            <div className="no-vehicles-icon">🚌</div>
            <div className="no-vehicles-text">
              <h4>Araç bulunamadı</h4>
              <p>Seçili filtrelere uygun araç yok.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FilteredVehiclesPanel;