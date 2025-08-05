// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client'; // React 18 için önerilen import
import './index.css'; // Opsiyonel, eğer varsa
import App from './App'; // Ana App bileşeniniz

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Eğer React 18 öncesi versiyon kullanıyorsanız aşağıdaki gibi olabilir:
/*
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
*/