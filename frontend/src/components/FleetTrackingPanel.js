// frontend/src/components/FleetTrackingPanel.js
import React from 'react';
import './FleetTrackingPanel.css'; // Stil dosyası için

function FleetTrackingPanel({ onClose }) {
  return (
    <div className="fleet-tracking-panel">
      <div className="fleet-tracking-header">
        <h2>Filo Takip</h2>
        <button onClick={onClose} className="close-button">X</button>
      </div>
      <div className="fleet-tracking-content">
        <p>Filo takip verileri burada görüntülenecek.</p>
        {/* Buraya daha sonra araç listesi, filtreler, detaylar gelecek */}
      </div>
    </div>
  );
}

export default FleetTrackingPanel;