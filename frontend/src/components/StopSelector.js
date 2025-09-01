import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  onSelectAllStops,
  onSelectMultipleStops  // ✅ YENİ: Toplu seçim için prop
    
}) => {
  const dispatch = useDispatch();

  const [filteredStops, setFilteredStops] = useState([]); 
  
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Normal pagination için state'ler
  const [currentPage, setCurrentPage] = useState(0);
  const [stopsPerPage] = useState(50);
  const [hasMoreStops, setHasMoreStops] = useState(true);

  // Arama sonuçları için ayrı state'ler
  const [searchResults, setSearchResults] = useState([]);
  const [searchPage, setSearchPage] = useState(0);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);

  const [expandedStopId, setExpandedStopId] = useState(null); 
  const [stopRoutes, setStopRoutes] = useState({});

  // "Tümünü Seç" için state'ler
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const [totalStopCount, setTotalStopCount] = useState(0);

  // Debounce için timer
  const [searchTimer, setSearchTimer] = useState(null);

  // Normal durakları çekme fonksiyonu
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
            if (pageToLoad === 0) {
                // İlk sayfa - tüm durakları değiştir
                dispatch(setAllStops(data.stops || []));
            } else {
                // Sonraki sayfalar - mevcut durakları güncelle
                dispatch(setAllStops(prevStops => {
                    const existingStopIds = new Set(prevStops.map(stop => stop.id));
                    const uniqueNewStops = (data.stops || []).filter(stop => !existingStopIds.has(stop.id));
                    return [...prevStops, ...uniqueNewStops];
                }));
            }
            setHasMoreStops(data.hasMore);
        }
    } catch (error) {
        console.error('Duraklar çekilirken genel hata oluştu:', error);
        setHasMoreStops(false);
    } finally {
        setLoading(false);
        setIsLoadingMore(false);
    }
  }, [dispatch, stopsPerPage, searchTerm]);

  // Arama fonksiyonu - YENİ!
  const searchStops = useCallback(async (searchQuery, pageToLoad = 0) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (pageToLoad === 0) {
      setIsSearching(true);
    }

    try {
      const offset = pageToLoad * stopsPerPage;
      const response = await fetch(`http://localhost:5000/api/stops/search?q=${encodeURIComponent(searchQuery)}&limit=${stopsPerPage}&offset=${offset}`);
      const data = await response.json();

      if (response.ok) {
        if (pageToLoad === 0) {
          setSearchResults(data.stops || []);
        } else {
          setSearchResults(prev => [...prev, ...(data.stops || [])]);
        }
        setHasMoreSearchResults(data.hasMore);
        setSearchPage(pageToLoad);
      } else {
        console.error('Arama hatası:', data.error);
        setSearchResults([]);
        setHasMoreSearchResults(false);
      }
    } catch (error) {
      console.error('Arama sırasında hata:', error);
      setSearchResults([]);
      setHasMoreSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  }, [stopsPerPage]);

  // Toplam durak sayısını çek - YENİ!
  const fetchTotalStopCount = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/stops/count');
      const data = await response.json();
      if (response.ok) {
        setTotalStopCount(data.total);
      }
    } catch (error) {
      console.error('Toplam durak sayısı alınırken hata:', error);
    }
  }, []);

  const fetchStopRoutes = useCallback(async (stopId) => {
    if (stopRoutes[stopId]) {
      return; 
    }

    try {
      const response = await fetch(`http://localhost:5000/api/stop-routes/${stopId}`);
      const data = await response.json();

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

  // İlk yükleme
  useEffect(() => {
    if (currentPage === 0 && allStops.length === 0 && searchTerm === '') {
      fetchStops(0);
      fetchTotalStopCount(); // YENİ!
    }
  }, [currentPage, allStops.length, searchTerm, fetchStops, fetchTotalStopCount]);

  // Arama ve filtreleme mantığı - YENİ!
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredStops(allStops);
      setSearchResults([]);
      setIsSearching(false);
    } else {
      // Debounce arama
      if (searchTimer) {
        clearTimeout(searchTimer);
      }

      const timer = setTimeout(() => {
        searchStops(searchTerm, 0);
      }, 300); // 300ms debounce

      setSearchTimer(timer);

      // Cleanup function
      return () => {
        if (timer) {
          clearTimeout(timer);
        }
      };
    }
  }, [searchTerm, allStops, searchStops]);

  // Gösterilecek durakları belirle - YENİ!
  const displayedStops = useMemo(() => {
    if (searchTerm.trim() !== '') {
      return searchResults;
    }
    return filteredStops;
  }, [searchTerm, searchResults, filteredStops]);

  const toggleStopSelection = (stopId, event) => {
    event.stopPropagation(); 
    
    onToggleSelectedStop(stopId); 

    const isCurrentlySelected = selectedStopIds.includes(stopId);
    if (!isCurrentlySelected && onStopSelectForMap) { 
        // Durağı bul (arama sonuçlarından veya normal listeden)
        const selectedStop = displayedStops.find(stop => stop.id === stopId) || 
                            allStops.find(stop => stop.id === stopId);
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
    setExpandedStopId(null); // Arama yaparken detayları kapat
  };

  // ✅ SÜPER OPTIMIZE EDİLMİŞ "Tümünü Seç" fonksiyonu
  const handleSelectAllStopsClick = async () => {
    setIsSelectingAll(true);
    
    try {
      // Eğer arama yapılıyorsa, sadece arama sonuçlarını seç
      if (searchTerm.trim() !== '') {
        const newSelections = searchResults
          .map(stop => stop.id)
          .filter(id => !selectedStopIds.includes(id));
        
        if (newSelections.length > 0 && onSelectMultipleStops) {
          // ✅ YENİ: Toplu seçim kullan (çok daha hızlı!)
          onSelectMultipleStops(newSelections);
          console.log(`${newSelections.length} arama sonucu toplu seçildi`);
        }
      } else {
        // Tüm durakları seç
        try {
          const response = await fetch('http://localhost:5000/api/stops/all-ids');
          const data = await response.json();
          
          if (response.ok && data.stopIds) {
            const newSelections = data.stopIds.filter(id => !selectedStopIds.includes(id));
            
            if (newSelections.length > 0 && onSelectMultipleStops) {
              // ✅ YENİ: Toplu seçim kullan (performans optimizasyonu!)
              onSelectMultipleStops(newSelections);
              console.log(`${newSelections.length} yeni durak toplu seçildi`);
            }
          } else {
            throw new Error('API yanıtı hatalı');
          }
        } catch (error) {
          console.error('Tümünü seç API hatası:', error);
          
          // Fallback: Eski yöntem (tek tek seçim)
          const newSelections = allStops
            .filter(stop => !selectedStopIds.includes(stop.id))
            .map(stop => stop.id);
            
          if (newSelections.length > 0 && onSelectMultipleStops) {
            onSelectMultipleStops(newSelections);
          } else {
            // Son çare: tek tek seç
            newSelections.forEach(stopId => onToggleSelectedStop(stopId));
          }
          
          console.log(`Fallback: ${newSelections.length} yüklü durak seçildi`);
        }
      }
    } catch (error) {
      console.error('Tümünü seç genel hatası:', error);
    } finally {
      setIsSelectingAll(false);
    }
  };

  // Scroll handler - hem normal liste hem arama için
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    if (scrollPercentage > 0.9 && !isLoadingMore && !isSearching) {
      if (searchTerm.trim() !== '') {
        // Arama sonuçlarında daha fazla veri yükle
        if (hasMoreSearchResults) {
          const nextPage = searchPage + 1;
          searchStops(searchTerm, nextPage);
        }
      } else {
        // Normal liste için daha fazla veri yükle
        if (hasMoreStops) {
          const nextPage = currentPage + 1;
          setCurrentPage(nextPage);
          fetchStops(nextPage);
        }
      }
    }
  }, [
    hasMoreStops, hasMoreSearchResults, isLoadingMore, isSearching,
    searchTerm, currentPage, searchPage, fetchStops, searchStops
  ]);

  const handleStopNameClick = useCallback(async (stop) => {
    onStopSelectForMap(stop); 

    if (expandedStopId === stop.id) { 
      setExpandedStopId(null);
    } else { 
      setExpandedStopId(stop.id);
      await fetchStopRoutes(stop.id);
    }
  }, [onStopSelectForMap, expandedStopId, fetchStopRoutes]);

  const toggleStopExpansion = async (stopId, event) => {
    event.stopPropagation(); 

    if (expandedStopId === stopId) {
      setExpandedStopId(null);
    } else {
      setExpandedStopId(stopId);
      await fetchStopRoutes(stopId); 
    }
  };

  // Tümünü seç butonunu göster/gizle mantığı - YENİ!
  const shouldShowSelectAllButton = useMemo(() => {
    if (searchTerm.trim() !== '') {
      // Arama yapılıyorsa ve arama sonuçlarında seçilmeyen duraklar varsa
      const unselectedSearchResults = searchResults.filter(stop => !selectedStopIds.includes(stop.id));
      return unselectedSearchResults.length > 0;
    } else {
      // Normal listede - toplam durak sayısından fazlası seçilmemişse
      return selectedStopIds.length < totalStopCount && totalStopCount > 0;
    }
  }, [searchTerm, searchResults, selectedStopIds, totalStopCount]);

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
              {searchTerm.trim() !== '' ? 
                `${searchResults.length} arama sonucu` : 
                `${displayedStops.length} durak listeleniyor`
              }
              {totalStopCount > 0 && ` (Toplam: ${totalStopCount})`}
            </span>
          </div>
          {/* Action Butonları */}
          <div className="action-buttons-container">
            {shouldShowSelectAllButton && (
              <button 
                onClick={handleSelectAllStopsClick} 
                className="control-button select-all-stops-button"
                disabled={isSelectingAll}
              >
                {isSelectingAll ? 'Seçiliyor...' : 
                 searchTerm.trim() !== '' ? 'Bulunanları Seç' : 'Tümünü Seç'}
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
        {/* Loading göstergeleri */}
        {(loading || isSearching) && displayedStops.length === 0 ? (
          <div className="loading">
            {searchTerm.trim() !== '' ? 'Aranıyor...' : 'Duraklar yükleniyor...'}
          </div>
        ) : displayedStops.length === 0 ? (
          <div className="no-results">
            {searchTerm.trim() !== '' ? 'Arama sonucu bulunamadı' : 'Durak bulunamadı'}
          </div>
        ) : (
          <>
            {displayedStops.map(stop => (
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
                      
                      {/* Durak Bilgisi Tıklanabilir kısım */}
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

                {/* Hat Detayları */}
                {expandedStopId === stop.id && (
                  <div className="routes-from-stop-in-panel">
                    <h5>Bu duraktan geçen hatlar:</h5>
                    {stopRoutes[stop.id] ? (
                      stopRoutes[stop.id].length > 0 ? (
                        <ul className="routes-list">
                          {stopRoutes[stop.id].map((route, index) => (
                            <li key={index} className="route-item">
                              <span className="route-number">{route.route_number}</span>
                              {route.route_name && <span className="route-name"> - {route.route_name}</span>}
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
            
            {/* Daha fazla yükleme göstergesi */}
            {(isLoadingMore || isSearching) && (
              <div className="loading-more">
                {searchTerm.trim() !== '' ? 'Daha fazla arama sonucu yükleniyor...' : 'Daha fazla durak yükleniyor...'}
              </div>
            )}

            {/* Liste sonu mesajı */}
            {searchTerm.trim() === '' && !hasMoreStops && allStops.length > 0 && (
              <div className="end-of-list">
                <p>Tüm duraklar yüklendi ({allStops.length} durak)</p>
              </div>
            )}
            {searchTerm.trim() !== '' && !hasMoreSearchResults && searchResults.length > 0 && (
              <div className="end-of-list">
                <p>Tüm arama sonuçları gösteriliyor ({searchResults.length} sonuç)</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StopSelector;