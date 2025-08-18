// frontend/src/components/Sidebar.js
import React from 'react';
import './Sidebar.css';

function Sidebar({
  onTogglePanel,
  onToggleRouteDetailsPanel,
  onToggleDepartureTimesPanel,
  onToggleStopSelectorPanel,
  onToggleRouteNavigationPanel, // YENİ: Nasıl Giderim paneli için
  isExpanded 
}) {
  return (
    <div className={`sidebar ${isExpanded ? 'expanded' : ''}`}>
      <ul className="sidebar-icons">
        
        <li>
          <button onClick={onTogglePanel} className="sidebar-item" title="Aktif Araçlar / Arama">
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
        
        {/* ⭐ FAVORİ HATLAR İKONU KALDIRILDI */}
        
        <li>
          <button onClick={onToggleRouteNavigationPanel} className="sidebar-item" title="Nasıl Giderim?">
            <span className="material-icons">insights</span>
          </button>
        </li>
      </ul>
    </div>
  );
}

export default Sidebar;