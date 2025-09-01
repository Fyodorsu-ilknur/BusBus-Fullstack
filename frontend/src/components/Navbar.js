// frontend/src/components/Navbar.js
import React from 'react';
import './Navbar.css';

function Navbar({ toggleSidebar, onToggleTheme, currentTheme }) {
  return (
    <nav className="navbar-container">
      <div className="navbar-left">
        <button className="hamburger-icon-button" onClick={toggleSidebar} title="Sidebar Aç/Kapat">
          <span className="material-icons">menu</span>
        </button>
        <div className="logo">
          <span className="material-icons">location_on</span> 
          <span>Filo Yönetim İZMİR | İZbus</span>
        </div>
      </div>

      <div className="nav-buttons">
        <button className="theme-toggle-button" onClick={onToggleTheme} title="Temayı Değiştir">
          <span className="material-icons">
            {currentTheme === 'light' ? 'dark_mode' : 'light_mode'} 
          </span>
        </button>

        <span className="material-icons">notifications</span>
        <span className="material-icons">account_circle</span>
      </div>
    </nav>
  );
}

export default Navbar;