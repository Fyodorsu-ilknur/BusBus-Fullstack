// frontend/src/components/RouteNavigationPanel.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaSearch, FaRoute, FaMapMarkerAlt, FaWalking, FaBus, FaExchangeAlt, FaTimes } from 'react-icons/fa';
import './RouteDetailsPanel.css';

function RouteNavigationPanel({ onClose, allStops, onRouteFound }) {
  const [startStop, setStartStop] = useState(''); // Başlangıç durağı (ad veya ID)
  const [endStopId, setEndStopId] = useState(''); // Varış durağı (ID)
  const [routeResult, setRouteResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Başlangıç durağı için arama
  const [startSearchTerm, setStartSearchTerm] = useState('');
  const [filteredStartStops, setFilteredStartStops] = useState([]);
  const [showStartDropdown, setShowStartDropdown] = useState(false);
  const startInputRef = useRef(null);

  // Varış durağı için arama
  const [endSearchTerm, setEndSearchTerm] = useState('');
  const [filteredEndStops, setFilteredEndStops] = useState([]);
  const [showEndDropdown, setShowEndDropdown] = useState(false);
  const endInputRef = useRef(null);

  // Başlangıç durağı filtreleme
  useEffect(() => {
    if (startSearchTerm.trim() === '') {
      setFilteredStartStops([]);
    } else {
      const lowerCaseSearchTerm = startSearchTerm.toLowerCase().trim();
      const filtered = (allStops || []).filter(stop =>
        (stop.name && stop.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (stop.id && stop.id.toString().includes(lowerCaseSearchTerm))
      ).slice(0, 10); // İlk 10 sonuç
      setFilteredStartStops(filtered);
    }
  }, [startSearchTerm, allStops]);

  // Varış durağı filtreleme
  useEffect(() => {
    if (endSearchTerm.trim() === '') {
      setFilteredEndStops([]);
    } else {
      const lowerCaseSearchTerm = endSearchTerm.toLowerCase().trim();
      const filtered = (allStops || []).filter(stop =>
        (stop.name && stop.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (stop.id && stop.id.toString().includes(lowerCaseSearchTerm))
      ).slice(0, 10); // İlk 10 sonuç
      setFilteredEndStops(filtered);
    }
  }, [endSearchTerm, allStops]);

  // Başlangıç durağı seçimi
  const handleStartStopSelection = (stop) => {
    setStartStop(stop.name || stop.id);
    setStartSearchTerm(stop.name || stop.id);
    setShowStartDropdown(false);
  };

  // Varış durağı seçimi
  const handleEndStopSelection = (stop) => {
    setEndStopId(stop.id);
    setEndSearchTerm(stop.name || stop.id);
    setShowEndDropdown(false);
  };

  // Rota oluştur
  const handleCreateRoute = async () => {
    if (!startStop || !endStopId) {
      setError('Lütfen başlangıç ve varış durağını seçin');
      return;
    }

    setIsLoading(true);
    setError('');
    setRouteResult(null);

    try {
      const response = await fetch('http://localhost:5000/api/route-navigation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startStop: startStop,
          endStopId: endStopId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Rota bulunamadı');
        setRouteResult(null);
      } else {
        setRouteResult(data);
        setError('');
        
        // Haritada rotayı göster
        if (onRouteFound) {
          onRouteFound(data);
        }
      }
    } catch (error) {
      console.error('Rota oluştururken hata:', error);
      setError('Rota oluşturulurken bir sorun oluştu.');
      setRouteResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="route-details-panel">
      <div className="panel-header">
        <h3>🧭 Nasıl Giderim?</h3>
        <button onClick={onClose} className="close-button">×</button>
      </div>

      {/* Başlangıç Durağı */}
      <div className="input-group search-dropdown-container">
        <label htmlFor="startStopInput">Başlangıç Durağı (ad veya ID):</label>
        <div className="search-input-wrapper">
          <FaMapMarkerAlt className="search-icon" style={{color: '#28a745'}} />
          <input
            id="startStopInput"
            type="text"
            value={startSearchTerm}
            onChange={(e) => {
              setStartSearchTerm(e.target.value);
              setStartStop('');
              setShowStartDropdown(true);
            }}
            onFocus={() => setShowStartDropdown(true)}
            onBlur={() => {
              setTimeout(() => {
                if (startInputRef.current && !startInputRef.current.contains(document.activeElement)) {
                  setShowStartDropdown(false);
                }
              }, 100);
            }}
            placeholder="Başlangıç durağını ara..."
            className="bus-number-input"
            ref={startInputRef}
          />
        </div>

        {showStartDropdown && filteredStartStops.length > 0 && (
          <ul className="route-search-dropdown">
            {filteredStartStops.map(stop => (
              <li
                key={`start-${stop.id}`}
                onClick={() => handleStartStopSelection(stop)}
                className="route-search-dropdown-item"
              >
                <FaMapMarkerAlt style={{color: '#28a745', marginRight: '8px'}} />
                <strong>{stop.name}</strong> (ID: {stop.id})
                {stop.district && <span style={{color: '#666'}}> | {stop.district}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Varış Durağı */}
      <div className="input-group search-dropdown-container">
        <label htmlFor="endStopInput">Varış Durağı (ID):</label>
        <div className="search-input-wrapper">
          <FaMapMarkerAlt className="search-icon" style={{color: '#dc3545'}} />
          <input
            id="endStopInput"
            type="text"
            value={endSearchTerm}
            onChange={(e) => {
              setEndSearchTerm(e.target.value);
              setEndStopId('');
              setShowEndDropdown(true);
            }}
            onFocus={() => setShowEndDropdown(true)}
            onBlur={() => {
              setTimeout(() => {
                if (endInputRef.current && !endInputRef.current.contains(document.activeElement)) {
                  setShowEndDropdown(false);
                }
              }, 100);
            }}
            placeholder="Varış durağını ara..."
            className="bus-number-input"
            ref={endInputRef}
          />
        </div>

        {showEndDropdown && filteredEndStops.length > 0 && (
          <ul className="route-search-dropdown">
            {filteredEndStops.map(stop => (
              <li
                key={`end-${stop.id}`}
                onClick={() => handleEndStopSelection(stop)}
                className="route-search-dropdown-item"
              >
                <FaMapMarkerAlt style={{color: '#dc3545', marginRight: '8px'}} />
                <strong>{stop.name}</strong> (ID: {stop.id})
                {stop.district && <span style={{color: '#666'}}> | {stop.district}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Rota Oluştur Butonu */}
      <div className="route-create-button-container" style={{margin: '20px 0'}}>
        <button 
          onClick={handleCreateRoute} 
          disabled={isLoading || !startStop || !endStopId}
          className="route-create-button"
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: (isLoading || !startStop || !endStopId) ? 0.6 : 1
          }}
        >
          {isLoading ? (
            <>
              <FaRoute style={{marginRight: '8px'}} />
              Rota Hesaplanıyor...
            </>
          ) : (
            <>
              <FaRoute style={{marginRight: '8px'}} />
              Rota Oluştur
            </>
          )}
        </button>
      </div>

      {/* Hata Mesajı */}
      {error && (
        <div className="error-message" style={{color: '#dc3545', padding: '10px', backgroundColor: '#f8d7da', borderRadius: '4px', marginBottom: '15px'}}>
          {error}
        </div>
      )}

      {/* Rota Sonucu */}
      {routeResult && (
        <div className="route-result-section">
          <h4 style={{color: '#007bff', marginBottom: '15px'}}>
            <FaRoute style={{marginRight: '8px'}} />
            Rota Bilgileri
          </h4>

          {routeResult.segments && routeResult.segments.map((segment, index) => (
            <div key={index} className="route-segment" style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '10px',
              border: '1px solid #dee2e6'
            }}>
              
              {segment.type === 'bus' && (
                <>
                  <div style={{display: 'flex', alignItems: 'center', marginBottom: '8px'}}>
                    <FaBus style={{color: '#007bff', marginRight: '8px'}} />
                    <strong>Otobüs: {segment.route_number}</strong>
                  </div>
                  <p><FaMapMarkerAlt style={{color: '#28a745', marginRight: '5px'}} />
                     <strong>Binme:</strong> {segment.boarding_stop} (ID: {segment.boarding_stop_id})
                  </p>
                  <p><FaMapMarkerAlt style={{color: '#dc3545', marginRight: '5px'}} />
                     <strong>İnme:</strong> {segment.alighting_stop} (ID: {segment.alighting_stop_id})
                  </p>
                  <p><strong>Durak Sayısı:</strong> {segment.stop_count} durak</p>
                  {segment.wheelchair_accessible && (
                    <p style={{color: '#28a745'}}>♿ Tekerlekli sandalye erişimi</p>
                  )}
                  {segment.bicycle_accessible && (
                    <p style={{color: '#17a2b8'}}>🚲 Bisiklet taşınabilir</p>
                  )}
                </>
              )}

              {segment.type === 'walk' && (
                <>
                  <div style={{display: 'flex', alignItems: 'center', marginBottom: '8px'}}>
                    <FaWalking style={{color: '#ffc107', marginRight: '8px'}} />
                    <strong>Yürüyüş</strong>
                  </div>
                  <p><strong>Mesafe:</strong> {segment.distance} metre</p>
                  <p><strong>Süre:</strong> {segment.duration} dakika</p>
                  <p><strong>Başlangıç:</strong> {segment.from}</p>
                  <p><strong>Bitiş:</strong> {segment.to}</p>
                </>
              )}

              {index < routeResult.segments.length - 1 && (
                <div style={{textAlign: 'center', margin: '10px 0'}}>
                  <FaExchangeAlt style={{color: '#6c757d'}} />
                </div>
              )}
            </div>
          ))}

          {/* Toplam Süre ve Mesafe */}
          {routeResult.summary && (
            <div className="route-summary" style={{
              backgroundColor: '#e3f2fd',
              padding: '15px',
              borderRadius: '8px',
              marginTop: '15px',
              border: '2px solid #2196f3'
            }}>
              <h5 style={{color: '#1976d2', marginBottom: '10px'}}>Özet</h5>
              <p><strong>Toplam Süre:</strong> {routeResult.summary.total_duration} dakika</p>
              <p><strong>Toplam Mesafe:</strong> {routeResult.summary.total_distance} metre</p>
              <p><strong>Transfer Sayısı:</strong> {routeResult.summary.transfers}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RouteNavigationPanel;