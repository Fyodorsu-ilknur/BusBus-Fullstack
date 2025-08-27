// frontend/src/components/FleetFiltersPanel.js
import React, { useState, useEffect, useMemo } from 'react';
import './FleetFiltersPanel.css';

function FleetFiltersPanel({ 
  isOpen, 
  onClose, 
  vehicles = [], // Filo takip panelinden gelecek tüm araç verileri
  onFilteredVehiclesChange, // Filtrelenmiş araçları parent'a gönder
  theme 
}) {
  // Filtre state'leri
  const [filters, setFilters] = useState({
    // Motor sıcaklığı aralığı
    motorTempMin: '',
    motorTempMax: '',
    
    // Hız aralığı
    speedMin: '',
    speedMax: '',
    
    // Yakıt seviyesi aralığı
    fuelMin: '',
    fuelMax: '',
    
    // Araç yaşı aralığı
    vehicleAgeMin: '',
    vehicleAgeMax: '',
    
    // Kilometre aralığı
    mileageMin: '',
    mileageMax: '',
    
    // Durum filtreleri
    status: {
      aktif: true,
      bakimda: true,
      'servis-disi': true
    },
    
    // Özel gereksinimler
    wheelchairAccessible: false, // Tekerlekli sandalye uygunluğu
    airConditioning: false, // Klima
    wifiEnabled: false, // WiFi
    
    // Hat filtreleri
    routeNumbers: '', // Virgülle ayrılmış hat numaraları
    
    // Araç tipi
    vehicleType: 'all', // 'all', 'standard', 'articulated', 'electric'
    
    // Kapasite aralığı
    capacityMin: '',
    capacityMax: '',
    
    // Son bakım tarihi (gün olarak)
    lastMaintenanceDays: '',
    
    // Yakıt tipi
    fuelType: 'all' // 'all', 'diesel', 'electric', 'hybrid', 'cng'
  });

  // Filtrelenmiş araçları hesapla
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      // Motor sıcaklığı filtresi
      if (filters.motorTempMin && vehicle.motorTemp < parseFloat(filters.motorTempMin)) return false;
      if (filters.motorTempMax && vehicle.motorTemp > parseFloat(filters.motorTempMax)) return false;
      
      // Hız filtresi
      if (filters.speedMin && vehicle.speed < parseFloat(filters.speedMin)) return false;
      if (filters.speedMax && vehicle.speed > parseFloat(filters.speedMax)) return false;
      
      // Yakıt seviyesi filtresi
      if (filters.fuelMin && vehicle.fuelLevel < parseFloat(filters.fuelMin)) return false;
      if (filters.fuelMax && vehicle.fuelLevel > parseFloat(filters.fuelMax)) return false;
      
      // Araç yaşı filtresi
      if (filters.vehicleAgeMin && vehicle.age < parseInt(filters.vehicleAgeMin)) return false;
      if (filters.vehicleAgeMax && vehicle.age > parseInt(filters.vehicleAgeMax)) return false;
      
      // Kilometre filtresi
      if (filters.mileageMin && vehicle.mileage < parseInt(filters.mileageMin)) return false;
      if (filters.mileageMax && vehicle.mileage > parseInt(filters.mileageMax)) return false;
      
      // Durum filtresi
      const vehicleStatus = vehicle.status?.toLowerCase().replace(' ', '-') || 'aktif';
      if (!filters.status[vehicleStatus]) return false;
      
      // Tekerlekli sandalye uygunluğu
      if (filters.wheelchairAccessible && !vehicle.wheelchairAccessible) return false;
      
      // Klima filtresi
      if (filters.airConditioning && !vehicle.airConditioning) return false;
      
      // WiFi filtresi
      if (filters.wifiEnabled && !vehicle.wifiEnabled) return false;
      
      // Hat numaraları filtresi
      if (filters.routeNumbers) {
        const routeList = filters.routeNumbers.split(',').map(r => r.trim());
        if (!routeList.includes(vehicle.routeCode)) return false;
      }
      
      // Araç tipi filtresi
      if (filters.vehicleType !== 'all' && vehicle.type !== filters.vehicleType) return false;
      
      // Kapasite filtresi
      if (filters.capacityMin && vehicle.capacity < parseInt(filters.capacityMin)) return false;
      if (filters.capacityMax && vehicle.capacity > parseInt(filters.capacityMax)) return false;
      
      // Son bakım tarihi filtresi
      if (filters.lastMaintenanceDays) {
        const daysSinceLastMaintenance = vehicle.daysSinceLastMaintenance || 0;
        if (daysSinceLastMaintenance > parseInt(filters.lastMaintenanceDays)) return false;
      }
      
      // Yakıt tipi filtresi
      if (filters.fuelType !== 'all' && vehicle.fuelType !== filters.fuelType) return false;
      
      return true;
    });
  }, [vehicles, filters]);

  // Filtrelenmiş araçları parent component'e gönder
  useEffect(() => {
    if (onFilteredVehiclesChange) {
      onFilteredVehiclesChange(filteredVehicles);
    }
  }, [filteredVehicles, onFilteredVehiclesChange]);

  // Filtre değerini güncelle
  const updateFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Durum filtresi güncelle
  const updateStatusFilter = (status, checked) => {
    setFilters(prev => ({
      ...prev,
      status: {
        ...prev.status,
        [status]: checked
      }
    }));
  };

  // Tüm filtreleri temizle
  const clearAllFilters = () => {
    setFilters({
      motorTempMin: '',
      motorTempMax: '',
      speedMin: '',
      speedMax: '',
      fuelMin: '',
      fuelMax: '',
      vehicleAgeMin: '',
      vehicleAgeMax: '',
      mileageMin: '',
      mileageMax: '',
      status: {
        aktif: true,
        bakimda: true,
        'servis-disi': true
      },
      wheelchairAccessible: false,
      airConditioning: false,
      wifiEnabled: false,
      routeNumbers: '',
      vehicleType: 'all',
      capacityMin: '',
      capacityMax: '',
      lastMaintenanceDays: '',
      fuelType: 'all'
    });
  };

  if (!isOpen) return null;

  return (
    <div className={`fleet-filters-panel ${isOpen ? 'open' : ''} ${theme}`}>
      <div className="fleet-filters-header">
        <h2>Ayarlar ve Filtreler</h2>
        <div className="header-actions">
          <span className="result-count">
            {filteredVehicles.length} / {vehicles.length} araç
          </span>
          <button onClick={clearAllFilters} className="clear-filters-btn">
            Temizle
          </button>
          <button onClick={onClose} className="close-button">×</button>
        </div>
      </div>
      
      <div className="fleet-filters-content">
        
        {/* Durum Filtreleri */}
        <div className="filter-section">
          <h3>Araç Durumu</h3>
          <div className="status-filters">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.status.aktif}
                onChange={(e) => updateStatusFilter('aktif', e.target.checked)}
              />
              <span className="status-dot active"></span>
              Aktif
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.status.bakimda}
                onChange={(e) => updateStatusFilter('bakimda', e.target.checked)}
              />
              <span className="status-dot maintenance"></span>
              Bakımda
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.status['servis-disi']}
                onChange={(e) => updateStatusFilter('servis-disi', e.target.checked)}
              />
              <span className="status-dot out-of-service"></span>
              Servis Dışı
            </label>
          </div>
        </div>

        {/* Motor Sıcaklığı */}
        <div className="filter-section">
          <h3>Motor Sıcaklığı (°C)</h3>
          <div className="range-inputs">
            <input
              type="number"
              placeholder="Min"
              value={filters.motorTempMin}
              onChange={(e) => updateFilter('motorTempMin', e.target.value)}
              className="range-input"
            />
            <span>-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.motorTempMax}
              onChange={(e) => updateFilter('motorTempMax', e.target.value)}
              className="range-input"
            />
          </div>
        </div>

        {/* Hız */}
        <div className="filter-section">
          <h3>Hız (km/h)</h3>
          <div className="range-inputs">
            <input
              type="number"
              placeholder="Min"
              value={filters.speedMin}
              onChange={(e) => updateFilter('speedMin', e.target.value)}
              className="range-input"
            />
            <span>-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.speedMax}
              onChange={(e) => updateFilter('speedMax', e.target.value)}
              className="range-input"
            />
          </div>
        </div>

        {/* Yakıt Seviyesi */}
        <div className="filter-section">
          <h3>Yakıt Seviyesi (%)</h3>
          <div className="range-inputs">
            <input
              type="number"
              placeholder="Min"
              value={filters.fuelMin}
              onChange={(e) => updateFilter('fuelMin', e.target.value)}
              className="range-input"
            />
            <span>-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.fuelMax}
              onChange={(e) => updateFilter('fuelMax', e.target.value)}
              className="range-input"
            />
          </div>
        </div>

        {/* Özel Gereksinimler */}
        <div className="filter-section">
          <h3>Özel Gereksinimler</h3>
          <div className="special-requirements">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.wheelchairAccessible}
                onChange={(e) => updateFilter('wheelchairAccessible', e.target.checked)}
              />
              ♿ Tekerlekli Sandalye Uygun
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.airConditioning}
                onChange={(e) => updateFilter('airConditioning', e.target.checked)}
              />
              ❄️ Klima
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.wifiEnabled}
                onChange={(e) => updateFilter('wifiEnabled', e.target.checked)}
              />
              📶 WiFi
            </label>
          </div>
        </div>

        {/* Araç Yaşı */}
        <div className="filter-section">
          <h3>Araç Yaşı (Yıl)</h3>
          <div className="range-inputs">
            <input
              type="number"
              placeholder="Min"
              value={filters.vehicleAgeMin}
              onChange={(e) => updateFilter('vehicleAgeMin', e.target.value)}
              className="range-input"
            />
            <span>-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.vehicleAgeMax}
              onChange={(e) => updateFilter('vehicleAgeMax', e.target.value)}
              className="range-input"
            />
          </div>
        </div>

        {/* Kilometre */}
        <div className="filter-section">
          <h3>Kilometre</h3>
          <div className="range-inputs">
            <input
              type="number"
              placeholder="Min"
              value={filters.mileageMin}
              onChange={(e) => updateFilter('mileageMin', e.target.value)}
              className="range-input"
            />
            <span>-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.mileageMax}
              onChange={(e) => updateFilter('mileageMax', e.target.value)}
              className="range-input"
            />
          </div>
        </div>

        {/* Hat Numaraları */}
        <div className="filter-section">
          <h3>Hat Numaraları</h3>
          <input
            type="text"
            placeholder="Örn: 1, 5, 10, 25"
            value={filters.routeNumbers}
            onChange={(e) => updateFilter('routeNumbers', e.target.value)}
            className="text-input"
          />
          <small>Virgülle ayırarak birden fazla hat girebilirsiniz</small>
        </div>

        {/* Araç Tipi */}
        <div className="filter-section">
          <h3>Araç Tipi</h3>
          <select
            value={filters.vehicleType}
            onChange={(e) => updateFilter('vehicleType', e.target.value)}
            className="select-input"
          >
            <option value="all">Tümü</option>
            <option value="standard">Standart</option>
            <option value="articulated">Körüklü</option>
            <option value="electric">Elektrikli</option>
          </select>
        </div>

        {/* Kapasite */}
        <div className="filter-section">
          <h3>Yolcu Kapasitesi</h3>
          <div className="range-inputs">
            <input
              type="number"
              placeholder="Min"
              value={filters.capacityMin}
              onChange={(e) => updateFilter('capacityMin', e.target.value)}
              className="range-input"
            />
            <span>-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.capacityMax}
              onChange={(e) => updateFilter('capacityMax', e.target.value)}
              className="range-input"
            />
          </div>
        </div>

        {/* Son Bakım */}
        <div className="filter-section">
          <h3>Son Bakım</h3>
          <input
            type="number"
            placeholder="Son X gün içinde"
            value={filters.lastMaintenanceDays}
            onChange={(e) => updateFilter('lastMaintenanceDays', e.target.value)}
            className="text-input"
          />
          <small>Son bakımı belirtilen gün sayısı içinde olanları gösterir</small>
        </div>

        {/* Yakıt Tipi */}
        <div className="filter-section">
          <h3>Yakıt Tipi</h3>
          <select
            value={filters.fuelType}
            onChange={(e) => updateFilter('fuelType', e.target.value)}
            className="select-input"
          >
            <option value="all">Tümü</option>
            <option value="diesel">Dizel</option>
            <option value="electric">Elektrikli</option>
            <option value="hybrid">Hibrit</option>
            <option value="cng">CNG</option>
          </select>
        </div>

      </div>

      {/* Filtrelenmiş Sonuçlar */}
      <div className="filtered-results">
        <div className="results-header">
          <h3>Filtrelenmiş Araçlar ({filteredVehicles.length})</h3>
        </div>
        <div className="results-list">
          {filteredVehicles.length > 0 ? (
            filteredVehicles.map(vehicle => (
              <div key={vehicle.id} className="result-item">
                <div className="result-main">
                  <span className="vehicle-id">ID: {vehicle.id}</span>
                  <span className="vehicle-plate">{vehicle.plate}</span>
                  <span className="vehicle-route">Hat: {vehicle.routeCode}</span>
                </div>
                <div className="result-status">
                  <span className={`status-indicator ${vehicle.status?.toLowerCase().replace(' ', '-')}`}>
                    {vehicle.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">
              Filtrelere uygun araç bulunamadı
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FleetFiltersPanel;