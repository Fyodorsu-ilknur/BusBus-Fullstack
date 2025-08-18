// frontend/src/components/RouteDetailsPanel.js
import React, { useState, useEffect, useCallback, useRef } from 'react'; // useRef eklendi
import './RouteDetailsPanel.css';
import { FaSearch } from 'react-icons/fa'; // Arama ikonu için

function RouteDetailsPanel({ onClose, allRoutes, onVehicleClick }) { // allRoutes ve onVehicleClick propları eklendi
  const [selectedBusNumber, setSelectedBusNumber] = useState(''); // Seçilen hat numarası (input değeri)
  const [selectedDirection, setSelectedDirection] = useState('1'); // '1' Gidiş, '2' Dönüş
  const [displayedRouteDetails, setDisplayedRouteDetails] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState(''); // Arama için kullanılacak input değeri
  const [filteredRoutes, setFilteredRoutes] = useState([]); // Filtrelenmiş rotalar listesi
  const [showDropdown, setShowDropdown] = useState(false); // Arama listesini göster/gizle

  const searchInputRef = useRef(null); // Input elementine referans

  // API'den güzergah detaylarını çekecek fonksiyon
  const fetchRouteDetails = useCallback(async (busNumber, direction) => {
    setErrorMessage('');
    setDisplayedRouteDetails(null);
    setIsLoading(true);

    if (busNumber.trim() === '') {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/route-details/${busNumber}/${direction}`);
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || `API hatası: ${response.status}`);
        setDisplayedRouteDetails(null);
      } else {
        setDisplayedRouteDetails(data);
      }
    } catch (error) {
      console.error("Güzergah detayları çekilirken hata oluştu:", error);
      setErrorMessage("Güzergah detayları yüklenirken bir sorun oluştu.");
      setDisplayedRouteDetails(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // selectedBusNumber veya selectedDirection değiştiğinde detayları çek
  useEffect(() => {
    if (selectedBusNumber) {
      fetchRouteDetails(selectedBusNumber, selectedDirection);
    } else {
      setDisplayedRouteDetails(null);
      setErrorMessage('');
    }
  }, [selectedBusNumber, selectedDirection, fetchRouteDetails]);

  // allRoutes veya searchTerm değiştiğinde listeyi filtrele
  useEffect(() => {
      const routesArray = Object.values(allRoutes); // allRoutes obje olarak geliyor, diziye çeviriyoruz
      if (searchTerm.trim() === '') {
          setFilteredRoutes(routesArray); // Arama boşsa tüm rotaları göster
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

  // Arama kutusuna yazıldığında veya odaklanıldığında
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value); // Arama terimini güncelle
    setSelectedBusNumber(''); // Manuel girişi temizle
    setShowDropdown(true); // Dropdown'u göster
  };

  // Listedeki bir hatta tıklandığında
  const handleRouteSelectionFromList = (route) => {
    setSelectedBusNumber(route.route_number); // Input değerini ayarla
    setSearchTerm(route.route_number); // Arama kutusunu seçilen hat numarasıyla doldur
    setShowDropdown(false); // Dropdown'u gizle
    setDisplayedRouteDetails(null); // Önceki detayları temizle

    if (onVehicleClick) {
      onVehicleClick(route); // App.js'teki handleVehicleClick'i çağır
    }
  };

  // Yön değiştirme butonu handler'ı
  const handleDirectionChange = (direction) => {
    setSelectedDirection(direction);
  };

  // Inputtan odak kaybedildiğinde dropdown'u gizle
  const handleInputBlur = (e) => {
   
    setTimeout(() => { if (searchInputRef.current && !searchInputRef.current.contains(document.activeElement)) { // searchInputRef'i kullanmak daha güvenli
        setShowDropdown(false);
      }
    }, 100);
  };
     
  // Inputa odaklanıldığında dropdown'u göster
  const handleInputFocus = () => {
    setShowDropdown(true);
  };


  return (
    <div className="route-details-panel">
      <div className="panel-header">
        <h3>Güzergah Detayları</h3>
        <button onClick={onClose} className="close-button">X</button>
      </div>

      {/* Otobüs Numarası Inputu (Arama Özelliği ile) */}
      <div className="input-group search-dropdown-container"> {/* Yeni bir kapsayıcı */}
        <label htmlFor="busNumberInput">Otobüs Numarası:</label>
        <div className="search-input-wrapper"> {/* Arama ikonu için wrapper */}
          <FaSearch className="search-icon" />
          <input
            id="busNumberInput"
            type="text"
            value={searchTerm} // Input değeri searchTerm olacak
            onChange={handleSearchInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Örn: 15 (Hat No veya Hat Adı Giriniz)"
            className="bus-number-input"
          />
        </div>

        {/* Arama Sonuçları Dropdown */}
        {showDropdown && filteredRoutes.length > 0 && (
            <ul className="route-search-dropdown">
                {filteredRoutes.map(route => (
                    <li
                        key={route.id}
                        onClick={() => handleRouteSelectionFromList(route)}
                        className="route-search-dropdown-item"
                    >
                        <strong>{route.route_number}</strong> - {route.route_name || `${route.start_point} → ${route.end_point}`}
                    </li>
                ))}
            </ul>
        )}
        {showDropdown && filteredRoutes.length === 0 && searchTerm && (
            <p className="route-search-dropdown-no-results">Sonuç bulunamadı.</p>
        )}
      </div>

      {/* Yön Seçim Butonları - Sadece bir hat seçildiğinde görünsün */}
      {selectedBusNumber && ( // Eğer bir hat seçiliyse yön butonlarını göster
        <div className="direction-toggle">
          <button
            className={`direction-button ${selectedDirection === '1' ? 'active' : ''}`}
            onClick={() => handleDirectionChange('1')}
          >
            Gidiş
          </button>
          <button
            className={`direction-button ${selectedDirection === '2' ? 'active' : ''}`}
            onClick={() => handleDirectionChange('2')}
          >
            Dönüş
          </button>
        </div>
      )}

      <div className="stop-list-section">
        <h4>
          {selectedBusNumber ? (
            `${displayedRouteDetails?.route_name || selectedBusNumber + ' Numaralı Hat'} Durakları (${selectedDirection === '1' ? 'Gidiş' : 'Dönüş'})`
          ) : (
            'Durak Listesi'
          )}
        </h4>

        {isLoading && <p className="info-message">Yükleniyor...</p>}
        {errorMessage && <p className="error-message">{errorMessage}</p>}

        {displayedRouteDetails && displayedRouteDetails.stops && displayedRouteDetails.stops.length > 0 ? (
          <>
            <div className="route-summary">
              <p>Başlangıç: <strong>{displayedRouteDetails.start_point}</strong></p>
              <p>Bitiş: <strong>{displayedRouteDetails.end_point}</strong></p>
            </div>
            <ul className="stop-list">
              {displayedRouteDetails.stops.map((stop) => (
                <li key={stop.id + "-" + stop.sequence} className="stop-item">
                  {stop.sequence}. {stop.name}  &nbsp; (ID:{stop.id})
                </li>
              ))}
            </ul>
          </>
        ) : (
          !isLoading && !errorMessage && selectedBusNumber && (
            <p className="info-message">Durak bilgisi bulunamadı. Lütfen geçerli bir hat numarası girin.</p>
          )
        )}
        {!selectedBusNumber && (
          <p className="info-message">Lütfen bir otobüs numarası girin.</p>
        )}
      </div>
    </div>
  );
}

export default RouteDetailsPanel;