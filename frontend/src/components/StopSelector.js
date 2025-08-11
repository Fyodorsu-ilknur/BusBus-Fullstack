// frontend/src/components/StopSelector.js
import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setAllStops, toggleSelectedStop, clearSelectedStops, selectAllStops } from '../store/selectedItemsSlice'; // Gerekli tüm Redux action'ları import edildi
import { FaSearch, FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa'; // react-icons importları

import './StopSelector.css';

const StopSelector = ({
  onClose,
  onStopSelectForMap,
  allStops,          // App.js'ten geliyor
  selectedStopIds,   // App.js'ten geliyor
  onToggleSelectedStop, // App.js'ten geliyor
  onClearSelectedStops, // App.js'ten geliyor
  onSelectAllStops    // App.js'ten geliyor
}) => {
  const dispatch = useDispatch();

  const [allLoadedStops, setAllLoadedStops] = useState([]); // API'den çekilen tüm duraklar (paginasyon için)
  const [filteredStops, setFilteredStops] = useState([]); // Arama ve filtreleme için
  
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(0);
  const [stopsPerPage] = useState(50);
  const [hasMoreStops, setHasMoreStops] = useState(true);

  const [expandedStopId, setExpandedStopId] = useState(null); // Detayları açık olan durağın ID'si
  const [stopRoutes, setStopRoutes] = useState({}); // Duraktan geçen hatların verisi

  // API'den durakları çekme fonksiyonu
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

  // Detay panelinde duraktan geçen hatları çekme fonksiyonu
  const fetchStopRoutes = useCallback(async (stopId) => {
    if (stopRoutes[stopId]) {
      return; // Zaten çekilmişse tekrar çekme
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

  // İlk yüklemede ve sayfa değiştiğinde durakları çekme
  useEffect(() => {
    if (currentPage === 0 && allStops.length === 0 && searchTerm === '') {
      fetchStops(0);
    }
  }, [currentPage, allStops.length, searchTerm, fetchStops]);

  // Arama terimi veya allStops değiştiğinde filtreleme
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredStops(allStops); // Arama boşsa, Redux'taki tüm durakları göster
    } else {
      const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
      const filtered = allStops.filter(stop => // allStops prop'u üzerinde filtreleme
        (stop.name && stop.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (stop.id && stop.id.toString().includes(lowerCaseSearchTerm))
      );
      setFilteredStops(filtered);
    }
  }, [searchTerm, allStops]);

  // Checkbox ile durak seçimi veya seçimi kaldırma
  const toggleStopSelection = (stopId, event) => {
    event.stopPropagation(); // Expand/collapse olayını tetiklemeyi önler
    
    onToggleSelectedStop(stopId); // App.js'ten gelen toggle callback'i çağırıyoruz

    // Harita üzerinde odaklama
    const isCurrentlySelected = selectedStopIds.includes(stopId);
    if (!isCurrentlySelected && onStopSelectForMap) { // Yeni seçildiyse haritada göster
        const selectedStop = allStops.find(stop => stop.id === stopId);
        if (selectedStop) {
            onStopSelectForMap(selectedStop);
        }
    } else if (isCurrentlySelected && onStopSelectForMap && selectedStopIds.length === 1) { // Son seçili durak kaldırılıyorsa harita seçimini sıfırla
        onStopSelectForMap(null);
    }
  };

  // Tüm seçili durakları temizleme
  const handleClearAll = () => {
    onClearSelectedStops(); // App.js'ten gelen callback'i çağır
    onStopSelectForMap(null); // Harita seçimini de temizle
  };

  // Arama kutusu değiştiğinde
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setExpandedStopId(null); // Arama yaparken detayları kapat
    // onStopSelectForMap(null); // Harita odağını sıfırlama (isteğe bağlı)
  };

  // KRİTİK: handleScroll fonksiyonu buraya EKLENİYOR
  const handleScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight;
    if (bottom && hasMoreStops && !isLoadingMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchStops(nextPage);
    }
  };

  // Durak adına tıklandığında haritada odaklama (genişletme/daraltma da burada)
  const handleStopNameClick = useCallback(async (stop) => {
    onStopSelectForMap(stop); // Haritada durağı seç

    if (expandedStopId === stop.id) { // Eğer zaten genişletilmişse kapat
      setExpandedStopId(null);
    } else { // Değilse genişlet ve hatları çek
      setExpandedStopId(stop.id);
      await fetchStopRoutes(stop.id);
    }
  }, [onStopSelectForMap, expandedStopId, fetchStopRoutes]);

  // Listede daha fazla durak yükleme
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreStops) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchStops(nextPage);
    }
  };

  // Detayları genişletme/daraltma butonu handler'ı
  const toggleStopExpansion = async (stopId, event) => {
    event.stopPropagation(); // Checkbox veya stop item'ın kendi tıklamasını engelle

    if (expandedStopId === stopId) {
      setExpandedStopId(null);
    } else {
      setExpandedStopId(stopId);
      await fetchStopRoutes(stopId); // Hatları çekme
    }
  };

  // "Tüm Durakları Seç" butonuna tıklama handler'ı
  const handleSelectAllStopsClick = () => {
    onSelectAllStops(); // App.js'ten gelen callback'i çağır
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
                  {/* Checkbox ve Bilgi Kısmı */}
                  <label className="stop-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedStopIds.includes(stop.id)}
                        onChange={(e) => toggleStopSelection(stop.id, e)}
                        className="stop-list-checkbox"
                      />
                      <span className="checkmark"></span>
                      
                      {/* Durak Bilgisi - Tıklanabilir kısım */}
                      <div className="stop-info-display">
                          <div className="stop-name-container" onClick={() => handleStopNameClick(stop)}>
                            <span className="stop-name">{stop.name}</span>
                            <span className="stop-details-text">ID: {stop.id} {stop.district && ` | ${stop.district}`}</span>
                          </div>
                      </div>
                  </label>
                  
                  {/* Genişletme/Daraltma Butonu */}
                  <button
                    className="expand-button"
                    onClick={(e) => toggleStopExpansion(stop.id, e)}
                    title="Duraktan geçen hatları göster"
                  >
                    {expandedStopId === stop.id ? <FaChevronUp /> : <FaChevronDown />}
                  </button>
                </div>

                {/* Hat Detay Paneli */}
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