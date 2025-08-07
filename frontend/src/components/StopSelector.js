// frontend/src/components/StopSelector.js
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSelectedStop, clearSelectedStops, setAllStops } from '../store/selectedItemsSlice';
import './StopSelector.css';

const StopSelector = ({ onClose, onStopSelectForMap }) => { 
  const dispatch = useDispatch();
  const selectedStopIds = useSelector(state => state.selectedItems.selectedStopIds);
  
  const [allLoadedStops, setAllLoadedStops] = useState([]);
  const [filteredStops, setFilteredStops] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false); 
  
  const [currentPage, setCurrentPage] = useState(0);
  const [stopsPerPage] = useState(50); 
  const [hasMoreStops, setHasMoreStops] = useState(true);

  const [selectedStopDetailsForPanel, setSelectedStopDetailsForPanel] = useState(null); 
  const [routesForClickedStop, setRoutesForClickedStop] = useState([]);

  const fetchStops = useCallback(async (pageToLoad) => {
    if (pageToLoad === 0 && searchTerm === '') {
        setLoading(true);
    } else {
        setIsLoadingMore(true);
    }
    
    try {
        const offset = pageToLoad * stopsPerPage;
        const response = await fetch(`http://localhost:5000/api/stops?limit=${stopsPerPage}&offset=${offset}`); 
        const data = await response.json();

        if (!response.ok) {
            console.error(`Duraklar çekilirken hata oluştu: ${response.status} - ${data.error || 'Bilinmeyen hata'}`);
            setHasMoreStops(false);
        } else {
            setAllLoadedStops(prevStops => [...prevStops, ...data.stops]);
            setHasMoreStops(data.hasMore);
            dispatch(setAllStops([...allLoadedStops, ...data.stops])); 
        }
    } catch (error) {
        console.error('Duraklar çekilirken genel hata oluştu:', error);
        setHasMoreStops(false);
    } finally {
        setLoading(false);
        setIsLoadingMore(false);
    }
  }, [dispatch, stopsPerPage, searchTerm, allLoadedStops]);

  useEffect(() => {
    if (currentPage === 0 && allLoadedStops.length === 0) {
        fetchStops(0);
    }
  }, [fetchStops, currentPage, allLoadedStops.length]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredStops(allLoadedStops);
    } else {
      const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
      const filtered = allLoadedStops.filter(stop => 
        (stop.name && stop.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (stop.id && stop.id.toString().includes(lowerCaseSearchTerm))
      );
      setFilteredStops(filtered);
    }
  }, [searchTerm, allLoadedStops]);

  const handleStopToggle = (stopId) => {
    dispatch(toggleSelectedStop(stopId));
  };

  const handleClearAll = () => {
    dispatch(clearSelectedStops());
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setSelectedStopDetailsForPanel(null);
    setRoutesForClickedStop([]);
  };

  const handleStopClick = useCallback(async (stop) => { 
    if (selectedStopDetailsForPanel?.id === stop.id) {
      setSelectedStopDetailsForPanel(null);
      setRoutesForClickedStop([]);
      onStopSelectForMap(null);
    } else {
      setSelectedStopDetailsForPanel(stop);
      onStopSelectForMap(stop);

      setRoutesForClickedStop([]);
      try {
        const response = await fetch(`http://localhost:5000/api/stop-routes/${stop.id}`);
        if (response.ok) {
          const data = await response.json();
          setRoutesForClickedStop(data);
        } else {
          console.error("Duraktan geçen hatlar çekilemedi:", stop.id, response.status, await response.text());
          setRoutesForClickedStop([]);
        }
      } catch (error) {
        console.error("Duraktan geçen hatlar çekilirken hata:", error);
        setRoutesForClickedStop([]);
      }
    }
  }, [selectedStopDetailsForPanel, onStopSelectForMap]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreStops) {
      setCurrentPage(prevPage => prevPage + 1);
      fetchStops(currentPage + 1);
    }
  };


  return (
    <div className="stop-selector">
      <div className="stop-selector-header">
        <h2>Durak Seçimi</h2>
        <button onClick={onClose} className="close-button">
          ×
        </button>
      </div>

      <div className="stop-selector-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Durak adı veya ID ara..." 
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
        
        <div className="info-and-clear-button"> {/* Yeni bir div */}
          <div className="selected-info-text">
            <span className="selected-count">
              {selectedStopIds.length} durak seçili
            </span>
            <span className="listed-count"> {/* Yeni metin */}
              {filteredStops.length} durak listeleniyor
            </span>
          </div>
          {selectedStopIds.length > 0 && (
            <button onClick={handleClearAll} className="clear-all-button">
              Tümünü Temizle
            </button>
          )}
        </div>
      </div>

      <div className="stops-list"> 
        {loading && allLoadedStops.length === 0 ? (
          <div className="loading">Duraklar yükleniyor...</div>
        ) : filteredStops.length === 0 ? (
          <div className="no-results">
            {searchTerm ? 'Arama sonucu bulunamadı' : 'Durak bulunamadı'}
          </div>
        ) : (
          <>
            {filteredStops.map(stop => (
              <div
                key={stop.id}
                className={`stop-item ${selectedStopIds.includes(stop.id) ? 'selected' : ''} ${selectedStopDetailsForPanel?.id === stop.id ? 'active-details' : ''}`}
              >
                  <label className="stop-checkbox" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedStopIds.includes(stop.id)}
                        onChange={() => handleStopToggle(stop.id)}
                      />
                      <span className="checkmark"></span>
                      <div className="stop-info" onClick={() => handleStopClick(stop)}>
                          <div className="stop-name">{stop.name}</div>
                          <div className="stop-details">
                              ID: {stop.id} | Lat: {stop.lat?.toFixed(4)}, Lng: {stop.lng?.toFixed(4)}
                              {stop.district && ` | ${stop.district}`}
                          </div>
                      </div>
                  </label>
                  {selectedStopDetailsForPanel?.id === stop.id && routesForClickedStop.length > 0 && (
                    <div className="routes-from-stop-in-panel">
                        <h5>Bu Duraktan Geçen Hatlar:</h5>
                        <ul>
                            {routesForClickedStop.map(route => (
                                <li key={route.id}>
                                    <strong>{route.route_number}</strong> - {route.route_name}
                                </li>
                            ))}
                        </ul>
                    </div>
                  )}
                  {selectedStopDetailsForPanel?.id === stop.id && routesForClickedStop.length === 0 && (
                      <div className="routes-from-stop-in-panel">
                          <p className="info-message">Bu duraktan geçen hat bulunamadı.</p>
                      </div>
                  )}
              </div>
            ))}
            {hasMoreStops && (
              <div className="load-more-container">
                <button onClick={handleLoadMore} disabled={isLoadingMore} className="load-more-button">
                  {isLoadingMore ? 'Yükleniyor...' : 'Daha Fazla Göster'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StopSelector;