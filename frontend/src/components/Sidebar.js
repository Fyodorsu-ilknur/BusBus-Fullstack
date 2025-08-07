// frontend/src/components/Sidebar.js
import React from 'react';
import './Sidebar.css';

// Sidebar bileşeni, isExpanded durumunu App.js'ten prop olarak alır
function Sidebar({
  onTogglePanel,
  onToggleRouteDetailsPanel,
  onToggleDepartureTimesPanel,
  onToggleStopSelectorPanel, // YENİ: Durak seçimi toggle fonksiyonu
  isExpanded // Sidebar'ın genişleme durumunu App.js'ten alacak
}) {
  return (
    // Ana sidebar div'ine 'sidebar' sınıfı ve isExpanded durumuna göre 'expanded' sınıfı ekleniyor
    <div className={`sidebar ${isExpanded ? 'expanded' : ''}`}>
      {/* İkonlar için liste yapısı */}
      <ul className="sidebar-icons">
        {/* Hamburger menü ikonu artık burada değil, Navbar içinde. */}
        
        {/* Aktif Araçlar / Arama ikonu */}
        <li>
          <button onClick={onTogglePanel} className="sidebar-item" title="Aktif Araçlar / Arama">
            <span className="material-icons">grid_view</span>
          </button>
        </li>
        
        {/* Güzergah Detayları ikonu */}
        <li>
          <button onClick={onToggleRouteDetailsPanel} className="sidebar-item" title="Güzergah Detayları">
            <span className="material-icons">alt_route</span>
          </button>
        </li>
        
        {/* Kalkış Saatleri ikonu */}
        <li>
          <button onClick={onToggleDepartureTimesPanel} className="sidebar-item" title="Kalkış Saatleri">
            <span className="material-icons">schedule</span>
          </button>
        </li>
        
        {/* YENİ: Durak Seçimi ikonu */}
        <li>
          <button onClick={onToggleStopSelectorPanel} className="sidebar-item" title="Durak Seçimi">
            <span className="material-icons">location_on</span>
          </button>
        </li>
        
        {/* Diğer ikonlar */}
        <li>
          <button className="sidebar-item" title="Favoriler">
            <span className="material-icons">star</span>
          </button>
        </li>
        <li>
          <button className="sidebar-item" title="Analiz">
            <span className="material-icons">insights</span>
          </button>
        </li>
      </ul>
    </div>
  );
}

export default Sidebar;