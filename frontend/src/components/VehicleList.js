// frontend/src/components/VehicleList.js
import React, { useState, useEffect } from 'react';
import './VehicleList.css';

function VehicleList({ items, onVehicleClick, selectedVehicle, onClose, onSearch , routesForSelectedStop}) {


  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItemId, setExpandedItemId] = useState(null);

  // selectedVehicle değiştiğinde expandedItemId'yi senkronize eder
  useEffect(() => {
    if (selectedVehicle) {
      if (selectedVehicle.route_number && expandedItemId !== selectedVehicle.id) {
        setExpandedItemId(selectedVehicle.id);
      } else if (selectedVehicle.id && selectedVehicle.name && expandedItemId !== selectedVehicle.id) {
        setExpandedItemId(selectedVehicle.id);
      }
    } else {
      setExpandedItemId(null); 
    }
  }, [selectedVehicle]);

  const handleSearchChange = (event) => {
    const term = event.target.value;
    setSearchTerm(term);
    onSearch(term); // App.js'teki arama fonksiyonunu çağırır
    setExpandedItemId(null); // Arama yapıldığında açık olan detayları kapatır
  };

  const handleItemClick = (item) => {
    if (expandedItemId === item.id) {
      setExpandedItemId(null);
    } else {
      setExpandedItemId(item.id);
    }
    onVehicleClick(item); 
  };

  return (
    <div className="vehicle-list-container">
      <div className="list-header">
        <h2>Aktif Araçlar / Arama Sonuçları</h2>
        <button onClick={onClose} className="close-button">X</button>
      </div>
      <input
        type="text"
        placeholder="Hat No, Durak Adı veya ID Giriniz"
        className="search-input"
        value={searchTerm}
        onChange={handleSearchChange}
      />
      <ul className="list-items">
        {items.length > 0 ? (
          items.map((item) => (
            <li
              key={item.id} 
              className={`vehicle-item ${selectedVehicle?.id === item.id ? 'selected' : ''}`}
              onClick={() => handleItemClick(item)}
            >
              {item.route_number && ( 
                <>
                  <div className="item-title">
                    Otobüs Numarası: <strong>{item.route_number}</strong>
                  </div>
                  {expandedItemId === item.id && (
                    <div className="item-details">
                      <div>Hat Güzergahı: {item.route_name || 'Bilgi Yok'}</div>
                    </div>
                  )}
                </>
              )}
              {item.name && ( 
                <>
                  <div className="item-title">
                    Durak Adı: <strong>{item.name}</strong> &nbsp;(ID:{item.id})
                  </div>
                  
                  {expandedItemId === item.id && ( 
                    <div className="item-details">
                      {item.district && <div>İlçe/Mahalle: {item.district}</div>}
                       {selectedVehicle?.id === item.id && routesForSelectedStop.length > 0 && ( // Sadece seçili duraksa ve hatlar varsa göster
                          <div className="routes-from-stop">
                              <h5>Bu Duraktan Geçen Hatlar:</h5>
                              <ul>
                                  {routesForSelectedStop.map(route => (
                                      <li key={route.id}>
                                          <strong>{route.route_number}</strong> - {route.route_name}
                                      </li>
                                  ))}
                              </ul>
                          </div>
                      )}
                      {selectedVehicle?.id === item.id && routesForSelectedStop.length === 0 && (
                          <div className="routes-from-stop">
                              <p className="info-message">Bu duraktan geçen hat bulunamadı.</p>
                          </div>
                      )}
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