// frontend/src/components/Sidebar.js
import React from 'react';
import './Sidebar.css';

function Sidebar({
  onTogglePanel,
  onToggleRouteDetailsPanel,
  onToggleDepartureTimesPanel,
  onToggleStopSelectorPanel,
  onToggleFleetTrackingPanel,
  onToggleFleetFiltersPanel, // ✅ YENİ: Ayarlar ve Filtreler paneli için prop
  isExpanded
}) {
  return (
    <div className={`sidebar ${isExpanded ? 'expanded' : ''}`}>
      <ul className="sidebar-icons">

        <li>
          <button onClick={onTogglePanel} className="sidebar-item" title="Hat Güzergah Takip">
            <span className="material-icons">grid_view</span>
          </button>
        </li>

        <li>
          <button onClick={onToggleRouteDetailsPanel} className="sidebar-item" title="Güzergah Detayları">
            <span className="material-icons">alt_route</span>
          </button>
        </li>

        <li>
          <button onClick={onToggleDepartureTimesPanel} className="sidebar-item" title="Kalkış Saatleri">
            <span className="material-icons">schedule</span>
          </button>
        </li>

        <li>
          <button onClick={onToggleStopSelectorPanel} className="sidebar-item" title="Durak Seçimi">
            <span className="material-icons">location_on</span>
          </button>
        </li>

        <li>
          <button onClick={onToggleFleetTrackingPanel} className="sidebar-item" title="Filo Takip">
            <span className="material-icons">directions_bus</span>
          </button>
        </li>

        {/* ✅ YENİ EKLENDİ: Ayarlar ve Filtreler İkonu */}
        <li>
          <button onClick={onToggleFleetFiltersPanel} className="sidebar-item" title="Ayarlar ve Filtreler">
            <span className="material-icons">tune</span>
          </button>
        </li>

      </ul>
    </div>
  );
}

export default Sidebar;