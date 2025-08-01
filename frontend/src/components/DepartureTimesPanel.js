// frontend/src/components/DepartureTimesPanel.js
import React, { useState, useEffect, useCallback } from 'react';
import './RouteDetailsPanel.css'; // Stil aynı kalabilir

function DepartureTimesPanel({ onClose }) {
  const [selectedBusNumber, setSelectedBusNumber] = useState('');
  const [selectedDay, setSelectedDay] = useState('monday'); // Varsayılan gün
  const [departureData, setDepartureData] = useState(null); // API'den gelen gidiş/dönüş ayrılmış veri
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [displayDirection, setDisplayDirection] = useState('gidis'); // <-- Yeni state: 'gidis' veya 'donus'

  const daysOfWeek = [
    { key: 'monday', label: 'Pazartesi' },
    { key: 'tuesday', label: 'Salı' },
    { key: 'wednesday', label: 'Çarşamba' },
    { key: 'thursday', label: 'Perşembe' },
    { key: 'friday', label: 'Cuma' },
    { key: 'saturday', label: 'Cumartesi' },
    { key: 'sunday', label: 'Pazar' },
  ];

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
        // Eğer data içinde gidis seferleri yoksa ve donus seferleri varsa otomatik olarak donus'e geç
        if (data.gidis.length === 0 && data.donus.length > 0) {
            setDisplayDirection('donus');
        } else {
            setDisplayDirection('gidis'); // Varsayılan olarak gidiş göster
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

  const handleBusNumberChange = (e) => {
    setSelectedBusNumber(e.target.value.trim());
  };

  const handleDayChange = (e) => {
    setSelectedDay(e.target.value);
  };

  return (
    <div className="route-details-panel"> {/* Aynı stil dosyasını kullanıyoruz */}
      <div className="panel-header">
        <h3>Kalkış Saatleri</h3>
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

      <div className="input-group">
        <label htmlFor="daySelect">Gün Seçin:</label>
        <select
          id="daySelect"
          value={selectedDay}
          onChange={handleDayChange}
          className="bus-number-input" // Aynı input stilini kullanabiliriz
        >
          {daysOfWeek.map(day => (
            <option key={day.key} value={day.key}>{day.label}</option>
          ))}
        </select>
      </div>

      {/* Gidiş/Dönüş butonları eklendi */}
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

      <div className="stop-list-section"> {/* Kaydırma çubuğu için stil bu sınıfta */}
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
            {/* Gidiş seferlerini sadece displayDirection 'gidis' ise göster */}
            {displayDirection === 'gidis' && departureData.gidis.length > 0 && (
              <div className="departure-group">
                <h5>Gidiş Seferleri</h5>
                <ul className="stop-list">
                  {departureData.gidis.map((item, index) => (
                    <li key={item.trip_id + index} className="stop-item">
                      {item.departure_time} - {item.first_stop_name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dönüş seferlerini sadece displayDirection 'donus' ise göster */}
            {displayDirection === 'donus' && departureData.donus.length > 0 && (
              <div className="departure-group">
                <h5>Dönüş Seferleri</h5>
                <ul className="stop-list">
                  {departureData.donus.map((item, index) => (
                    <li key={item.trip_id + index} className="stop-item">
                      {item.departure_time} - {item.first_stop_name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Hiçbir yönde veri yoksa veya seçili yönde veri yoksa bilgi mesajı */}
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