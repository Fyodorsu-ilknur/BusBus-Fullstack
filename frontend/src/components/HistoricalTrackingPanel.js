// frontend/src/components/HistoricalTrackingPanel.js
import React, { useState, useEffect, useRef } from 'react';
import './HistoricalTrackingPanel.css';

function HistoricalTrackingPanel({ onClose, vehicles = [], allRoutes = {}, theme, onHistoricalDataChange }) {
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [startDate, setStartDate] = useState('2024-01-15');
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState('2024-01-15');
  const [endTime, setEndTime] = useState('10:00');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [currentDirection, setCurrentDirection] = useState('1');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [historicalData, setHistoricalData] = useState([]);
  const [currentVehicleData, setCurrentVehicleData] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const intervalRef = useRef(null);

  // Gerçek araçları ve rotaları kullan
  const availableVehicles = vehicles.filter(v => v.status === 'Aktif').slice(0, 20); // Sadece aktif araçlar, ilk 20
  const availableRoutes = Object.values(allRoutes).slice(0, 15); // İlk 15 rota

  // Gerçek güzergah koordinatlarını API'den çek
  const fetchRouteCoordinates = async (routeNumber, direction = '1') => {
    try {
      const response = await fetch(`http://localhost:5000/api/route-details/${routeNumber}/${direction}`);
      if (response.ok) {
        const data = await response.json();
        return data.coordinates || [];
      }
      return [];
    } catch (error) {
      console.error('Güzergah koordinatları alınamadı:', error);
      return [];
    }
  };

  // Gerçek verilerden geçmiş rotayı oluştur
  const generateHistoricalData = async (vehicleData, routeData, startDateTime, endDateTime, direction) => {
    if (!routeData || !vehicleData) return [];

    setIsLoading(true);
    
    try {
      // API'den gerçek koordinatları al
      const coordinates = await fetchRouteCoordinates(routeData.route_number, direction);
      
      if (coordinates.length === 0) {
        alert('Bu rota için koordinat verisi bulunamadı!');
        setIsLoading(false);
        return [];
      }

      const data = [];
      const startTimestamp = new Date(startDateTime).getTime();
      const endTimestamp = new Date(endDateTime).getTime();
      const duration = endTimestamp - startTimestamp;
      
      // Koordinat sayısına göre zaman aralığını ayarla (minimum 30 saniye aralık)
      const pointCount = Math.min(coordinates.length, duration / 30000); // Her 30 saniyede bir nokta
      
      for (let i = 0; i < pointCount; i++) {
        const currentTime = startTimestamp + (duration * i / pointCount);
        const coordIndex = Math.floor((coordinates.length - 1) * i / pointCount);
        const coord = coordinates[coordIndex];
        
        if (!coord || coord.length < 2) continue;

        // Gerçekçi araç verileri oluştur
        const baseSpeed = 25; // Ortalama şehir hızı
        const speedVariation = Math.sin(i * 0.1) * 10 + Math.random() * 5; // Sinüs dalga + rastgele
        const currentSpeed = Math.max(0, Math.min(50, baseSpeed + speedVariation));
        
        // Yolcu sayısı: Gün boyunca değişken (sabah/akşam yoğun)
        const timeHour = new Date(currentTime).getHours();
        let passengerMultiplier = 0.3; // Varsayılan %30
        if ((timeHour >= 7 && timeHour <= 9) || (timeHour >= 17 && timeHour <= 19)) {
          passengerMultiplier = 0.7; // Rush hour %70
        } else if (timeHour >= 10 && timeHour <= 16) {
          passengerMultiplier = 0.5; // Gündüz %50
        }
        
        const passengerCount = Math.floor(vehicleData.capacity * (passengerMultiplier + Math.random() * 0.2));

        data.push({
          timestamp: new Date(currentTime).toLocaleTimeString('tr-TR'),
          location: [coord[1], coord[0]], // lat, lng formatına çevir
          speed: Math.round(currentSpeed),
          passengerCount: passengerCount,
          fuelLevel: Math.max(10, vehicleData.fuelLevel - (i * 0.1)), // Yakıt azalması
          motorTemp: 75 + Math.sin(i * 0.05) * 10 + Math.random() * 5, // 70-90°C aralığında
          doorStatus: Math.random() > 0.9 ? 'Açık' : 'Kapalı', // %10 ihtimalle açık
          nextStop: `Durak ${Math.floor(i / (pointCount / 8)) + 1}`, // 8 durak varsay
          distanceTraveled: ((i / pointCount) * 25).toFixed(1), // Toplam 25km varsay
          routeProgress: Math.round((i / pointCount) * 100), // Rota tamamlanma yüzdesi
          // Gerçek araç bilgileri
          plate: vehicleData.plate,
          driver: vehicleData.driverInfo?.name || 'Şoför Bilgisi Yok',
          routeCode: routeData.route_number,
          routeName: routeData.route_name
        });
      }
      
      setIsLoading(false);
      return data;
    } catch (error) {
      console.error('Geçmiş veri oluşturulurken hata:', error);
      setIsLoading(false);
      return [];
    }
  };

  // Veri yükleme
  const loadHistoricalData = async () => {
    if (!selectedVehicle) {
      alert('Lütfen bir araç seçiniz!');
      return;
    }
    
    const vehicleData = availableVehicles.find(v => v.id === selectedVehicle);
    const routeData = selectedRoute ? 
      availableRoutes.find(r => r.route_number === selectedRoute) : 
      availableRoutes.find(r => r.route_number === vehicleData?.routeCode);
    
    if (!vehicleData || !routeData) {
      alert('Araç veya rota bilgisi bulunamadı!');
      return;
    }
    
    const startDateTime = `${startDate} ${startTime}`;
    const endDateTime = `${endDate} ${endTime}`;
    
    const data = await generateHistoricalData(vehicleData, routeData, startDateTime, endDateTime, currentDirection);
    
    if (data.length === 0) {
      alert('Bu parametreler için veri oluşturulamadı!');
      return;
    }
    
    setHistoricalData(data);
    setCurrentIndex(0);
    setCurrentVehicleData(data[0]);
    
    // Ana haritaya veri gönder
    if (onHistoricalDataChange) {
      onHistoricalDataChange(data, vehicleData, routeData);
    }
  };

  // Oynatma kontrolü
  useEffect(() => {
    if (isPlaying && historicalData.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prevIndex => {
          const nextIndex = prevIndex + 1;
          if (nextIndex >= historicalData.length) {
            setIsPlaying(false);
            return prevIndex;
          }
          
          const newData = historicalData[nextIndex];
          setCurrentVehicleData(newData);
          
          // Ana haritaya güncelleme gönder
          if (onHistoricalDataChange) {
            const vehicleData = availableVehicles.find(v => v.id === selectedVehicle);
            const routeData = availableRoutes.find(r => r.route_number === (selectedRoute || vehicleData?.routeCode));
            onHistoricalDataChange(historicalData, vehicleData, routeData, nextIndex);
          }
          
          return nextIndex;
        });
      }, 1000 / playbackSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, historicalData, onHistoricalDataChange, selectedVehicle, selectedRoute]);

  const handlePlay = () => {
    if (historicalData.length === 0) {
      alert('Önce geçmiş verileri yükleyiniz!');
      return;
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    if (historicalData.length > 0) {
      setCurrentVehicleData(historicalData[0]);
      
      // İlk konuma dön
      if (onHistoricalDataChange) {
        const vehicleData = availableVehicles.find(v => v.id === selectedVehicle);
        const routeData = availableRoutes.find(r => r.route_number === (selectedRoute || vehicleData?.routeCode));
        onHistoricalDataChange(historicalData, vehicleData, routeData, 0);
      }
    }
  };

  const handleSliderChange = (e) => {
    const index = parseInt(e.target.value);
    setCurrentIndex(index);
    setCurrentVehicleData(historicalData[index]);
    
    if (onHistoricalDataChange) {
      const vehicleData = availableVehicles.find(v => v.id === selectedVehicle);
      const routeData = availableRoutes.find(r => r.route_number === (selectedRoute || vehicleData?.routeCode));
      onHistoricalDataChange(historicalData, vehicleData, routeData, index);
    }
  };

  return (
    <div className={`historical-tracking-panel ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="panel-header">
        <div className="header-title">
          <span className="material-icons">history</span>
          <h2>Geçmişe Dönük İzleme</h2>
        </div>
        <button onClick={onClose} className="close-button">
          <span className="material-icons">close</span>
        </button>
      </div>

      <div className="panel-content">
        {/* Araç ve Rota Seçimi */}
        <div className="selection-section">
          <div className="form-group">
            <label>Araç Seçimi ({availableVehicles.length} aktif araç)</label>
            <select 
              value={selectedVehicle} 
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="form-select"
            >
              <option value="">Araç Seçiniz</option>
              {availableVehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate} - {vehicle.driverInfo?.name || 'Şoför Yok'} (Hat: {vehicle.routeCode})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Güzergah ({availableRoutes.length} rota)</label>
            <select 
              value={selectedRoute} 
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="form-select"
            >
              <option value="">Araç Rotasını Kullan</option>
              {availableRoutes.map(route => (
                <option key={route.id} value={route.route_number}>
                  {route.route_number} - {route.route_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Yön</label>
            <select 
              value={currentDirection} 
              onChange={(e) => setCurrentDirection(e.target.value)}
              className="form-select"
            >
              <option value="1">Gidiş (1)</option>
              <option value="2">Dönüş (2)</option>
            </select>
          </div>
        </div>

        {/* Tarih ve Saat Seçimi */}
        <div className="datetime-section">
          <div className="datetime-row">
            <div className="datetime-group">
              <label>Başlangıç</label>
              <div className="datetime-inputs">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-input"
                />
                <input 
                  type="time" 
                  value={startTime} 
                  onChange={(e) => setStartTime(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="datetime-group">
              <label>Bitiş</label>
              <div className="datetime-inputs">
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-input"
                />
                <input 
                  type="time" 
                  value={endTime} 
                  onChange={(e) => setEndTime(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Veri Yükleme Butonu */}
        <div className="load-section">
          <button 
            className={`load-data-btn ${isLoading ? 'loading' : ''}`} 
            onClick={loadHistoricalData}
            disabled={isLoading}
          >
            <span className="material-icons">
              {isLoading ? 'hourglass_empty' : 'search'}
            </span>
            {isLoading ? 'Veriler Yükleniyor...' : 'Geçmiş Verileri Yükle'}
          </button>
        </div>

        {/* Oynatma Kontrolleri */}
        {historicalData.length > 0 && (
          <div className="playback-controls">
            <div className="control-buttons">
              <button className="control-btn" onClick={handleStop}>
                <span className="material-icons">stop</span>
              </button>
              <button className="control-btn play-btn" onClick={handlePlay} disabled={isLoading}>
                <span className="material-icons">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
            </div>
            
            <div className="speed-control">
              <label>Hız: {playbackSpeed}x</label>
              <select 
                value={playbackSpeed} 
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="form-select-small"
              >
                <option value="0.5">0.5x</option>
                <option value="1">1x</option>
                <option value="2">2x</option>
                <option value="4">4x</option>
                <option value="8">8x</option>
              </select>
            </div>
          </div>
        )}

        {/* Zaman Çubuğu */}
        {historicalData.length > 0 && (
          <div className="timeline-section">
            <div className="timeline-header">
              <span>İlerleme: {currentIndex + 1} / {historicalData.length}</span>
              <span>{currentVehicleData?.timestamp || '--:--'}</span>
            </div>
            <input
              type="range"
              min="0"
              max={historicalData.length - 1}
              value={currentIndex}
              onChange={handleSliderChange}
              className="timeline-slider"
            />
            <div className="progress-info">
              <span>Rota Tamamlanması: %{currentVehicleData?.routeProgress || 0}</span>
            </div>
          </div>
        )}

        {/* Canlı Araç Bilgileri */}
        {currentVehicleData && (
          <div className="vehicle-info-section">
            <div className="info-header">
              <h3>Gerçek Zamanlı Veriler</h3>
              <div className="vehicle-identity">
                {currentVehicleData.plate} | {currentVehicleData.routeCode} - {currentVehicleData.routeName}
              </div>
            </div>
            
            <div className="info-grid">
              <div className="info-card">
                <span className="material-icons">speed</span>
                <div className="info-details">
                  <span className="info-label">Anlık Hız</span>
                  <span className="info-value">{currentVehicleData.speed} km/h</span>
                </div>
              </div>
              
              <div className="info-card">
                <span className="material-icons">people</span>
                <div className="info-details">
                  <span className="info-label">Yolcu Sayısı</span>
                  <span className="info-value">{currentVehicleData.passengerCount}</span>
                </div>
              </div>
              
              <div className="info-card">
                <span className="material-icons">local_gas_station</span>
                <div className="info-details">
                  <span className="info-label">Yakıt Seviyesi</span>
                  <span className="info-value">%{Math.round(currentVehicleData.fuelLevel)}</span>
                </div>
              </div>
              
              <div className="info-card">
                <span className="material-icons">device_thermostat</span>
                <div className="info-details">
                  <span className="info-label">Motor Sıcaklığı</span>
                  <span className="info-value">{Math.round(currentVehicleData.motorTemp)}°C</span>
                </div>
              </div>
              
              <div className="info-card">
                <span className="material-icons">door_front</span>
                <div className="info-details">
                  <span className="info-label">Kapı Durumu</span>
                  <span className="info-value">{currentVehicleData.doorStatus}</span>
                </div>
              </div>
              
              <div className="info-card">
                <span className="material-icons">location_on</span>
                <div className="info-details">
                  <span className="info-label">Sonraki Durak</span>
                  <span className="info-value">{currentVehicleData.nextStop}</span>
                </div>
              </div>
            </div>

            <div className="journey-stats">
              <div className="stat-item">
                <span className="material-icons">straighten</span>
                <span>Kat Edilen Mesafe: {currentVehicleData.distanceTraveled} km</span>
              </div>
              <div className="stat-item">
                <span className="material-icons">person</span>
                <span>Şoför: {currentVehicleData.driver}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HistoricalTrackingPanel;