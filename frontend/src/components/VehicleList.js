
// frontend/src/components/VehicleList.js
import React, { useState, useEffect, useCallback } from 'react';
import './VehicleList.css';

function VehicleList({
  items = [],
  onItemClick,
  selectedVehicle, // App.js'teki selectedItem'a karşılık gelir
  onClose,
  onSearch,
  isRouteProgressPanelActive,
  onToggleRouteProgressPanelActive,
  selectedRouteIds = [],
  onToggleSelectedRoute,
  onClearSelectedRoutes,
  onSelectAllRoutes,
  selectedRoute, // App.js'teki selectedRoute'a karşılık gelir (animasyon için kullanılan hat objesi)
  currentDirection,
  onToggleDirection,
  theme
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = new useState(new Set()); // new Set() kullanımı doğru

  const handleSearchChange = (event) => {
    const term = event.target.value;
    setSearchTerm(term);
    onSearch(term);

    // Arama yapıldığında mevcut seçimi ve animasyonu sıfırla
    if (selectedVehicle) {
      if (typeof onItemClick === 'function') {
        onItemClick(null); // selectedItem ve selectedRoute'u null yapar
      }
    }
  };

  const handleRouteCheckboxChange = (routeId) => {
    onToggleSelectedRoute(routeId);
  };

  // "V" ikonuna tıklama işlevi: Paneli açıp kapatır, animasyonu başlatır/durdurur
  const handleDropdownToggle = (e, item) => {
    e.stopPropagation(); // Olayın üst elementlere yayılmasını engeller

    const isCurrentlyExpanded = expandedItems.has(item.id);
    const newExpandedItems = new Set(expandedItems);

    if (isCurrentlyExpanded) {
      // Eğer zaten açıksa, kapat ve her şeyi sıfırla (animasyon, panel vb.)
      newExpandedItems.delete(item.id);
      setExpandedItems(newExpandedItems);
      onItemClick(null); // selectedItem'ı null yaparak animasyonu ve paneli kapatır
    } else {
      // Eğer kapalıysa, aç ve animasyonu başlat
      newExpandedItems.add(item.id);
      setExpandedItems(newExpandedItems);

      if (!item || !item.route_number) {
        console.warn("Geçersiz veya eksik item bilgisi alındı:", item);
        return;
      }
      if (typeof onItemClick !== 'function') {
        console.error("Hata: onItemClick prop'u bir fonksiyon değil!", onItemClick);
        return;
      }
      onItemClick(item); // selectedItem'ı set ederek animasyonu başlatır
    }
  };

  // Hat adına tıklama işlevi: Sadece paneli açıp kapatır, animasyonu etkilemez
  // NOT: Bu fonksiyon çağrısı JSX'ten kaldırıldığı için sadece burada duruyor ama çağrılmayacak.
  const handleItemNameClick = (e, item) => {
    e.stopPropagation(); // Olayın üst elementlere yayılmasını engeller
    const isCurrentlyExpanded = expandedItems.has(item.id);
    const newExpandedItems = new Set(expandedItems);

    if (isCurrentlyExpanded) {
      newExpandedItems.delete(item.id);
    } else {
      newExpandedItems.add(item.id);
    }
    setExpandedItems(newExpandedItems);
  };

  // Durak Takibi Checkbox'ının değişim işlevi
  const handleToggleRouteProgress = useCallback(() => {
      onToggleRouteProgressPanelActive(); // App.js'teki fonksiyonu çağır
  }, [onToggleRouteProgressPanelActive]);


  // Gidiş/Dönüş butonuna tıklama işlevi
  const handleToggleDirectionClick = (e) => {
    e.stopPropagation(); // Olayın üst elementlere yayılmasını engeller
    // Yön değiştirme callback'i varsa ve diğer yön için güzergah verisi varsa
    if (onToggleDirection && selectedRoute?.directions?.[currentDirection === '1' ? '2' : '1']?.length > 0) {
      onToggleDirection(currentDirection === '1' ? '2' : '1');
    } else if (onToggleDirection && selectedRoute?.directions?.['1']?.length > 0) {
      // Sadece gidiş yönü varsa, gidiş yönünde kalmaya devam et
      onToggleDirection(currentDirection);
    }
  };

  return (
    <div className="vehicle-list-container">
      <div className="fixed-controls-container">
        <div className="list-header">
          <h2>Aktif Araçlar / Arama Sonuçları</h2>
          <button onClick={onClose} className="close-button">X</button>
        </div>

        <input
          type="text"
          placeholder="Hat No veya Hat Adı Giriniz"
          className="search-input"
          value={searchTerm}
          onChange={handleSearchChange}
        />

        <div className="route-selection-controls">
          <span className="selected-route-count">
            {selectedRouteIds.length} hat seçili
          </span>
          {selectedRouteIds.length < items.length && items.length > 0 && (
            <button onClick={onSelectAllRoutes} className="control-button select-all-routes-button">
              Tümünü Seç
            </button>
          )}
          {selectedRouteIds.length > 0 && (
            <button onClick={onClearSelectedRoutes} className="control-button clear-all-routes-button">
              Tüm Seçili Hatları Temizle
            </button>
          )}
        </div>
      </div>

      <ul className="list-items">
        {items.length > 0 ? (
          items.map((item) => (
            item && item.route_number ? (
              <li
                key={item.id}
                className={`vehicle-item ${selectedVehicle?.id === item.id ? 'selected' : ''} ${expandedItems.has(item.id) ? 'expanded' : ''}`}
              >
                <div className="item-title" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <input
                      type="checkbox"
                      checked={selectedRouteIds.includes(item.id)}
                      onClick={(e) => e.stopPropagation()} // Checkbox'ın tıklama olayının yayılmasını engelle
                      onChange={() => handleRouteCheckboxChange(item.id)} // Redux state'ini güncelle
                      className="vehicle-list-checkbox"
                    />

                    <div
                      className="route-summary-text"
                      // onClick={(e) => handleItemNameClick(e, item)} <-- BU SATIRI KALDIRILDI!
                      // Hat adına tıklama iptal edildi, sadece görsel genişletme/daraltma handleItemNameClick ile yapılmıyordu.
                      // Sadece V ikonuna tıklanınca genişlemesi isteniyorsa, onClick buraya da eklenmemeli.
                      // Şu anki mantıkta handleItemNameClick sadece V ikonunun onClick'i içinde çağrılıyor.
                    >
                      <strong>Hat No: {item.route_number}</strong>
                      {item.route_name && <span className="route-name-short"> ({item.route_name})</span>}
                      <br />
                  
                      {/* Güzergah Bilgisi Yok yazısını kaldırmak için: */}
                      {/* Sadece başlangıç veya bitiş noktası varsa render et */}
                      {(item.start_point || item.end_point) ? (
                        <span className="route-points-display">
                            {item.start_point}{' '}
                            {item.start_point && item.end_point ? '→' : ''}{' '}
                            {item.end_point}
                        </span>
                      ) : (
                        // Eğer iki bilgi de yoksa, boş bir span render et, hiçbir şey yazmasın.
                        // Ya da bu kısmı hiç render etmeyebiliriz, bu da boş bir satır bırakır.
                        // Güzergah Bilgisi Yok yazısının yerine boşluk için:
                        <span className="route-points-display"></span> // Burası doğru.
                      )}
                    </div>
                  </div>
                  {/* Yanlışlıkla eklenen kısımlar SİLİNDİ */}
                  {/* <span className="route-points-display"></span>
                    )}
                </div>
            </div> */}
                  <button
                    className="expand-toggle-button"
                    onClick={(e) => handleDropdownToggle(e, item)} // Animasyonu başlatma/durdurma
                    title="Animasyonlu güzergah takibini başlat/durdur"
                  >
                    <span
                      className="material-icons"
                      style={{ color: theme === 'dark' ? '#f0f0f0' : '#a79e9eff' }}
                    >
                      {expandedItems.has(item.id) ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                </div>

                {expandedItems.has(item.id) && (
                  <div className="item-details">
                    {selectedRoute?.id === item.id && selectedRoute?.directions?.[currentDirection === '1' ? '2' : '1']?.length > 0 && (
                      <div className="direction-toggle-container">
                        <button
                          className="direction-button control-button"
                          onClick={handleToggleDirectionClick}
                        >
                          {currentDirection === '1' ? '🚌 Gidiş' : '🔄 Dönüş'}
                        </button>
                        <span className="direction-info">
                          {/* Sadece varsa başlangıç/bitiş noktalarını göster */}
                          {(item.start_point || item.end_point) ? ( // Yalnızca bilgi varsa göster
                            currentDirection === '1'
                              ? `${item.start_point || ''} ${item.start_point && item.end_point ? '→' : ''} ${item.end_point || ''}`
                              : `${item.end_point || ''} ${item.start_point && item.end_point ? '→' : ''} ${item.start_point || ''}`
                          ) : (
                            null // Eğer hiçbir bilgi yoksa boş bırak
                          )}
                        </span>
                      </div>
                    )}

                    {/* 📍 Durak Takibi Paneli */}
                    <div className="route-progress-checkbox-container">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={isRouteProgressPanelActive}
                          onChange={handleToggleRouteProgress}
                          className="route-progress-checkbox"
                        />
                        <span className="route-progress-text">📍 Durak Takibi Panelini Aç</span>
                      </label>
                    </div>
                  </div>
                )}
              </li>
            ) : null
          ))
        ) : (
          <p className="no-results">Sonuç bulunamadı.</p>
        )}
      </ul>
    </div>
  );
}

export default VehicleList;