// frontend/src/components/Sidebar.js
import React from 'react';
import './Sidebar.css';

function Sidebar({
  onMenuClick, // Yeni prop sistemi
  isExpanded
}) {
  return (
    <div className={`sidebar ${isExpanded ? 'expanded' : ''}`}>
      <ul className="sidebar-icons">

        <li>
          <button onClick={() => onMenuClick('vehicle-list')} className="sidebar-item" title="Hat Güzergah Takip">
            <span className="material-icons">grid_view</span>
          </button>
        </li>

        <li>
          <button onClick={() => onMenuClick('route-details')} className="sidebar-item" title="Güzergah Detayları">
            <span className="material-icons">alt_route</span>
          </button>
        </li>

        <li>
          <button onClick={() => onMenuClick('departure-times')} className="sidebar-item" title="Kalkış Saatleri">
            <span className="material-icons">schedule</span>
          </button>
        </li>

        <li>
          <button onClick={() => onMenuClick('stop-selector')} className="sidebar-item" title="Durak Seçimi">
            <span className="material-icons">location_on</span>
          </button>
        </li>

        <li>
          <button onClick={() => onMenuClick('fleet-tracking')} className="sidebar-item" title="Filo Takip">
            <span className="material-icons">directions_bus</span>
          </button>
        </li>

        <li>
          <button onClick={() => onMenuClick('fleet-filters')} className="sidebar-item" title="Ayarlar ve Filtreler">
            <span className="material-icons">tune</span>
          </button>
        </li>

      </ul>
    </div>
  );
}

export default Sidebar;