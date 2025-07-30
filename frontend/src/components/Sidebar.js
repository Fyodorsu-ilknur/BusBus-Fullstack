// frontend/src/components/Sidebar.js
import React from 'react';
import './Sidebar.css';

function Sidebar({ onTogglePanel }) {
  return (
    <div className="sidebar">
      <div className="sidebar-item active" onClick={onTogglePanel} title="Toggle Panel">
        ▦
      </div>
      <div className="sidebar-item" title="Güzergah-Duraklar">⛗</div>
      <div className="sidebar-item" title="Kalkış Saatleri">◷</div>
      <div className="sidebar-item" title="Icon 3">⭐</div>
      <div className="sidebar-item" title="Icon 4">📊</div>
    </div>
  );
}

export default Sidebar;