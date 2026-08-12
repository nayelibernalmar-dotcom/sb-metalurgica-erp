// src/app/slices/uiSlice.js
import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    modal: null,       // nombre del modal abierto
    modalData: null,   // datos pasados al modal (para edición)
  },
  reducers: {
    openModal(state, action) {
      state.modal = action.payload.name
      state.modalData = action.payload.data || null
    },
    closeModal(state) {
      state.modal = null
      state.modalData = null
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
  },
})

export const { openModal, closeModal, toggleSidebar } = uiSlice.actions
export default uiSlice.reducer
