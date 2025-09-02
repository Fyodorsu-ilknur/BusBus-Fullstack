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
  
  // Normal pagination için state'ler - ARTIRILDI
  const [currentPage, setCurrentPage] = useState(0);
  const [stopsPerPage] = useState(100); // 50'den 100'e çıkarıldı
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

  // Normal durakları çekme fonksiyonu - OPTIMIZE EDİLDİ
  const fetchStops = useCallback(async (pageToLoad) => {
    if (pageToLoad === 0 && searchTerm === '') {
        setLoading(true);
    } else {
        setIsLoadingMore(true);
    }
    
    try {
        const offset = pageToLoad * stopsPerPage;
        // İlk yükleme veya "Tümünü Seç" için daha fazla veri çek
        const limitToUse = pageToLoad === 0 ? Math.min(1000, stopsPerPage * 10) : stopsPerPage;
        
        const response = await fetch(`http://localhost:5000/api/stops?limit=${limitToUse}&offset=${offset}`);
        const data = await response.json();

        if (!response.ok) {
            console.error(`Duraklar çekilirken hata oluştu: ${response.status} - ${data.error || 'Bilinmeyen hata'}`);
            setHasMoreStops(false);
        } else {
            if (pageToLoad === 0) {
                // İlk sayfa - tüm durakları değiştir
                dispatch(setAllStops(data.stops || []));
                console.log(`İlk yükleme: ${data.stops?.length || 0} durak yüklendi`);
            } else {
                // Sonraki sayfalar - mevcut durakları güncelle
                dispatch(setAllStops(prevStops => {
                    const existingStopIds = new Set(prevStops.map(stop => stop.id));
                    const uniqueNewStops = (data.stops || []).filter(stop => !existingStopIds.has(stop.id));
                    console.log(`Sayfa ${pageToLoad}: ${uniqueNewStops.length} yeni durak eklendi`);
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

  // Arama fonksiyonu - OPTIMIZE EDİLDİ
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
      // Arama için de daha büyük limit
      const searchLimit = pageToLoad === 0 ? 500 : stopsPerPage;
      
      const response = await fetch(`http://localhost:5000/api/stops/search?q=${encodeURIComponent(searchQuery)}&limit=${searchLimit}&offset=${offset}`);
      const data = await response.json();

      if (response.ok) {
        if (pageToLoad === 0) {
          setSearchResults(data.stops || []);
          console.log(`Arama sonucu: ${data.stops?.length || 0} durak bulundu`);
        } else {
          setSearchResults(prev => {
            const newResults = [...prev, ...(data.stops || [])];
            console.log(`Arama sayfası ${pageToLoad}: Toplam ${newResults.length} sonuç`);
            return newResults;
          });
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

  // Toplam durak sayısını çek
  const fetchTotalStopCount = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/stops/count');
      const data = await response.json();
      if (response.ok) {
        setTotalStopCount(data.total);
        console.log(`Toplam durak sayısı: ${data.total}`);
      }
    } catch (error) {
      console.error('Toplam durak sayısı alınırken hata:', error);
    }
  }, []);

  // İlk 100 durak yükleme (görüntüleme için)
  const fetchInitialStops = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/stops?limit=100&offset=0');
      const data = await response.json();
      
      if (response.ok) {
        dispatch(setAllStops(data.stops || []));
        console.log(`İlk 100 durak yüklendi: ${data.stops?.length || 0} adet`);
        setHasMoreStops(data.hasMore);
      } else {
        console.error('İlk duraklar çekilirken hata:', data.error);
      }
    } catch (error) {
      console.error('İlk duraklar çekilirken genel hata:', error);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // "Tümünü Seç" için 1000 durağı önceden yükleme
  const preloadStopsForSelectAll = useCallback(async () => {
    console.log('Tümünü seç için duraklar önceden yükleniyor...');
    try {
      const response = await fetch('http://localhost:5000/api/stops?limit=1000&offset=0');
      const data = await response.json();
      
      if (response.ok && data.stops) {
        dispatch(setAllStops(data.stops));
        console.log(`Tümünü seç için ${data.stops.length} durak yüklendi`);
        setHasMoreStops(data.hasMore);
      }
    } catch (error) {
      console.error('Tümünü seç için durak yükleme hatası:', error);
    }
  }, [dispatch]);

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

  // İlk yükleme - GÜNCELLENDI: Sadece 100 durak göster
  useEffect(() => {
    if (currentPage === 0 && allStops.length === 0 && searchTerm === '') {
      // İlk başta sadece 100 durağı yükle (görüntüleme için)
      fetchInitialStops();
      fetchTotalStopCount();
    }
  }, [currentPage, allStops.length, searchTerm, fetchInitialStops, fetchTotalStopCount]);

  // Arama ve filtreleme mantığı
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

  // Gösterilecek durakları belirle
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

  // ✅ SÜPER OPTIMIZE EDİLMİŞ "Tümünü Seç" fonksiyonu - GÜNCELLENDİ
  const handleSelectAllStopsClick = async () => {
    setIsSelectingAll(true);
    
    try {
      // Eğer arama yapılıyorsa, sadece arama sonuçlarını seç
      if (searchTerm.trim() !== '') {
        const newSelections = searchResults
          .map(stop => stop.id)
          .filter(id => !selectedStopIds.includes(id));
        
        if (newSelections.length > 0 && onSelectMultipleStops) {
          onSelectMultipleStops(newSelections);
          console.log(`${newSelections.length} arama sonucu toplu seçildi`);
        }
      } else {
        // Önce mevcut 1000 durağı kontrol et, yoksa yükle
        if (allStops.length < 1000) {
          console.log('1000 durak yükleniyor...');
await preloadStopsForSelectAll();        }
        
        // Artık tüm durağı API'den çekmek yerine mevcut 1000'i kullan
        try {
          // Optimizasyon: API yerine mevcut yüklü durakları kullan
          const availableStopIds = allStops.map(stop => stop.id);
          const newSelections = availableStopIds.filter(id => !selectedStopIds.includes(id));
          
          if (newSelections.length > 0 && onSelectMultipleStops) {
            onSelectMultipleStops(newSelections);
            console.log(`${newSelections.length} yüklü durak toplu seçildi (Toplam yüklü: ${allStops.length})`);
          } else {
            // Fallback: API'den tüm ID'leri çek
            const response = await fetch('http://localhost:5000/api/stops/all-ids?limit=1000');
            const data = await response.json();
            
            if (response.ok && data.stopIds) {
              const apiSelections = data.stopIds.filter(id => !selectedStopIds.includes(id));
              
              if (apiSelections.length > 0 && onSelectMultipleStops) {
                onSelectMultipleStops(apiSelections);
                console.log(`${apiSelections.length} durak API'den toplu seçildi`);
              }
            } else {
              throw new Error('API yanıtı hatalı');
            }
          }
        } catch (error) {
          console.error('Tümünü seç API hatası:', error);
          
          // Son fallback: Yüklü durakları tek tek seç
          const newSelections = allStops
            .filter(stop => !selectedStopIds.includes(stop.id))
            .map(stop => stop.id);
            
          if (newSelections.length > 0) {
            if (onSelectMultipleStops) {
              onSelectMultipleStops(newSelections);
            } else {
              // Çok son çare: tek tek seç (performans düşük!)
              newSelections.forEach(stopId => onToggleSelectedStop(stopId));
            }
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

  // YENİ: Daha fazla durak yükleme fonksiyonu
  const loadMoreStops = useCallback(async () => {
    if (allStops.length < 1000 && hasMoreStops) {
      const nextPage = Math.floor(allStops.length / stopsPerPage);
      setCurrentPage(nextPage);
      await fetchStops(nextPage);
    }
  }, [allStops.length, hasMoreStops, stopsPerPage, fetchStops]);

  // Scroll handler - GÜNCELLENDI
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
        loadMoreStops();
      }
    }
  }, [
    hasMoreSearchResults, isLoadingMore, isSearching,
    searchTerm, searchPage, searchStops, loadMoreStops
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

  // Tümünü seç butonunu göster/gizle mantığı - GÜNCELLENDI
  const shouldShowSelectAllButton = useMemo(() => {
    if (searchTerm.trim() !== '') {
      // Arama yapılıyorsa ve arama sonuçlarında seçilmeyen duraklar varsa
      const unselectedSearchResults = searchResults.filter(stop => !selectedStopIds.includes(stop.id));
      return unselectedSearchResults.length > 0;
    } else {
      // Normal listede - en az 1000 durak varsa ve hepsi seçilmemişse
      const availableToSelect = allStops.filter(stop => !selectedStopIds.includes(stop.id));
      return availableToSelect.length > 0;
    }
  }, [searchTerm, searchResults, selectedStopIds, allStops]);

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
                 searchTerm.trim() !== '' ? 'Bulunanları Seç' : 
                 `Tümünü Seç (${Math.min(1000, allStops.length)})`}
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
            {searchTerm.trim() === '' && !hasMoreStops && allStops.length > 0 && allStops.length < 200 && (
              <div className="end-of-list">
                <p>Yüklenen duraklar ({allStops.length} durak gösteriliyor)</p>
              </div>
            )}
            {searchTerm.trim() === '' && allStops.length >= 1000 && (
              <div className="end-of-list">
                <p>1000 durak yüklendi - Scroll yaparak daha fazla yükleyebilirsiniz</p>
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