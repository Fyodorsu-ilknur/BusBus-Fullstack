// frontend/src/components/RouteDetailsPanel.js
import React, { useState, useEffect, useCallback } from 'react';
import './RouteDetailsPanel.css';

function RouteDetailsPanel({ onClose }) {
  const [selectedBusNumber, setSelectedBusNumber] = useState('');
  const [selectedDirection, setSelectedDirection] = useState('1'); // '1' 
  const [displayedRouteDetails, setDisplayedRouteDetails] = useState(null); 
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); 

  // API'den guzergah deatylarını cekeck (inşallah)
  const fetchRouteDetails = useCallback(async () => {
    setErrorMessage('');
    setDisplayedRouteDetails(null);
    setIsLoading(true);

    if (selectedBusNumber.trim() === '') {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/route-details/${selectedBusNumber}/${selectedDirection}`);
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
  }, [selectedBusNumber, selectedDirection]);

  useEffect(() => {
    fetchRouteDetails();
  }, [fetchRouteDetails]);

  const handleBusNumberChange = (e) => {
    setSelectedBusNumber(e.target.value.trim());
  };

  return (
    <div className="route-details-panel">
      <div className="panel-header">
        <h3>Güzergah Detayları</h3>
        <button onClick={onClose} className="close-button">X</button>
      </div>

      <div className="input-group">
        <label htmlFor="busNumberInput">Otobüs Numarası:</label>
        <input
          id="busNumberInput"
          type="text"
          value={selectedBusNumber}
          onChange={handleBusNumberChange}
          placeholder="Örn: 15"
          className="bus-number-input"
        />
      </div>

      <div className="direction-toggle">
        <button
          className={`direction-button ${selectedDirection === '1' ? 'active' : ''}`}
          onClick={() => setSelectedDirection('1')}
        >
          Gidiş
        </button>
        <button
          className={`direction-button ${selectedDirection === '2' ? 'active' : ''}`}
          onClick={() => setSelectedDirection('2')}
        >
          Dönüş
        </button>
      </div>

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