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
  theme // Tema prop'u hala kullanılıyorsa
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState(new Set()); // new Set() kullanımı doğru

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

  // Durak Takibi Butonunun tıklama işlevi (checkbox yerine buton)
  const handleToggleRouteProgressButton = useCallback((e) => {
      e.stopPropagation(); // Olayın üst elementlere yayılmasını engeller
      onToggleRouteProgressPanelActive(); // App.js'teki fonksiyonu çağır
  }, [onToggleRouteProgressPanelActive]);


  // Yön butonlarına tıklama işlevi (Gidiş/Dönüş)
  const handleDirectionButtonClick = (e, item, direction) => {
    e.stopPropagation(); // Olayın üst elementlere yayılmasını engeller
    if (!onToggleDirection || !item || !item.id) {
        return; // Gerekli prop'lar veya item yoksa çık
    }

    const targetRoute = selectedRoute && selectedRoute.id === item.id ? selectedRoute : null;

    if (targetRoute && targetRoute.directions?.[direction]?.length > 0) {
        onToggleDirection(direction);
    } else if (item.directions?.[direction]?.length > 0) { // selectedRoute henüz ayarlanmamışsa, item'ın kendi yönlerini kontrol et
        onToggleDirection(direction);
    } else {
        console.warn(`Güzergah bilgisi bulunamadı: Yön ${direction}`);
        // İsterseniz burada kullanıcıya bir mesaj gösterebilirsiniz
    }
  };


  return (
    <div className="vehicle-list-container">
      <div className="fixed-controls-container">
        <div className="list-header">
          <h2>Hat Güzergah Takip</h2>
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
                {/* Checkbox, Hat No ve Güzergah Adı ile V ikonunu kapsayan ana satır */}
                <div className="item-content-wrapper">
                  <div className="item-title">
                    <input
                      type="checkbox"
                      checked={selectedRouteIds.includes(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleRouteCheckboxChange(item.id)}
                      className="vehicle-list-checkbox"
                    />

                    <div className="route-summary-text">
                      <strong>Hat No: {item.route_number}</strong>
                      {item.route_name && <span className="route-name-display"> ({item.route_name})</span>}
                      <br />
                      {(item.start_point || item.end_point) ? (
                        <span className="route-points-display">
                            {item.start_point}{' '}
                            {item.start_point && item.end_point ? '→' : ''}{' '}
                            {item.end_point}
                        </span>
                      ) : (
                        <span className="route-points-display"></span>
                      )}
                    </div>
                  </div>

                  {/* V ikon butonu - sağda sabit */}
                  <button
                    className="expand-toggle-button"
                    onClick={(e) => handleDropdownToggle(e, item)}
                    title="Animasyonlu güzergah takibini başlat/durdur"
                  >
                    <span
                      className="material-icons"
                      style={{ color: theme === 'dark' ? '#f0f0f0' : '#a79e9eff' }}
                    >
                      {expandedItems.has(item.id) ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                </div> {/* item-content-wrapper sonu */}


                {/* Açılan Detay Alanı (Butonlar) */}
                {expandedItems.has(item.id) && (
                  <div className="item-details">
                    {/* Gidiş ve Dönüş butonları yan yana */}
                    <div className="direction-buttons-row">
                      {/* Gidiş Butonu */}
                      {(selectedRoute?.id === item.id && selectedRoute?.directions?.['1']?.length > 0) ? (
                          <button
                            className={`direction-button gidis-button ${currentDirection === '1' ? 'active' : ''}`}
                            onClick={(e) => handleDirectionButtonClick(e, item, '1')}
                          >
                            🚌 Gidiş
                          </button>
                      ) : (item.directions?.['1']?.length > 0 && selectedRoute?.id !== item.id) && ( // Eğer henüz seçili değilse ama gidiş yönü varsa
                          <button
                            className="direction-button gidis-button"
                            onClick={(e) => handleDirectionButtonClick(e, item, '1')}
                          >
                            🚌 Gidiş
                          </button>
                      )}

                      {/* Dönüş Butonu */}
                      {(selectedRoute?.id === item.id && selectedRoute?.directions?.['2']?.length > 0) ? (
                          <button
                            className={`direction-button donus-button ${currentDirection === '2' ? 'active' : ''}`}
                            onClick={(e) => handleDirectionButtonClick(e, item, '2')}
                          >
                            🔄 Dönüş
                          </button>
                      ) : (item.directions?.['2']?.length > 0 && selectedRoute?.id !== item.id) && ( // Eğer henüz seçili değilse ama dönüş yönü varsa
                          <button
                            className="direction-button donus-button"
                            onClick={(e) => handleDirectionButtonClick(e, item, '2')}
                          >
                            🔄 Dönüş
                          </button>
                      )}
                    </div>

                    {/* Durak Takibi Paneli Aç Butonu (altında tek başına) */}
                    <button
                      className="control-button open-stop-tracking-button"
                      onClick={handleToggleRouteProgressButton}
                    >
                      📍 Durak Takibi Paneli Aç
                    </button>
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