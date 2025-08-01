// frontend/src/components/Sidebar.js
import React from 'react';
import './Sidebar.css';

function Sidebar({ onTogglePanel, onToggleRouteDetailsPanel, onToggleDepartureTimesPanel }) {
  return (
    <div className="sidebar">
      {/* İlk ikon: Aktif Araçlar / Arama Sonuçları paneli */}
      <div className="sidebar-item" onClick={onTogglePanel} title="Aktif Araçlar / Arama">
        <span className="material-icons">grid_view</span> {/* Izgara ikonu */}
      </div>

      {/* İkinci ikon: Güzergah Detayları paneli */}
      <div className="sidebar-item" onClick={onToggleRouteDetailsPanel} title="Güzergah Detayları">
        <span className="material-icons">alt_route</span> {/* Okların ters yönlü olduğu ikon */}
      </div>

      {/* Üçüncü ikon: Kalkış Saatleri paneli */}
      <div className="sidebar-item" onClick={onToggleDepartureTimesPanel} title="Kalkış Saatleri">
        <span className="material-icons">schedule</span> {/* Saat veya kronometre ikonu */}
      </div>

      {/* Diğer ikonlar (varsa) */}
      <div className="sidebar-item" title="Favoriler">
        <span className="material-icons">star</span>
      </div>
      <div className="sidebar-item" title="Analiz">
        <span className="material-icons">insights</span>
      </div>
    </div>
  );
}

export default Sidebar;