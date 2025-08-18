// frontend/src/components/FleetTrackingPanel.js
import React from 'react';
import './FleetTrackingPanel.css';

// vehicles prop'unu alıyoruz
function FleetTrackingPanel({ onClose, vehicles = [] }) {
  return (
    <div className="fleet-tracking-panel">
      <div className="fleet-tracking-header">
        <h2>Filo Takip</h2>
        <button onClick={onClose} className="close-button">X</button>
      </div>
      <div className="fleet-tracking-content">
        {vehicles.length > 0 ? (
          <ul className="vehicle-tracking-list">
            {vehicles.map(vehicle => (
              <li key={vehicle.id} className="vehicle-tracking-item">
                <div className="vehicle-main-info">
                  <strong>Araç ID: {vehicle.vehicleId}</strong>
                  <span>Plaka: {vehicle.plate}</span>
                  <span>Hız: {vehicle.speed} km/h</span>
                </div>
                <div className="vehicle-location-info">
                  <span>Konum: Lat {vehicle.location.lat.toFixed(4)}, Lng {vehicle.location.lng.toFixed(4)}</span>
                  <span>Son GPS: {vehicle.lastGpsTime}</span>
                </div>
                <div className="vehicle-status-info">
                  <span>Durum: {vehicle.engineStatus}</span>
                  <span>KM: {vehicle.odometer}</span>
                </div>
                {/* Daha fazla detayı buraya ekleyebiliriz */}
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-results">Araç verileri yükleniyor veya bulunamadı.</p>
        )}
      </div>
    </div>
  );
}

export default FleetTrackingPanel;