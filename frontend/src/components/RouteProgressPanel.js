import React from 'react';
import './RouteProgressPanel.css'; 
// import { formatTime } from '../utils/formatters'; 

const locationIcon = require('../assets/location.png');

function RouteProgressPanel({ selectedRoute, currentStop }) { 
  if (!selectedRoute || !selectedRoute.stops || selectedRoute.stops.length === 0) {
    return null;
  }

  return (
    <div className="route-progress-panel">
      <div className="panel-header">
        <h3>{selectedRoute.route_number} Numaralı Hat - Güzergah Takip</h3>
      </div>
      
      {/* <div className="progress-summary">
        {distanceToDestination !== null && (
          <p>Kalan: <strong>{(distanceToDestination / 1000).toFixed(2)} km</strong></p>
        )}
        {timeToDestination !== null && (
          <p>Kalan Süre: <strong>{formatTime(timeToDestination)}</strong></p>
        )}
      </div> */}
      
      <div className="stop-list-scroll-area">
        <ul className="route-stops-list">
          {selectedRoute.stops.map((stop) => (
            <li
              key={stop.id + "-" + stop.sequence}
              className={`route-stop-item ${currentStop && currentStop.id === stop.id ? 'active-stop' : ''}`}
            >
              {currentStop && currentStop.id === stop.id && (
                <img src={locationIcon} alt="Current Stop" className="current-stop-icon" />
              )}
              {stop.sequence}. {stop.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default RouteProgressPanel;