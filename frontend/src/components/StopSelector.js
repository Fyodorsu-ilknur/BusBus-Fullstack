import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setAllStops, toggleSelectedStop, clearSelectedStops, selectAllStops } from '../store/selectedItemsSlice'; 
import { FaSearch, FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa'; 

import './StopSelector.css';

const StopSelector = ({
  onClose,
  onStopSelectForMap,
  allStops,          
  selectedStopIds,   
  onToggleSelectedStop, 
  onClearSelectedStops, 
  onSelectAllStops    
}) => {
  const dispatch = useDispatch();

  const [allLoadedStops, setAllLoadedStops] = useState([]); 
  const [filteredStops, setFilteredStops] = useState([]); // Arama ve filtreleme için
  
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(0);
  const [stopsPerPage] = useState(50);
  const [hasMoreStops, setHasMoreStops] = useState(true);

  const [expandedStopId, setExpandedStopId] = useState(null); 
  const [stopRoutes, setStopRoutes] = useState({}); 

  // APIden durkları çekme 
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
            setAllLoadedStops(prevStops => {
                const existingStopIds = new Set(prevStops.map(stop => stop.id));
                const uniqueNewStops = (data.stops || []).filter(stop => !existingStopIds.has(stop.id));
                
                const updatedStops = [...prevStops, ...uniqueNewStops];
                dispatch(setAllStops(updatedStops));
                return updatedStops;
            });
            setHasMoreStops(data.hasMore);
        }
    } catch (error) {
        console.error('Duraklar çekilirken genel hata oluştu:', error);
        setHasMoreStops(false);
    } finally {
        setLoading(false);
        setIsLoadingMore(false);
    }
  }, [dispatch, stopsPerPage, searchTerm, setAllStops]);

  const fetchStopRoutes = useCallback(async (stopId) => {
    if (stopRoutes[stopId]) {
      return; 
    }

    try {
      const response = await fetch(`http://localhost:5000/api/stop-routes/${stopId}`);
      const data = await response.json();
          console.log(`API'den gelen hat verisi (Durak ${stopId}):`, data);



      if (response.ok) {
        setStopRoutes(prev => ({
          ...prev,
          [stopId]: data || []
        }));
      } else {
        console.error(`Durak hatları çekilirken hata: ${stopId}`, response.status);
        setStopRoutes(prev => ({
          ...prev,
          [stopId]: []
        }));
      }
    } catch (error) {
      console.error(`Durak hatları çekilirken genel hata: ${stopId}`, error);
      setStopRoutes(prev => ({
        ...prev,
        [stopId]: []
      }));
    }
  }, [stopRoutes]);

  // İlk yüklemde bide sayfa değştiğinde durkları çekme
  useEffect(() => {
    if (currentPage === 0 && allStops.length === 0 && searchTerm === '') {
      fetchStops(0);
    }
  }, [currentPage, allStops.length, searchTerm, fetchStops]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredStops(allStops); // Arama boşsa Reduxaki tüm durakları göstr
    } else {
      const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
      const filtered = allStops.filter(stop => 
        (stop.name && stop.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (stop.id && stop.id.toString().includes(lowerCaseSearchTerm))
      );
      setFilteredStops(filtered);
    }
  }, [searchTerm, allStops]);

  const toggleStopSelection = (stopId, event) => {
    event.stopPropagation(); 
    
    onToggleSelectedStop(stopId); 

    const isCurrentlySelected = selectedStopIds.includes(stopId);
    if (!isCurrentlySelected && onStopSelectForMap) { 
        const selectedStop = allStops.find(stop => stop.id === stopId);
        if (selectedStop) {
            onStopSelectForMap(selectedStop);
        }
    } else if (isCurrentlySelected && onStopSelectForMap && selectedStopIds.length === 1) { 
        onStopSelectForMap(null);
    }
  };

  const handleClearAll = () => {
    onClearSelectedStops(); 
    onStopSelectForMap(null); 
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setExpandedStopId(null); // Arama yapaken detyları kapat
  };

  const handleScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight;
    if (bottom && hasMoreStops && !isLoadingMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchStops(nextPage);
    }
  };

  const handleStopNameClick = useCallback(async (stop) => {
    onStopSelectForMap(stop); 

    if (expandedStopId === stop.id) { 
      setExpandedStopId(null);
    } else { 
      setExpandedStopId(stop.id);
      await fetchStopRoutes(stop.id);
    }
  }, [onStopSelectForMap, expandedStopId, fetchStopRoutes]);

  // daha fazla durak yükleme
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreStops) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchStops(nextPage);
    }
  };

  const toggleStopExpansion = async (stopId, event) => {
    event.stopPropagation(); 

    if (expandedStopId === stopId) {
      setExpandedStopId(null);
    } else {
      setExpandedStopId(stopId);
      await fetchStopRoutes(stopId); 
    }
  };

  const handleSelectAllStopsClick = () => {
    onSelectAllStops(); 
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
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Durak adı veya ID ara..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
        
        <div className="info-and-clear-button">
          <div className="selected-info-text">
            <span className="selected-count">
              {selectedStopIds.length} durak seçili
            </span>
            <span className="listed-count">
              {filteredStops.length} durak listeleniyor
            </span>
          </div>
          {/* Action Butonları */}
          <div className="action-buttons-container">
            {selectedStopIds.length < filteredStops.length && filteredStops.length > 0 && (
              <button onClick={handleSelectAllStopsClick} className="control-button select-all-stops-button">
                Tümünü Seç
              </button>
            )}
            {selectedStopIds.length > 0 && (
              <button onClick={handleClearAll} className="control-button clear-all-stops-button">
                <FaTimes /> Temizle
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        className="stops-list"
        onScroll={handleScroll}
      >
        {loading && allStops.length === 0 ? (
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
                className={`stop-item-wrapper ${expandedStopId === stop.id ? 'expanded' : ''}`}
              >
                <div
                  className={`stop-item ${selectedStopIds.includes(stop.id) ? 'selected' : ''}`}
                >
                  <label className="stop-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedStopIds.includes(stop.id)}
                        onChange={(e) => toggleStopSelection(stop.id, e)}
                        className="stop-list-checkbox"
                      />
                      <span className="checkmark"></span>
                      
                      {/* Durak Bilgisi Tıklnabilir kısım */}
                      <div className="stop-info-display">
                          <div className="stop-name-container" onClick={() => handleStopNameClick(stop)}>
                            <span className="stop-name">{stop.name}</span>
                            <span className="stop-details-text">ID: {stop.id} {stop.district && ` | ${stop.district}`}</span>
                          </div>
                      </div>
                  </label>
                  
                  <button
                    className="expand-button"
                    onClick={(e) => toggleStopExpansion(stop.id, e)}
                    title="Duraktan geçen hatları göster"
                  >
                    {expandedStopId === stop.id ? <FaChevronUp /> : <FaChevronDown />}
                  </button>
                </div>

                {/* Hat Detay */}
                {expandedStopId === stop.id && (
                  <div className="routes-from-stop-in-panel">
                    <h5>Bu duraktan geçen hatlar:</h5>
                    {stopRoutes[stop.id] ? (
                      stopRoutes[stop.id].length > 0 ? (
                        <ul className="routes-list">
                          {stopRoutes[stop.id].map((route, index) => (
                            <li key={index} className="route-item">
                              <span className="route-number">{route.route_number}</span>
                              <span className="route-name">{route.route_name}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="no-routes">Bu duraktan geçen hat bulunamadı</p>
                      )
                    ) : (
                      <div className="loading-routes">Hatlar yükleniyor...</div>
                    )}
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