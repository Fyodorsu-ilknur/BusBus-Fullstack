// src/store/selectedItemsSlice.js
import { createSlice } from '@reduxjs/toolkit';

const selectedItemsSlice = createSlice({
  name: 'selectedItems',
  initialState: {
    selectedStopIds: [],
    allStops: [] // Bu satırı ekleyin
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
    // Bu action'ı ekleyin
    setAllStops: (state, action) => {
      state.allStops = action.payload;
    }
  }
});

export const { toggleSelectedStop, clearSelectedStops, setAllStops } = selectedItemsSlice.actions;
export default selectedItemsSlice.reducer;