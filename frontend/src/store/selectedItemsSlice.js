// src/store/selectedItemsSlice.js
import { createSlice } from '@reduxjs/toolkit';

const selectedItemsSlice = createSlice({
  name: 'selectedItems',
  initialState: {
    selectedStopIds: [],
    allStops: [],
    selectedRouteIds: [], // <-- YENİ STATE EKLENDİ
    allRoutes: {} // <-- YENİ STATE EKLENDİ (routes objesi, App.js'ten buraya taşıyacağız)
  },
  reducers: {
    toggleSelectedStop: (state, action) => {
      const stopId = action.payload;
      if (state.selectedStopIds.includes(stopId)) {
        state.selectedStopIds = state.selectedStopIds.filter(id => id !== stopId);
      } else {
        state.selectedStopIds.push(stopId);
      }
    },
    clearSelectedStops: (state) => {
      state.selectedStopIds = [];
    },
    setAllStops: (state, action) => {
      state.allStops = action.payload;
    },
    // YENİ REDUCER'lar: Otobüs Hatları için
    toggleSelectedRoute: (state, action) => { // Bir rota ID'sini seçer/seçimi kaldırır
        const routeId = action.payload;
        if (state.selectedRouteIds.includes(routeId)) {
            state.selectedRouteIds = state.selectedRouteIds.filter(id => id !== routeId);
        } else {
            state.selectedRouteIds.push(routeId);
        }
    },
    clearSelectedRoutes: (state) => { // Tüm rota seçimlerini temizler
        state.selectedRouteIds = [];
    },
    setAllRoutes: (state, action) => { // Tüm rota verisini Redux'a kaydeder
        state.allRoutes = action.payload;
    }
  }
});

export const { 
    toggleSelectedStop, 
    clearSelectedStops, 
    setAllStops,
    toggleSelectedRoute, // <-- Export edildi
    clearSelectedRoutes, // <-- Export edildi
    setAllRoutes // <-- Export edildi
} = selectedItemsSlice.actions;

export default selectedItemsSlice.reducer;