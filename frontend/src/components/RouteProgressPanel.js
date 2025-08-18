// frontend/src/components/RouteProgressPanel.js
import React, { useCallback } from 'react'; // useCallback artık kullanılmadığı için kaldırılmalı
import './RouteProgressPanel.css';

const locationIcon = require('../assets/location.png');

// SIMULATED_BUS_SPEED_KMH bu panelde kullanılmadığı için KALDIRILDI!
// const SIMULATED_BUS_SPEED_KMH = 30;

function RouteProgressPanel({
  route,
  currentAnimatedStop,
  onClose,
  currentDirection,
  onToggleDirection,
  distanceToDestination,
  timeToDestination
}) {
  // formatTime bu panelde artık kullanılmadığı için KALDIRILDI!
  // const formatTime = useCallback((totalSeconds) => {
  //   if (totalSeconds === null || isNaN(totalSeconds) || totalSeconds < 0) return 'Hesaplanıyor...';
  //   if (totalSeconds < 1) return 'Vardı';

  //   const minutes = Math.floor(totalSeconds / 60);
  //   const seconds = Math.round(totalSeconds % 60);

  //   if (minutes > 0) {
  //     return `${minutes} dk ${seconds} sn`;
  //   } else {
  //     return `${seconds} sn`;
  //   }
  // }, []);

  if (!route || !route.directions) {
    return (
      <div className="route-progress-panel">
        <div className="panel-header">
          <h3>Durak Takibi</h3>
          <button onClick={onClose} className="close-button">X</button>
        </div>
        <div className="no-route-message">
          <p>Takip edilecek güzergah bulunamadı.</p>
          <p>Lütfen önce bir hat seçin ve animasyonu başlatın.</p>
        </div>
      </div>
    );
  }

  const getCurrentStops = () => {
    if (route.directionsStops && route.directionsStops[currentDirection]) {
      return route.directionsStops[currentDirection];
    }
    
    if (currentDirection === '1' && route.stops) {
      return route.stops;
    }
    
    return [];
  };

  const currentStops = getCurrentStops();


  return (     
    <div className="route-progress-panel">       
      <div className="panel-header">         
        <h3>{route.route_number} Numaralı Hat - Durak Takibi</h3>         
        <button onClick={onClose} className="close-button">✕</button>       
      </div>        

      {/* Güzergah Bilgileri */}       
      <div className="route-info-section">         
        <div className="route-direction-info">           
          <strong>             
            {currentDirection === '1' ? '🚌 Gidiş' : '🔄 Dönüş'}: {' '}             
            {(route.start_point || route.end_point) ? (
                currentDirection === '1'
                  ? `${route.start_point || ''} ${route.start_point && route.end_point ? '→' : ''} ${route.end_point || ''}`
                  : `${route.end_point || ''} ${route.start_point && route.end_point ? '→' : ''} ${route.start_point || ''}`
            ) : (
              null
            )}
          </strong>         
        </div>                  
        
        {/* Yön Değiştirme Butonu */}         
        {route.directions && route.directions['2'] && route.directions['2'].length > 0 && (           
          <button              
            className="direction-toggle-btn"             
            onClick={() => onToggleDirection && onToggleDirection(currentDirection === '1' ? '2' : '1')}           
          >             
            {currentDirection === '1' ? 'Dönüş Yönüne Geç' : 'Gidiş Yönüne Geç'}           
          </button>         
        )}       
      </div>        

      {/* Şu Anki Durak Bilgisi */}       
      {currentAnimatedStop && (         
        <div className="current-stop-info">           
          <div className="current-stop-card">             
            <img src={locationIcon} alt="Şu anki durak" className="current-stop-icon-large" />             
            <div className="current-stop-text">               
              <h4>Şu Anki Durak</h4>               
              <p><strong>{currentAnimatedStop.name}</strong></p>               
              <span className="stop-sequence">Sıra: {currentAnimatedStop.sequence}</span>             
            </div>           
          </div>         
        </div>       
      )}        

      {/* ANIMASYON BİLGİ KISMI BURADAN KALDIRILDI! */}
      {/* Bu kısım boş olacak */}

      {/* Durak Listesi */}       
      <div className="stop-list-scroll-area">         
        <h4>Tüm Duraklar ({currentStops.length} durak) - {currentDirection === '1' ? 'Gidiş' : 'Dönüş'} Yönü</h4>         
        <ul className="route-stops-list">           
          {currentStops.map((stop) => (             
            <li               
              key={`${stop.id}-${stop.sequence}-${currentDirection}`}               
              className={`route-stop-item ${                 
                currentAnimatedStop && currentAnimatedStop.id === stop.id ? 'active-stop' : ''               
              }`}             >               
              <div className="stop-number">{stop.sequence}</div>               
              <div className="stop-details">                 
                <span className="stop-name">{stop.name}</span>                 
                {currentAnimatedStop && currentAnimatedStop.id === stop.id && (                   
                  <span className="active-indicator">🚌 Şu anda burada</span>                 
                )}               
              </div>               
              {currentAnimatedStop && currentAnimatedStop.id === stop.id && (                 
                <img src={locationIcon} alt="Şu anki durak" className="current-stop-icon" />               
                )}             
            </li>           
          ))}         
        </ul>       
      </div>            
    </div>   
  ); 
}  

export default RouteProgressPanel;