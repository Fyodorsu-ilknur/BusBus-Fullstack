// frontend/src/components/Navbar.js
import React from 'react';
import './Navbar.css';

// Navbar bileşeni, sidebar'ı açıp kapatma ve temayı değiştirme fonksiyonlarını App.js'ten prop olarak alır
function Navbar({ onToggleSidebarExpansion, onToggleTheme, currentTheme }) {
  return (
    <nav className="navbar-container">
      {/* Sol kısım: Hamburger menü ikonu ve Logo/Başlık */}
      <div className="navbar-left">
        {/* Hamburger menü butonu - Navbar'ın içinde, sol üstte sabit olacak */}
        <button className="hamburger-icon-button" onClick={onToggleSidebarExpansion} title="Sidebar Aç/Kapat">
          <span className="material-icons">menu</span>
        </button>
        {/* Logo ve Başlık */}
        <div className="logo">
          <span className="material-icons">location_on</span> {/* Pin ikonu */}
          <span>Fleet Management</span>
        </div>
      </div>

      {/* Sağdaki butonlar */}
      <div className="nav-buttons">
        {/* Tema değiştirme butonu */}
        <button className="theme-toggle-button" onClick={onToggleTheme} title="Temayı Değiştir">
          <span className="material-icons">
            {currentTheme === 'light' ? 'dark_mode' : 'light_mode'} {/* Temaya göre ikon değişimi */}
          </span>
        </button>

        <button>Submit to get the template</button>
        <span className="material-icons">notifications</span>
        <span className="material-icons">account_circle</span>
      </div>
    </nav>
  );
}

export default Navbar;