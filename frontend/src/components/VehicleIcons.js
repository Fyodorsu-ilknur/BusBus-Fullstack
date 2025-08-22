import React from 'react';

function VehicleIcons({ vehicle, onIconClick }) {
  const icons = [
    {
      key: 'vehicle',
      icon: '📱',
      title: 'Araç Bilgileri',
      color: '#28a745'
    },
    {
      key: 'vds', 
      icon: '⚙️',
      title: 'VDS Verileri',
      color: '#ffc107'
    },
    {
      key: 'avl',
      icon: '🚌', 
      title: 'AVL Verileri',
      color: '#007bff'
    },
    {
      key: 'driver',
      icon: '👤',
      title: 'Şoför Bilgileri', 
      color: '#6f42c1'
    },
    {
      key: 'route',
      icon: '🚏',
      title: 'Hat ve Rota Bilgileri',
      color: '#17a2b8'
    },
    {
      key: 'accessibility',
      icon: '♿',
      title: 'Erişilebilirlik',
      color: '#e83e8c'
    }
  ];

  // Inline styles (CSS dosyası gereksiz)
  const styles = {
    container: {
      position: 'absolute',
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      padding: '8px',
      minWidth: '200px'
    },
    plate: {
      background: '#2c3e50',
      color: 'white',
      padding: '6px 12px',
      borderRadius: '4px',
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: '14px',
      marginBottom: '8px',
      letterSpacing: '1px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '6px'
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '40px',
      height: '40px',
      border: '2px solid',
      borderRadius: '6px',
      background: '#f8f9fa',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontSize: '18px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.plate}>
        {vehicle.plate}
      </div>
      <div style={styles.grid}>
        {icons.map(iconData => (
          <button
            key={iconData.key}
            style={{
              ...styles.button,
              borderColor: iconData.color
            }}
            onClick={() => onIconClick(iconData.key)}
            title={iconData.title}
            onMouseEnter={(e) => {
              e.target.style.background = '#e9ecef';
              e.target.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#f8f9fa';
              e.target.style.transform = 'scale(1)';
            }}
          >
            {iconData.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

export default VehicleIcons;