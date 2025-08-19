// frontend/src/components/FleetVehicleDetailsPanel.js
import React from 'react';
import './FleetVehicleDetailsPanel.css'; // Stil dosyası için

function FleetVehicleDetailsPanel({ onClose, selectedVehicle }) {
  if (!selectedVehicle) {
    return null; // Araç seçili değilse hiçbir şey gösterme
  }

  return (
    <div className="fleet-details-panel">
      <div className="fleet-details-header">
        <h2>Araç Detayları: {selectedVehicle.plate}</h2>
        <button onClick={onClose} className="close-button">X</button>
      </div>
      <div className="fleet-details-content">
        <div className="details-section">
          <h3>Genel Bilgiler</h3>
          <ul>
            <li><strong>Araç ID:</strong> {selectedVehicle.vehicleId}</li>
            <li><strong>Plaka:</strong> {selectedVehicle.plate}</li>
            <li><strong>Hız:</strong> {selectedVehicle.speed} km/h</li>
            <li><strong>Konum:</strong> Lat {selectedVehicle.location.lat.toFixed(6)}, Lng {selectedVehicle.location.lng.toFixed(6)}</li>
            <li><strong>Durum:</strong> {selectedVehicle.engineStatus}</li>
            <li><strong>Son GPS Zamanı:</strong> {selectedVehicle.lastGpsTime}</li>
            <li><strong>Kilometre:</strong> {selectedVehicle.odometer} km</li>
            <li><strong>Motor Durumu:</strong> {selectedVehicle.engineStatus}</li>
            <li><strong>Akü Voltajı:</strong> {selectedVehicle.batteryVolt}</li>
            <li><strong>Yakıt Oranı:</strong> {selectedVehicle.fuelRate}</li>
            {/* Diğer genel bilgiler buraya eklenebilir */}
          </ul>
        </div>

        <div className="details-section">
          <h3>Operasyonel Bilgiler</h3>
          <ul>
            <li><strong>Trip No:</strong> {selectedVehicle.tripNo}</li>
            <li><strong>Firma Adı:</strong> {selectedVehicle.companyAd}</li>
            <li><strong>Rota No:</strong> {selectedVehicle.routeCode}</li>
            <li><strong>Rota Adı:</strong> {selectedVehicle.routeName}</li>
            <li><strong>Başlangıç Zamanı:</strong> {selectedVehicle.startDateTime}</li>
            <li><strong>Bitiş Zamanı:</strong> {selectedVehicle.endDateTime}</li>
            {/* Diğer operasyonel bilgiler buraya eklenebilir */}
          </ul>
        </div>

        {/* Şoför Bilgileri (Alt Panel olarak düşünülen kısım) */}
        <div className="details-section driver-info-section">
          <h3>Şoför Bilgileri</h3>
          <ul>
            <li><strong>Personel No:</strong> {selectedVehicle.driverInfo.personnelNo}</li>
            <li><strong>Adı Soyadı:</strong> {selectedVehicle.driverInfo.name}</li>
            {/* Diğer şoför iletişim bilgileri buraya eklenebilir */}
          </ul>
        </div>

        {/* Ek Bilgiler (Ekran görüntüsündeki VDS, AVL gibi sekmeler/başlıklar) */}
        {/* Bu kısımlar için daha sonra sekmeler veya accordionlar eklenebilir */}
        {/* <div className="details-section"><h3>VDS Bilgileri</h3> ... </div> */}
        {/* <div className="details-section"><h3>AVL Bilgileri</h3> ... </div> */}

      </div>
    </div>
  );
}

export default FleetVehicleDetailsPanel;