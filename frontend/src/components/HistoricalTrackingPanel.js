// frontend/src/components/HistoricalTrackingPanel.js
import React, { useState, useEffect, useRef } from 'react';
import './HistoricalTrackingPanel.css';

function HistoricalTrackingPanel({ onClose, vehicles = [], allRoutes = {}, theme, onHistoricalDataChange }) {
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('18:00');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [currentDirection, setCurrentDirection] = useState('1');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [historicalData, setHistoricalData] = useState([]);
  const [currentVehicleData, setCurrentVehicleData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const intervalRef = useRef(null);

  // Varsayılan tarih ayarlama (bugün ve dün)
  useEffect(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    setStartDate(yesterday.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  // Aktif araçları ve rotaları filtrele
  const availableVehicles = vehicles.filter(v => 
    v.status && (v.status.toLowerCase().includes('aktif') || v.status.toLowerCase() === 'aktif')
  );
  const availableRoutes = Object.values(allRoutes);

  // BASİT VERİ YÜKLEME - Güzergah tabanlı animasyon
  const loadHistoricalData = async () => {
    if (!selectedVehicle) {
      setError('Lütfen bir araç seçiniz!');
      return;
    }

    if (!startDate || !endDate) {
      setError('Lütfen başlangıç ve bitiş tarihleri seçiniz!');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Seçilen aracın bilgilerini al
      const vehicleData = availableVehicles.find(v => v.id === selectedVehicle);
      if (!vehicleData) {
        throw new Error('Araç bilgisi bulunamadı!');
      }

      // Kullanılacak rota belirle
      const routeCode = selectedRoute || vehicleData.routeCode;
      if (!routeCode) {
        throw new Error('Araç güzergah bilgisi bulunamadı!');
      }

      console.log(`Güzergah yükleniyor: Hat ${routeCode}, Yön ${currentDirection}`);

      // Güzergah koordinatlarını API'den çek
      const routeResponse = await fetch(
        `http://localhost:5000/api/route-details/${routeCode}/${currentDirection}`
      );
      
      if (!routeResponse.ok) {
        throw new Error(`Güzergah bilgisi alınamadı (Hat: ${routeCode})`);
      }

      const routeDetails = await routeResponse.json();
      const coordinates = routeDetails.coordinates || [];
      const stops = routeDetails.stops || [];

      if (coordinates.length === 0) {
        throw new Error('Bu güzergah için koordinat verisi bulunamadı!');
      }

      console.log(`${coordinates.length} koordinat noktası bulundu`);

      // Seçilen tarih aralığında simüle edilmiş hareket oluştur
      const startDateTime = new Date(`${startDate} ${startTime}`).getTime();
      const endDateTime = new Date(`${endDate} ${endTime}`).getTime();
      const totalDuration = endDateTime - startDateTime;
      
      // Güzergahı döngüsel olarak oynat
      const animationData = [];
      const pointsPerHour = 120; // Saatte 120 nokta (30 saniyede bir)
      const totalHours = totalDuration / (1000 * 60 * 60);
      const totalPoints = Math.floor(totalHours * pointsPerHour);
      
      for (let i = 0; i < totalPoints; i++) {
        // Koordinat indeksini döngüsel olarak hesapla
        const coordIndex = i % coordinates.length;
        const coord = coordinates[coordIndex];
        
        if (!coord || coord.length < 2) continue;

        // Zaman hesaplama
        const timeOffset = (totalDuration / totalPoints) * i;
        const currentTime = startDateTime + timeOffset;
        const currentDate = new Date(currentTime);
        
        // Gerçekçi hız hesaplama (durak yakınında yavaş, yolda hızlı)
        const isNearStop = coordIndex % Math.floor(coordinates.length / stops.length) < 3;
        const baseSpeed = isNearStop ? 5 : 25;
        const speedVariation = Math.sin(i * 0.1) * 5 + Math.random() * 8;
        const currentSpeed = Math.max(0, Math.min(50, baseSpeed + speedVariation));
        
        // Yolcu sayısı (zaman bazlı)
        const hour = currentDate.getHours();
        let passengerMultiplier = 0.3;
        if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
          passengerMultiplier = 0.8; // Rush hour
        } else if (hour >= 10 && hour <= 16) {
          passengerMultiplier = 0.5; // Gündüz
        }
        const passengerCount = Math.floor((vehicleData.capacity || 60) * passengerMultiplier);

        // Durak bilgisi
        const currentStopIndex = Math.floor(coordIndex / (coordinates.length / stops.length));
        const currentStop = stops[currentStopIndex] || { name: `Durak ${currentStopIndex + 1}` };
        const nextStopIndex = (currentStopIndex + 1) % stops.length;
        const nextStop = stops[nextStopIndex] || { name: `Durak ${nextStopIndex + 1}` };

        animationData.push({
          timestamp: currentDate.toLocaleString('tr-TR'),
          location: [coord[0], coord[1]], // [lat, lng]
          speed: Math.round(currentSpeed),
          passengerCount: passengerCount,
          fuelLevel: Math.max(15, 95 - (i * 0.02)), // Yavaş yakıt tüketimi
          motorTemp: 70 + Math.sin(i * 0.03) * 8 + (currentSpeed * 0.2), // Hıza bağlı sıcaklık
          doorStatus: isNearStop && (i % 15 === 0) ? 'Açık' : 'Kapalı',
          currentStop: currentStop.name,
          nextStop: nextStop.name,
          distanceTraveled: ((coordIndex / coordinates.length) * 25).toFixed(1),
          routeProgress: Math.round((coordIndex / coordinates.length) * 100),
          
          // Araç bilgileri
          plate: vehicleData.plate,
          driver: vehicleData.driverInfo?.name || 'Şoför Bilgisi Yok',
          routeCode: routeCode,
          routeName: routeDetails.route_name || `Hat ${routeCode}`,
          
          // Döngü bilgisi
          cycleNumber: Math.floor(i / coordinates.length) + 1,
          pointInCycle: coordIndex + 1,
          totalCycles: Math.floor(totalPoints / coordinates.length)
        });
      }

      setHistoricalData(animationData);
      setCurrentIndex(0);
      setCurrentVehicleData(animationData[0]);

      // Haritaya veri gönder
      if (onHistoricalDataChange) {
        onHistoricalDataChange(animationData, vehicleData, 0, routeDetails);
      }

      console.log(`${animationData.length} noktalık animasyon hazırlandı (${Math.floor(totalPoints / coordinates.length)} döngü)`);

    } catch (error) {
      console.error('Geçmiş veri hazırlanırken hata:', error);
      setError(`Hata: ${error.message}`);
      setHistoricalData([]);
    } finally {
      setIsLoading(false);
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
          
          // Haritaya güncelleme gönder
          if (onHistoricalDataChange) {
            const vehicleData = availableVehicles.find(v => v.id === selectedVehicle);
            const routeData = availableRoutes.find(r => r.route_number === (selectedRoute || vehicleData?.routeCode));
            onHistoricalDataChange(historicalData, vehicleData, nextIndex, routeData);
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
  }, [isPlaying, playbackSpeed, historicalData, onHistoricalDataChange, selectedVehicle, selectedRoute, availableVehicles, availableRoutes]);

  const handlePlay = () => {
    if (historicalData.length === 0) {
      setError('Önce geçmiş verileri yükleyiniz!');
      return;
    }
    setIsPlaying(!isPlaying);
    setError('');
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    if (historicalData.length > 0) {
      setCurrentVehicleData(historicalData[0]);
      
      if (onHistoricalDataChange) {
        const vehicleData = availableVehicles.find(v => v.id === selectedVehicle);
        const routeData = availableRoutes.find(r => r.route_number === (selectedRoute || vehicleData?.routeCode));
        onHistoricalDataChange(historicalData, vehicleData, 0, routeData);
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
      onHistoricalDataChange(historicalData, vehicleData, index, routeData);
    }
  };

  // Temizlik
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

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
        {/* Hata Mesajı */}
        {error && (
          <div className="error-message">
            <span className="material-icons">error</span>
            {error}
          </div>
        )}

        {/* Araç ve Rota Seçimi */}
        <div className="selection-section">
          <div className="form-group">
            <label>Araç Seçimi ({availableVehicles.length} aktif araç)</label>
            <select 
              value={selectedVehicle} 
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="form-select"
              disabled={isLoading}
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
              disabled={isLoading}
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
              disabled={isLoading}
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
                  disabled={isLoading}
                />
                <input 
                  type="time" 
                  value={startTime} 
                  onChange={(e) => setStartTime(e.target.value)}
                  className="form-input"
                  disabled={isLoading}
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
                  disabled={isLoading}
                />
                <input 
                  type="time" 
                  value={endTime} 
                  onChange={(e) => setEndTime(e.target.value)}
                  className="form-input"
                  disabled={isLoading}
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
              {isLoading ? 'hourglass_empty' : 'route'}
            </span>
            {isLoading ? 'Güzergah Yükleniyor...' : 'Güzergah Animasyonu Hazırla'}
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
                <option value="16">16x</option>
              </select>
            </div>
          </div>
        )}

        {/* Zaman Çubuğu */}
        {historicalData.length > 0 && (
          <div className="timeline-section">
            <div className="timeline-header">
              <span>Nokta: {currentIndex + 1} / {historicalData.length}</span>
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
              <span>
                Döngü: {currentVehicleData?.cycleNumber}/{currentVehicleData?.totalCycles} | 
                Rota: %{currentVehicleData?.routeProgress || 0}
              </span>
            </div>
          </div>
        )}

        {/* Canlı Araç Bilgileri */}
        {currentVehicleData && (
          <div className="vehicle-info-section">
            <div className="info-header">
              <h3>Simüle Edilmiş Hareket</h3>
              <div className="vehicle-identity">
                {currentVehicleData.plate} | {currentVehicleData.routeCode} - {currentVehicleData.routeName}
              </div>
            </div>
            
            <div className="info-grid">
              <div className="info-card">
                <span className="material-icons">speed</span>
                <div className="info-details">
                  <span className="info-label">Hız</span>
                  <span className="info-value">{currentVehicleData.speed} km/h</span>
                </div>
              </div>
              
              <div className="info-card">
                <span className="material-icons">people</span>
                <div className="info-details">
                  <span className="info-label">Yolcu</span>
                  <span className="info-value">{currentVehicleData.passengerCount}</span>
                </div>
              </div>
              
              <div className="info-card">
                <span className="material-icons">local_gas_station</span>
                <div className="info-details">
                  <span className="info-label">Yakıt</span>
                  <span className="info-value">%{Math.round(currentVehicleData.fuelLevel)}</span>
                </div>
              </div>
              
              <div className="info-card">
                <span className="material-icons">device_thermostat</span>
                <div className="info-details">
                  <span className="info-label">Motor</span>
                  <span className="info-value">{Math.round(currentVehicleData.motorTemp)}°C</span>
                </div>
              </div>
              
              <div className="info-card">
                <span className="material-icons">location_on</span>
                <div className="info-details">
                  <span className="info-label">Mevcut Durak</span>
                  <span className="info-value">{currentVehicleData.currentStop}</span>
                </div>
              </div>
              
              <div className="info-card">
                <span className="material-icons">near_me</span>
                <div className="info-details">
                  <span className="info-label">Sonraki</span>
                  <span className="info-value">{currentVehicleData.nextStop}</span>
                </div>
              </div>
            </div>

            <div className="journey-stats">
              <div className="stat-item">
                <span className="material-icons">straighten</span>
                <span>Mesafe: {currentVehicleData.distanceTraveled} km</span>
              </div>
              <div className="stat-item">
                <span className="material-icons">person</span>
                <span>Şoför: {currentVehicleData.driver}</span>
              </div>
            </div>
          </div>
        )}

        {/* Animasyon İstatistikleri */}
        {historicalData.length > 0 && (
          <div className="data-stats">
            <h3>Animasyon Bilgileri</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <strong>Toplam Nokta:</strong> {historicalData.length}
              </div>
              <div className="stat-item">
                <strong>Toplam Döngü:</strong> {currentVehicleData?.totalCycles || 0}
              </div>
              <div className="stat-item">
                <strong>Başlangıç:</strong> {historicalData[0]?.timestamp}
              </div>
              <div className="stat-item">
                <strong>Bitiş:</strong> {historicalData[historicalData.length - 1]?.timestamp}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HistoricalTrackingPanel;