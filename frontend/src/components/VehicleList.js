// frontend/src/components/VehicleList.js
import React, { useState, useEffect } from 'react';
import './VehicleList.css';

function VehicleList({ items, onVehicleClick, selectedVehicle, onClose, onSearch }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItemId, setExpandedItemId] = useState(null);

  // selectedVehicle değiştiğinde expandedItemId'yi senkronize et
  useEffect(() => {
    if (selectedVehicle) {
      if (selectedVehicle.route_number && expandedItemId !== selectedVehicle.id) {
        setExpandedItemId(selectedVehicle.id);
      } else if (selectedVehicle.id && selectedVehicle.name && expandedItemId !== selectedVehicle.id) {
        // Durak seçildiğinde de genişlet
        setExpandedItemId(selectedVehicle.id);
      }
    } else {
      setExpandedItemId(null); // Seçim kaldırıldığında kapat
    }
  }, [selectedVehicle]);

  const handleSearchChange = (event) => {
    const term = event.target.value;
    setSearchTerm(term);
    onSearch(term); // App.js'teki arama fonksiyonunu çağır
    setExpandedItemId(null); // Arama yapıldığında açık olan detayları kapat
  };

  const handleItemClick = (item) => {
    if (expandedItemId === item.id) {
      setExpandedItemId(null);
    } else {
      setExpandedItemId(item.id);
    }
    onVehicleClick(item); // App.js'teki tıklama fonksiyonunu çağır
  };

  return (
    <div className="vehicle-list-container">
      <div className="list-header">
        <h2>Aktif Araçlar / Arama Sonuçları</h2>
        <button onClick={onClose} className="close-button">X</button>
      </div>
      <input
        type="text"
        placeholder="Otobüs No veya Durak Adı Girin"
        className="search-input"
        value={searchTerm}
        onChange={handleSearchChange}
      />
      <ul className="list-items">
        {items.length > 0 ? (
          items.map((item) => (
            <li
              key={item.id} // Hatlar ve duraklar için 'id' kullanıyoruz
              className={`vehicle-item ${selectedVehicle?.id === item.id ? 'selected' : ''}`}
              onClick={() => handleItemClick(item)}
            >
              {item.route_number && ( // Eğer öğe bir otobüs hattı ise
                <>
                  <div className="item-title">
                    Otobüs Numarası: <strong>{item.route_number}</strong>
                  </div>
                  {expandedItemId === item.id && ( // Eğer bu öğenin detayları açık ise
                    <div className="item-details">
                      <div>Hat Güzergahı: {item.route_name || 'Bilgi Yok'}</div>
                      {/* Kalkış/Varış bilgileri Routes API'sinde yok */}
                    </div>
                  )}
                </>
              )}
              {item.name && ( // Eğer öğe bir durak ise (stops API'sinden gelenler 'name' alanı içerir)
                <>
                  <div className="item-title">
                    Durak Adı: <strong>{item.name}</strong>
                  </div>
                  {expandedItemId === item.id && ( // Eğer bu öğenin detayları açık ise
                    <div className="item-details">
                      <div>ID: {item.id}</div>
                      {/* İlçe/Mahalle bilgisi şu anki GTFS stops.txt'de yok */}
                      {item.district && <div>İlçe/Mahalle: {item.district}</div>}
                    </div>
                  )}
                </>
              )}
            </li>
          ))
        ) : (
          <p className="no-results">Sonuç bulunamadı.</p>
        )}
      </ul>
    </div>
  );
}

export default VehicleList;