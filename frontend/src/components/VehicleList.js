// frontend/src/components/VehicleList.js
import React, { useState } from 'react'; // useState hook'unu import ediyor
import './VehicleList.css';

//items ve onSearch proplarını alıyor
function VehicleList({ items, onVehicleClick, selectedVehicle, onClose, onSearch }) {
  const [searchTerm, setSearchTerm] = useState(''); // Arama kutusu için yerel state

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    // Her tuş vuruşunda App.js'e arama terimini gönderiyor
    onSearch(event.target.value); 
  };

  return (
    <div className="vehicle-list-container">
        <div className="list-header">
            <h2>Active Vehicles / Search Results</h2> 
        </div>
      <input 
        type="text" 
        placeholder="Otobüs No veya Durak Adı Girin" 
        className="search-input"
        value={searchTerm} 
        onChange={handleSearchChange} // Değişiklikleri yakalıyo
      />
      <ul>
        {items.length > 0 ? (
            items.map((item) => (
                <li 
                    key={item.id} 
                    className={`vehicle-item ${selectedVehicle?.id === item.id ? 'selected' : ''}`}
                    onClick={() => onVehicleClick(item)}
                >

                    {item.name || item.route_number || item.id} 
                    {item.busLines && ` (${item.busLines.join(', ')})`} {/* Duraklar için geçen hatları göster */}
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