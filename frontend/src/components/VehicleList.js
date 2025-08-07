// frontend/src/components/VehicleList.js
import React, { useState, useEffect } from 'react';
import './VehicleList.css';

// routesForSelectedStop prop'u kaldırıldı
function VehicleList({ items, onVehicleClick, selectedVehicle, onClose, onSearch }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItemId, setExpandedItemId] = useState(null);

  // selectedVehicle değiştiğinde expandedItemId'yi senkronize eder
  useEffect(() => {
    if (selectedVehicle) {
      // Sadece route_number olan item'lar için genişletme
      if (selectedVehicle.route_number && expandedItemId !== selectedVehicle.id) {
        setExpandedItemId(selectedVehicle.id);
      }
      // Not: Artık durak tıklaması bu bileşende işlenmediği için
      // selectedVehicle.id ve selectedVehicle.name kontrolü kaldırıldı.
    } else {
      setExpandedItemId(null);
    }
  }, [selectedVehicle, expandedItemId]); // expandedItemId'yi bağımlılıklara ekledik

  const handleSearchChange = (event) => {
    const term = event.target.value;
    setSearchTerm(term);
    onSearch(term); // App.js'teki arama fonksiyonunu çağırır
    setExpandedItemId(null); // Arama yapıldığında açık olan detayları kapatır
  };

  const handleItemClick = (item) => {
    // Sadece hat numarası olan item'lar için tıklamayı işle
    if (item.route_number) {
      if (expandedItemId === item.id) {
        setExpandedItemId(null);
      } else {
        setExpandedItemId(item.id);
      }
      onVehicleClick(item);
    }
  };

  return (
    <div className="vehicle-list-container">
      <div className="list-header">
        <h2>Aktif Araçlar / Arama Sonuçları</h2>
        <button onClick={onClose} className="close-button">X</button>
      </div>
      <input
        type="text"
        placeholder="Hat No  Giriniz" 
        className="search-input"
        value={searchTerm}
        onChange={handleSearchChange}
      />
      <ul className="list-items">
        {items.length > 0 ? (
          items.map((item) => (
            // Sadece route_number olan item'ları göster
            item.route_number && (
              <li
                key={item.id}
                className={`vehicle-item ${selectedVehicle?.id === item.id ? 'selected' : ''}`}
                onClick={() => handleItemClick(item)}
              >
                <div className="item-title">
                  Otobüs Numarası: <strong>{item.route_number}</strong>
                </div>
                {expandedItemId === item.id && (
                  <div className="item-details">
                    <div>Hat Güzergahı: {item.route_name || 'Bilgi Yok'}</div>
                  </div>
                )}
                {/* Durakla ilgili JSX kaldırıldı */}
              </li>
            )
          ))
        ) : (
          <p className="no-results">Sonuç bulunamadı.</p>
        )}
      </ul>
    </div>
  );
}

export default VehicleList;