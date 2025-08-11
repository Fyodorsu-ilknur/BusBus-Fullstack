// src/store/selectedItemsSlice.js
import { createSlice } from '@reduxjs/toolkit';

const selectedItemsSlice = createSlice({
  name: 'selectedItems',
  initialState: {
    selectedStopIds: [],
    allStops: [],
    selectedRouteIds: [],
    allRoutes: {} // Başlangıçta boş bir obje, App.js dolduracak
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
    selectAllStops: (state) => {
      // allStops dizisindeki tüm durak ID'lerini al ve selectedStopIds'a ata
      state.selectedStopIds = state.allStops.map(stop => stop.id);
    },
    setSelectedStopIds: (state, action) => {
      state.selectedStopIds = action.payload;
    },
    // Otobüs Hatları için reducer'lar
    toggleSelectedRoute: (state, action) => {
        const routeId = action.payload;
        if (state.selectedRouteIds.includes(routeId)) {
            state.selectedRouteIds = state.selectedRouteIds.filter(id => id !== routeId);
        } else {
            state.selectedRouteIds.push(routeId);
        }
    },
    clearSelectedRoutes: (state) => {
        state.selectedRouteIds = [];
    },
    selectAllRoutes: (state) => {
      // allRoutes objesindeki tüm rota ID'lerini al ve selectedRouteIds'a ata
      state.selectedRouteIds = Object.keys(state.allRoutes);
    },
    setAllRoutes: (state, action) => {
        // App.js'ten gelen veri zaten obje formatında (id'leri key olarak) olduğu varsayılır.
        // Bu reducer'ın işi sadece state'i payload ile güncellemektir.
        state.allRoutes = action.payload;
    }
  }
});

export const {
    toggleSelectedStop,
    clearSelectedStops,
    setAllStops,
    selectAllStops, // Bu artık doğru şekilde tanımlandı
    setSelectedStopIds, // Yeni eklenen action
    toggleSelectedRoute,
    clearSelectedRoutes,
    selectAllRoutes,
    setAllRoutes
} = selectedItemsSlice.actions;

export default selectedItemsSlice.reducer;