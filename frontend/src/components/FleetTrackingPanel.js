// frontend/src/components/FleetTrackingPanel.js
import React, { useState } from 'react'; // useState import edildi, arama için kullanılabilir
import './FleetTrackingPanel.css';

// vehicles ve onVehicleSelect'e ek olarak selectedVehicles prop'unu alıyoruz
function FleetTrackingPanel({ onClose, vehicles = [], onVehicleSelect, selectedVehicles = [] }) {
  // Arama için lokal state
  const [searchTerm, setSearchTerm] = useState(''); 

  const filteredVehicles = vehicles.filter(vehicle =>
    (vehicle.plate && vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (vehicle.vehicleId && String(vehicle.vehicleId).toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} // Arama inputu işlevsel hale getirildi
        />
        <div className="fleet-filters">
          {/* Filtre butonları buraya gelecek */}
          <p style={{fontSize: '0.75rem', color: 'var(--secondary-text-color)', margin: '5px 0'}}>Filtreler burada olacak</p>
        </div>
      </div>
      <div className="fleet-tracking-content">
        {filteredVehicles.length > 0 ? (
          <ul className="vehicle-tracking-list">
            {filteredVehicles.map(vehicle => (
              <li
                key={vehicle.id}
                className={`vehicle-tracking-item ${selectedVehicles.some(v => v.id === vehicle.id) ? 'selected' : ''}`}
                // Tıklama olayını ana öğeye bırakıyoruz, checkbox ile de aynı fonksiyon çağrılıyor
                onClick={() => onVehicleSelect(vehicle)} 
              >
                <div className="vehicle-item-left"> {/* Yeni bir div ekledik */}
                    <input
                        type="checkbox"
                        checked={selectedVehicles.some(v => v.id === vehicle.id)}
                        onChange={() => onVehicleSelect(vehicle)} // Checkbox'a tıklayınca da seçimi toggle et
                        onClick={(e) => e.stopPropagation()} // Olayın ana li'ye yayılmasını engelle
                    />
                </div>
                <div className="vehicle-compact-info"> 
                  <strong>Araç ID: {vehicle.vehicleId}</strong>
                  <span>Plaka: {vehicle.plate}</span>
                  {/* YENİ EKLENDİ (Adım 2.2): Araç Durumu */}
                  {vehicle.status && (
                    <span className={`vehicle-status ${vehicle.status.toLowerCase().replace(/[\s\/]/g, '-')}`}>
                      Durum: {vehicle.status}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-results">Araç verileri yükleniyor veya bulunamadı...</p>
        )}
      </div>
    </div>
  );
}

export default FleetTrackingPanel;