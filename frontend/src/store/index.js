// frontend/src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import selectedItemsReducer from './selectedItemsSlice'; // selectedItemsSlice'ı buraya dahil ediyoruz

const store = configureStore({
  reducer: {
    selectedItems: selectedItemsReducer, // SADECE selectedItems reducer'ımız olmalı
  },
});

export default store;