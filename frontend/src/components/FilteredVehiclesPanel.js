import React from "react";
import "./FilteredVehiclesPanel.css";

function FilteredVehiclesPanel({ filteredVehicles = [] }) {
  return (
    <div className="filtered-results">
      <div className="results-header">
        <h3>Filtrelenmiş Araçlar</h3>
        <span>{filteredVehicles.length} araç bulundu</span>
      </div>

      <ul className="results-list">
        {filteredVehicles.map((vehicle) => (
          <li key={vehicle.id} className="result-item">
            <strong>{vehicle.name}</strong> – {vehicle.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FilteredVehiclesPanel;
