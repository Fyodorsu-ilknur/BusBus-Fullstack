// frontend/src/components/Navbar.js
import React from 'react';
import './Navbar.css';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-title">
        📍 Fleet Management
      </div>
      <div className="navbar-actions">
        <button className="navbar-button">Submit to get the template</button>
        <span className="navbar-icon">🔔</span>
        <div className="navbar-profile"></div>
      </div>
    </nav>
  );
}

export default Navbar;