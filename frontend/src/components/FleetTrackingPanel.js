// frontend/src/components/FleetTrackingPanel.js
import React, { useState } from 'react';
import './FleetTrackingPanel.css';

function FleetTrackingPanel({ onClose, vehicles = [], onVehicleSelect, selectedVehicles = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // Durum filtresi

  // Durum renk kodları (küçük renkli top için)
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'aktif/çalışıyor':
      case 'aktif':
        return '#28a745'; // Yeşil
      case 'bakımda':
        return '#dc3545'; // Kırmızı  
      case 'servis dışı':
        return '#6c757d'; // Gri
      default:
        return '#ffc107'; // Sarı (bilinmeyen durumlar için)
    }
  };

  // YENİ: Tümünü seç fonksiyonu
  const handleSelectAll = () => {
    const filteredList = filteredVehicles;
    filteredList.forEach(vehicle => {
      if (!selectedVehicles.some(v => v.id === vehicle.id)) {
        onVehicleSelect(vehicle);
      }
    });
  };

  // YENİ: Tümünü temizle fonksiyonu
  const handleClearAll = () => {
    selectedVehicles.forEach(vehicle => {
      onVehicleSelect(vehicle); // Toggle fonksiyonu olduğu için tekrar çağırarak seçimi kaldırır
    });
  };

  // Filtreleme mantığı
  const filteredVehicles = vehicles.filter(vehicle => {
    // Arama filtresi
    const matchesSearch = (vehicle.plate && vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vehicle.vehicleId && String(vehicle.vehicleId).toLowerCase().includes(searchTerm.toLowerCase()));

    // Durum filtresi  
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'aktif' && vehicle.status?.toLowerCase().includes('aktif')) ||
      (statusFilter === 'bakimda' && vehicle.status?.toLowerCase().includes('bakımda')) ||
      (statusFilter === 'servis-disi' && vehicle.status?.toLowerCase().includes('servis dışı'));

    return matchesSearch && matchesStatus;
  });

  // Durum sayıları
  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter(v => v.status?.toLowerCase().includes('aktif')).length;
  const maintenanceVehicles = vehicles.filter(v => v.status?.toLowerCase().includes('bakımda')).length;
  const outOfServiceVehicles = vehicles.filter(v => v.status?.toLowerCase().includes('servis dışı')).length;

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
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        {/* YENİ: Seçim Butonları */}
        <div className="fleet-selection-buttons">
          <button 
            className="selection-btn"
            onClick={handleSelectAll}
            disabled={filteredVehicles.length === 0}
          >
            Tümünü Seç ({filteredVehicles.length})
          </button>
          <button 
            className="selection-btn"
            onClick={handleClearAll}
            disabled={selectedVehicles.length === 0}
          >
            Seçimi Temizle ({selectedVehicles.length})
          </button>
        </div>
        
        {/* Durum Filtreleri */}
        <div className="fleet-filters">
          <button 
            className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Tümü ({totalVehicles})
          </button>
          <button 
            className={`filter-btn aktif ${statusFilter === 'aktif' ? 'active' : ''}`}
            onClick={() => setStatusFilter('aktif')}
          >
            <span className="status-dot" style={{backgroundColor: '#28a745'}}></span>
            Aktif ({activeVehicles})
          </button>
          <button 
            className={`filter-btn bakimda ${statusFilter === 'bakimda' ? 'active' : ''}`}
            onClick={() => setStatusFilter('bakimda')}
          >
            <span className="status-dot" style={{backgroundColor: '#dc3545'}}></span>
            Bakımda ({maintenanceVehicles})
          </button>
          <button 
            className={`filter-btn servis-disi ${statusFilter === 'servis-disi' ? 'active' : ''}`}
            onClick={() => setStatusFilter('servis-disi')}
          >
            <span className="status-dot" style={{backgroundColor: '#6c757d'}}></span>
            Servis Dışı ({outOfServiceVehicles})
          </button>
        </div>
        
        {/* Özet Bilgiler */}
        <div className="fleet-summary">
        </div>
      </div>

      <div className="fleet-tracking-content">
        {filteredVehicles.length > 0 ? (
          <>
            {/* Tablo Başlığı */}
            <div className="vehicle-tracking-header-row">
              <div className="vehicle-item-left"></div>
              <div className="vehicle-compact-info">
                <div className="vehicle-main-info">
                  <span className="vehicle-header">Araç ID</span>
                  &nbsp;
                  <span className="vehicle-header">Plaka</span>
                  <span className="vehicle-header">Hat No</span>
                </div>
                <div className="vehicle-status-indicator">
                  <span className="vehicle-header">Durum</span>
                </div>
              </div>
            </div>

            {/* Araç Listesi */}
            <ul className="vehicle-tracking-list">
              {filteredVehicles.map(vehicle => (
                <li
                  key={vehicle.id}
                  className={`vehicle-tracking-item ${selectedVehicles.some(v => v.id === vehicle.id) ? 'selected' : ''}`}
                  onClick={() => onVehicleSelect(vehicle)} 
                >
                  <div className="vehicle-item-left">
                    <input
                      type="checkbox"
                      checked={selectedVehicles.some(v => v.id === vehicle.id)}
                      onChange={() => onVehicleSelect(vehicle)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  <div className="vehicle-compact-info"> 
                    <div className="vehicle-main-info">
                      <span className="vehicle-id-display">{vehicle.vehicleId}</span>
                      <span className="vehicle-plate-display">{vehicle.plate}</span>
                      <span className="vehicle-route-code">{vehicle.routeCode}</span>
                    </div>
                    <div className="vehicle-status-indicator">
                      <span 
                        className="status-dot-large" 
                        style={{backgroundColor: getStatusColor(vehicle.status)}}
                        title={vehicle.status}
                      ></span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="no-results">
            {searchTerm || statusFilter !== 'all' ? 
              'Filtreye uygun araç bulunamadı.' : 
              'Araç verileri yükleniyor veya bulunamadı...'
            }
          </p>
        )}
      </div>
    </div>
  );
}

export default FleetTrackingPanel;
