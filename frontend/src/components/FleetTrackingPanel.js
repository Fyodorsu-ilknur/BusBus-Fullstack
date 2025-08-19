// frontend/src/components/FleetTrackingPanel.js
import React from 'react';
import './FleetTrackingPanel.css';

// vehicles prop'unu alıyoruz
function FleetTrackingPanel({ onClose, vehicles = [] , onVehicleSelect }) {
  return (
    <div className="fleet-tracking-panel">
      <div className="fleet-tracking-header">
                <h2>Filo Takip</h2>

        <button onClick={onClose} className="close-button">X</button>
      </div>
      <div className="fleet-tracking-controls"> 
        <input
          type="text"
          placeholder="Araç ID veya Plaka Giriniz"
          className="fleet-search-input"
          // Burada search state'i ve handleSearch fonksiyonu olacak
        />
        <div className="fleet-filters">
          {/* Filtre butonları buraya gelecek */}
          <p style={{fontSize: '0.75rem', color: 'var(--secondary-text-color)', margin: '5px 0'}}>Filtreler burada olacak</p>
        </div>
      </div>
      <div className="fleet-tracking-content">
        {vehicles.length > 0 ? (
          <ul className="vehicle-tracking-list">
            {vehicles.map(vehicle => (
              <li
                key={vehicle.id}
                className="vehicle-tracking-item"
                onClick={() => onVehicleSelect(vehicle)} // Bu tıklamada aracı seç
              >
                <div className="vehicle-compact-info"> 
                  <strong>Araç ID: {vehicle.vehicleId}</strong>
                  <span>Plaka: {vehicle.plate}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-results">Araç verileri yükleniyor...</p>
        )}
      </div>
    </div>
  );
}

export default FleetTrackingPanel;