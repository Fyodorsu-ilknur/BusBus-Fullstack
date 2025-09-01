// frontend/src/components/FleetFiltersPanel.js
import React, { useState, useEffect, useMemo } from 'react';
import './FleetFiltersPanel.css';

function FleetFiltersPanel({
  isOpen,
  onClose,
  vehicles = [], 
  onFilteredVehiclesChange, 
  theme
}) {
  // Filtre state'leri
  const [filters, setFilters] = useState({
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

  // Filtrelenmiş araçları hesaplar
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      if (filters.motorTempMin && vehicle.motorTemp < parseFloat(filters.motorTempMin)) return false;
      if (filters.motorTempMax && vehicle.motorTemp > parseFloat(filters.motorTempMax)) return false;
      if (filters.speedMin && vehicle.speed < parseFloat(filters.speedMin)) return false;
      if (filters.speedMax && vehicle.speed > parseFloat(filters.speedMax)) return false;

      if (filters.fuelMin && vehicle.fuelLevel < parseFloat(filters.fuelMin)) return false;
      if (filters.fuelMax && vehicle.fuelLevel > parseFloat(filters.fuelMax)) return false;

      if (filters.vehicleAgeMin && vehicle.age < parseInt(filters.vehicleAgeMin)) return false;
      if (filters.vehicleAgeMax && vehicle.age > parseInt(filters.vehicleAgeMax)) return false;

      // Kilometre filtresi
      if (filters.mileageMin && vehicle.mileage < parseInt(filters.mileageMin)) return false;
      if (filters.mileageMax && vehicle.mileage > parseInt(filters.mileageMax)) return false;

      const vehicleStatus = vehicle.status?.toLowerCase().replace(' ', '-') || 'aktif';
      if (!filters.status[vehicleStatus]) return false;

      if (filters.wheelchairAccessible && !vehicle.wheelchairAccessible) return false;

      // Klima filtresi
      if (filters.airConditioning && !vehicle.airConditioning) return false;

      if (filters.wifiEnabled && !vehicle.wifiEnabled) return false;

      if (filters.routeNumbers) {
        const routeList = filters.routeNumbers.split(',').map(r => r.trim());
        if (!routeList.includes(vehicle.routeCode)) return false;
      }

      if (filters.vehicleType !== 'all' && vehicle.type !== filters.vehicleType) return false;

      if (filters.capacityMin && vehicle.capacity < parseInt(filters.capacityMin)) return false;
      if (filters.capacityMax && vehicle.capacity > parseInt(filters.capacityMax)) return false;

      // Son bakım 
      if (filters.lastMaintenanceDays) {
        const daysSinceLastMaintenance = vehicle.daysSinceLastMaintenance || 0;
        if (daysSinceLastMaintenance > parseInt(filters.lastMaintenanceDays)) return false;
      }
      if (filters.fuelType !== 'all' && vehicle.fuelType !== filters.fuelType) return false;

      return true;
    });
  }, [vehicles, filters]);

  useEffect(() => {
    if (onFilteredVehiclesChange) {
      onFilteredVehiclesChange(filteredVehicles);
    }
  }, [filteredVehicles, onFilteredVehiclesChange]);

  // Filtre değerini güncel
  const updateFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Durum filtresi güncel
  const updateStatusFilter = (status, checked) => {
    setFilters(prev => ({
      ...prev,
      status: {
        ...prev.status,
        [status]: checked
      }
    }));
  };

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
        aktif: false,
        bakimda: false,
        'servis-disi': false
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

  const selectAllFilters = () => {
    setFilters(prev => ({
      ...prev,
      status: {
        aktif: true,
        bakimda: true,
        'servis-disi': true
      },
      wheelchairAccessible: false,
      airConditioning: false,
      wifiEnabled: false,
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
      capacityMin: '',
      capacityMax: '',
      lastMaintenanceDays: '',
      routeNumbers: '',
      vehicleType: 'all',
      fuelType: 'all'
    }));
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
          <button onClick={selectAllFilters} className="blue-filters-btn">
            Tümünü Seç
          </button>
          <button onClick={clearAllFilters} className="blue-filters-btn">
            Temizle
          </button>
          <button onClick={onClose} className="close-button">×</button>
        </div>
      </div>

      <div className="fleet-filters-content">
        {/* Araç Durumu */}
        <div className="filter-section">
          <h3>Araç Durumu</h3>
          <div className="status-filters">
            <label className="checkbox-label">
              <input type="checkbox" checked={filters.status.aktif} onChange={(e) => updateStatusFilter('aktif', e.target.checked)} />
              <span className="status-dot active"></span> Aktif
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={filters.status.bakimda} onChange={(e) => updateStatusFilter('bakimda', e.target.checked)} />
              <span className="status-dot maintenance"></span> Bakımda
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={filters.status['servis-disi']} onChange={(e) => updateStatusFilter('servis-disi', e.target.checked)} />
              <span className="status-dot out-of-service"></span> Servis Dışı
            </label>
          </div>
        </div>

        {/* Hız & Yakıt */}
        <div className="filter-row">
          <div className="filter-section" style={{flex:1}}>
            <h3>Hız (km/h)</h3>
            <div className="range-inputs">
              <input type="number" placeholder="Min" value={filters.speedMin} onChange={(e) => updateFilter('speedMin', e.target.value)} className="range-input" />
              <span>-</span>
              <input type="number" placeholder="Max" value={filters.speedMax} onChange={(e) => updateFilter('speedMax', e.target.value)} className="range-input" />
            </div>
          </div>
          <div className="filter-section" style={{flex:1}}>
            <h3>Yakıt Seviyesi (%)</h3>
            <div className="range-inputs">
              <input type="number" placeholder="Min" value={filters.fuelMin} onChange={(e) => updateFilter('fuelMin', e.target.value)} className="range-input" />
              <span>-</span>
              <input type="number" placeholder="Max" value={filters.fuelMax} onChange={(e) => updateFilter('fuelMax', e.target.value)} className="range-input" />
            </div>
          </div>
        </div>

        {/* Motor Sıcaklığı & Araç Yaş*/}
        <div className="filter-row">
          <div className="filter-section" style={{flex:1}}>
            <h3>Motor Sıcaklığı (°C)</h3>
            <div className="range-inputs">
              <input type="number" placeholder="Min" value={filters.motorTempMin} onChange={(e) => updateFilter('motorTempMin', e.target.value)} className="range-input" />
              <span>-</span>
              <input type="number" placeholder="Max" value={filters.motorTempMax} onChange={(e) => updateFilter('motorTempMax', e.target.value)} className="range-input" />
            </div>
          </div>
          <div className="filter-section" style={{flex:1}}>
            <h3>Araç Yaşı</h3>
            <div className="range-inputs">
              <input type="number" placeholder="Min" value={filters.vehicleAgeMin} onChange={(e) => updateFilter('vehicleAgeMin', e.target.value)} className="range-input" />
              <span>-</span>
              <input type="number" placeholder="Max" value={filters.vehicleAgeMax} onChange={(e) => updateFilter('vehicleAgeMax', e.target.value)} className="range-input" />
            </div>
          </div>
        </div>

        {/* Kilometre & Kapasite  */}
        <div className="filter-row">
          <div className="filter-section" style={{flex:1}}>
            <h3>Kilometre</h3>
            <div className="range-inputs">
              <input type="number" placeholder="Min" value={filters.mileageMin} onChange={(e) => updateFilter('mileageMin', e.target.value)} className="range-input" />
              <span>-</span>
              <input type="number" placeholder="Max" value={filters.mileageMax} onChange={(e) => updateFilter('mileageMax', e.target.value)} className="range-input" />
            </div>
          </div>
          <div className="filter-section" style={{flex:1}}>
            <h3>Kapasite</h3>
            <div className="range-inputs">
              <input type="number" placeholder="Min" value={filters.capacityMin} onChange={(e) => updateFilter('capacityMin', e.target.value)} className="range-input" />
              <span>-</span>
              <input type="number" placeholder="Max" value={filters.capacityMax} onChange={(e) => updateFilter('capacityMax', e.target.value)} className="range-input" />
            </div>
          </div>
        </div>

        {/* Özellikler */}
        <div className="filter-section">
          <h3>Araç Özellikleri</h3>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={filters.wheelchairAccessible} onChange={(e) => updateFilter('wheelchairAccessible', e.target.checked)} />
              ♿ Tekerlekli Sandalye Uygun
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={filters.airConditioning} onChange={(e) => updateFilter('airConditioning', e.target.checked)} />
              ❄️ Klima
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={filters.wifiEnabled} onChange={(e) => updateFilter('wifiEnabled', e.target.checked)} />
              📶 WiFi
            </label>
          </div>
        </div>
        
        <div className="filter-section">
          <h3>Hat Numaraları</h3>
          <input type="text" placeholder="Örn: 1, 5, 10, 25" value={filters.routeNumbers} onChange={(e) => updateFilter('routeNumbers', e.target.value)} className="text-input" />
          <small>Virgülle ayırarak birden fazla hat girebilirsiniz</small>
        </div>
        <div className="filter-section">
          <h3>Son Bakım</h3>
          <input type="number" placeholder="Son X gün içinde" value={filters.lastMaintenanceDays} onChange={(e) => updateFilter('lastMaintenanceDays', e.target.value)} className="text-input" />
        </div>
        <div className="filter-section">
          <h3>Araç Tipi</h3>
          <select value={filters.vehicleType} onChange={(e) => updateFilter('vehicleType', e.target.value)} className="select-input">
            <option value="all">Tümü</option>
            <option value="standard">Standart</option>
            <option value="articulated">Körüklü</option>
            <option value="electric">Elektrikli</option>
          </select>
        </div>
        <div className="filter-section">
          <h3>Yakıt Tipi</h3>
          <select value={filters.fuelType} onChange={(e) => updateFilter('fuelType', e.target.value)} className="select-input">
            <option value="all">Tümü</option>
            <option value="diesel">Dizel</option>
            <option value="electric">Elektrikli</option>
            <option value="hybrid">Hibrit</option>
            <option value="cng">CNG</option>
          </select>
        </div>
      </div>

    </div>
  );
}

export default FleetFiltersPanel;