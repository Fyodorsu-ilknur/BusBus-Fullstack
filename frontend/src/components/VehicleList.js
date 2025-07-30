// frontend/src/components/VehicleList.js
import React, { useState, useEffect } from 'react'; // useEffect hook'unu da import ediyoruz
import './VehicleList.css'; // Stil dosyasını import ediyor

function VehicleList({ items, onVehicleClick, selectedVehicle, onClose, onSearch }) {
  const [searchTerm, setSearchTerm] = useState(''); // Arama kutusu için yerel state
  // Hangi otobüs numarasının detaylarının açık olduğunu tutar
  const [expandedItemId, setExpandedItemId] = useState(null);

  // Arama terimi değiştiğinde veya dışarıdan bir öğe seçildiğinde (Map.js'den gelen selectedVehicle)
  // expandedItemId'yi senkronize etmek için kullanılır.
  useEffect(() => {
    if (selectedVehicle && selectedVehicle.route_number) {
      // Eğer seçilen öğe bir hat ise ve henüz açık değilse, onu aç
      if (expandedItemId !== selectedVehicle.id) {
        setExpandedItemId(selectedVehicle.id);
      }
    } else {
      // Seçilen öğe bir hat değilse veya selectedVehicle null ise, açık olanı kapat
      setExpandedItemId(null);
    }
  }, [selectedVehicle]); // selectedVehicle değiştiğinde bu efekt çalışır

  const handleSearchChange = (event) => {
    const term = event.target.value;
    setSearchTerm(term);
    onSearch(term);
    // Arama yapıldığında veya arama terimi değiştiğinde açık olan detayları kapat
    setExpandedItemId(null); 
  };

  const handleItemClick = (item) => {
    // Tıklanan öğe zaten açıksa, kapat
    if (expandedItemId === item.id) {
      setExpandedItemId(null);
    } else {
      // Değilse, aç
      setExpandedItemId(item.id);
    }
    // App.js'deki handleVehicleClick fonksiyonunu çağır (harita ve ana state güncellemeleri için)
    onVehicleClick(item);
  };

  return (
    <div className="vehicle-list-container">
      <div className="list-header">
        <h2>Aktif Araçlar / Arama Sonuçları</h2>
        {/* Kapatma butonu, App.js'deki isPanelOpen state'ini değiştirir */}
        <button onClick={onClose} className="close-button">X</button> 
      </div>
      <input
        type="text"
        placeholder="Otobüs No veya Durak Adı Girin"
        className="search-input"
        value={searchTerm}
        onChange={handleSearchChange}
      />
      <ul className="list-items"> {/* Kaydırma için bu ul'ye bir sınıf ekledim */}
        {items.length > 0 ? (
          items.map((item) => (
            <li
              key={item.id || item.DURAK_ID} // Her öğe için benzersiz bir anahtar kullanın (hatlar için 'id', duraklar için 'DURAK_ID')
              className={`vehicle-item ${selectedVehicle?.id === item.id ? 'selected' : ''}`}
              onClick={() => handleItemClick(item)}
            >
              {item.route_number && ( // Eğer öğe bir otobüs hattı ise (route_number'ı varsa)
                <>
                  <div className="item-title">
                    Otobüs Numarası: <strong>{item.route_number}</strong>
                  </div>
                  {/* Sadece bu öğe genişletilmişse kalkış/varış bilgilerini göster */}
                  {expandedItemId === item.id && (
                    <div className="item-details">
                      <div>Kalkış: {item.start || 'Bilgi Yok'}</div>
                      <div>Varış: {item.end || 'Bilgi Yok'}</div>
                    </div>
                  )}
                </>
              )}
              {item.name && ( // Eğer öğe bir durak ise (name'i varsa)
                <div className="item-title">
                  Durak Adı: <strong>{item.name}</strong>
                  {item.busLines && ` (${item.busLines.join(', ')})`} {/* Duraklar için geçen hatları göster */}
                </div>
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