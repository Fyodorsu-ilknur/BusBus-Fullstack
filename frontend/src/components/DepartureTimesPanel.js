import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaSearch } from 'react-icons/fa';
import './RouteDetailsPanel.css'; 

function DepartureTimesPanel({ onClose, allRoutes }) { 
  const [selectedBusNumber, setSelectedBusNumber] = useState('');
  const [selectedDay, setSelectedDay] = useState('monday'); 
  const [departureData, setDepartureData] = useState(null); 
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [displayDirection, setDisplayDirection] = useState('gidis'); 

  
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRoutes, setFilteredRoutes] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef(null);

  const daysOfWeek = [
    { key: 'monday', label: 'Pazartesi' },
    { key: 'tuesday', label: 'Salı' },
    { key: 'wednesday', label: 'Çarşamba' },
    { key: 'thursday', label: 'Perşembe' },
    { key: 'friday', label: 'Cuma' },
    { key: 'saturday', label: 'Cumartesi' },
    { key: 'sunday', label: 'Pazar' },
  ];

  // 🚌 allRoutes veya searchTerm değiştiğinde listeyi filtrele
  useEffect(() => {
    const routesArray = Object.values(allRoutes || {}); // allRoutes obje olarak geliyor, diziye çeviriyoruz
    if (searchTerm.trim() === '') {
      setFilteredRoutes(routesArray); 
    } else {
      const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
      const filtered = routesArray.filter(route =>
        (route.route_number && route.route_number.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (route.route_name && route.route_name.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (route.start_point && route.start_point.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (route.end_point && route.end_point.toLowerCase().includes(lowerCaseSearchTerm))
      );
      setFilteredRoutes(filtered);
    }
  }, [searchTerm, allRoutes]);

  const fetchDepartureTimes = useCallback(async () => {
    setErrorMessage('');
    setDepartureData(null);
    setIsLoading(true);

    if (selectedBusNumber.trim() === '') {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/departure-times/${selectedBusNumber}/${selectedDay}`);
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || `API hatası: ${response.status}`);
        setDepartureData(null);
      } else {
        setDepartureData(data);
        if (data.gidis.length === 0 && data.donus.length > 0) {
            setDisplayDirection('donus');
        } else {
            setDisplayDirection('gidis'); 
        }
      }
    } catch (error) {
      console.error("Kalkış saatleri çekilirken hata oluştu:", error);
      setErrorMessage("Kalkış saatleri yüklenirken bir sorun oluştu.");
      setDepartureData(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBusNumber, selectedDay]);

  useEffect(() => {
    fetchDepartureTimes();
  }, [fetchDepartureTimes]);

  // Arama kutusuna yazıldığında veya odaklanıldığında
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value); 
    setSelectedBusNumber(''); 
    setShowDropdown(true); 
  };
// Listedeki bir hatta tıklandığında
  const handleRouteSelectionFromList = (route) => {
    setSelectedBusNumber(route.route_number); 
    setSearchTerm(route.route_number); 
    setShowDropdown(false);
    setDepartureData(null); 
  };
  //Inputtan odak kaybedildiğinde dropdown'u gizler
  const handleInputBlur = (e) => {
    setTimeout(() => {
      if (searchInputRef.current && !searchInputRef.current.contains(document.activeElement)) {
        setShowDropdown(false);
      }
    }, 100);
  };
  // Inputa odaklanıldığında dropdown'u gösterir
  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  // Eski handler
  const handleBusNumberChange = (e) => {
    const value = e.target.value.trim();
    setSelectedBusNumber(value);
    setSearchTerm(value);
  };

  const handleDayChange = (e) => {
    setSelectedDay(e.target.value);
  };

  return (
    <div className="route-details-panel"> 
      <div className="panel-header">
        <h3>Kalkış Saatleri</h3>
        <button onClick={onClose} className="close-button">X</button>
      </div>

      <div className="input-group search-dropdown-container">
        <label htmlFor="busNumberInput">Otobüs Numarası:</label>
        <div className="search-input-wrapper">
          <FaSearch className="search-icon" />
          <input
            id="busNumberInput"
            type="text"
            value={searchTerm} 
            onChange={handleSearchInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Örn: 15 (Hat No veya Hat Adı Giriniz)"
            className="bus-number-input"
            ref={searchInputRef}
          />
        </div>

        {showDropdown && filteredRoutes.length > 0 && (
          <ul className="route-search-dropdown">
            {filteredRoutes.map(route => (
              <li
                key={route.id}
                onClick={() => handleRouteSelectionFromList(route)}
                className="route-search-dropdown-item"
              >
                <strong>{route.route_number}</strong> - {route.route_name || `${route.start_point} → ${route.end_point}`}
                <div className="route-accessibility-icons">
                  {route.wheelchair_accessible && (
                    <span className="accessibility-icon wheelchair" title="Tekerlekli sandalye erişimi">♿</span>
                  )}
                  {route.bicycle_accessible && (
                    <span className="accessibility-icon bicycle" title="Bisiklet taşınabilir">🚲</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {showDropdown && filteredRoutes.length === 0 && searchTerm && (
          <p className="route-search-dropdown-no-results">Sonuç bulunamadı.</p>
        )}
      </div>

      <div className="input-group">
        <label htmlFor="daySelect">Gün Seçin:</label>
        <select
          id="daySelect"
          value={selectedDay}
          onChange={handleDayChange}
          className="bus-number-input" 
        >
          {daysOfWeek.map(day => (
            <option key={day.key} value={day.key}>{day.label}</option>
          ))}
        </select>
      </div>

      <div className="direction-toggle">
        <button
          className={`direction-button ${displayDirection === 'gidis' ? 'active' : ''}`}
          onClick={() => setDisplayDirection('gidis')}
        >
          Gidiş
        </button>
        <button
          className={`direction-button ${displayDirection === 'donus' ? 'active' : ''}`}
          onClick={() => setDisplayDirection('donus')}
        >
          Dönüş
        </button>
      </div>

      <div className="stop-list-section"> 
        <h4>
          {selectedBusNumber ? (
            `${selectedBusNumber} Numaralı Hat Kalkış Saatleri (${daysOfWeek.find(d => d.key === selectedDay)?.label})`
          ) : (
            'Kalkış Saatleri Listesi'
          )}
        </h4>

        {isLoading && <p className="info-message">Yükleniyor...</p>}
        {errorMessage && <p className="error-message">{errorMessage}</p>}

        {departureData ? (
          <>
            {displayDirection === 'gidis' && departureData.gidis.length > 0 && (
              <div className="departure-group">
                <h5>Gidiş Seferleri</h5>
                <ul className="stop-list">
                  {departureData.gidis.map((item, index) => (
                    <li key={item.trip_id + index} className="stop-item">
                      {item.departure_time} - {item.first_stop_name} (ID: {item.first_stop_id})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {displayDirection === 'donus' && departureData.donus.length > 0 && (
              <div className="departure-group">
                <h5>Dönüş Seferleri</h5>
                <ul className="stop-list">
                  {departureData.donus.map((item, index) => (
                    <li key={item.trip_id + index} className="stop-item">
                      {item.departure_time} - {item.first_stop_name} (ID: {item.first_stop_id}) 
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/*  bilgi mesajı */}
            {(
                (displayDirection === 'gidis' && departureData.gidis.length === 0) ||
                (displayDirection === 'donus' && departureData.donus.length === 0)
            ) && (
                <p className="info-message">Bu yönde kalkış saati bulunamadı.</p>
            )}
            {departureData.gidis.length === 0 && departureData.donus.length === 0 && (
                <p className="info-message">Bu hat için kalkış saati bulunamadı. Lütfen geçerli bir hat numarası ve gün girin.</p>
            )}
          </>
        ) : (
          !isLoading && !errorMessage && selectedBusNumber && (
            <p className="info-message">Kalkış saati bulunamadı. Lütfen geçerli bir hat numarası ve gün girin.</p>
          )
        )}
        {!selectedBusNumber && (
          <p className="info-message">Lütfen bir otobüs numarası girin.</p>
        )}
      </div>
    </div>
  );
}

export default DepartureTimesPanel;