// frontend/src/components/Navbar.js
import React from 'react';
import './Navbar.css';

// onToggleSidebarExpansion yerine toggleSidebar olarak değiştirildi
function Navbar({ toggleSidebar, onToggleTheme, currentTheme }) {
  return (
    <nav className="navbar-container">
      <div className="navbar-left">
        {/* onClick handler'ı toggleSidebar olarak değiştirildi */}
        <button className="hamburger-icon-button" onClick={toggleSidebar} title="Sidebar Aç/Kapat">
          <span className="material-icons">menu</span>
        </button>
        <div className="logo">
          <span className="material-icons">location_on</span> 
          <span>Filo Yönetim Paneli | İZbus</span>
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