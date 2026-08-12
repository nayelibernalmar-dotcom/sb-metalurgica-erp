// src/app/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authService } from '../../services'

// Thunk: acción asíncrona de login
export const login = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const res = await authService.login(email, password)
    const { token, usuario } = res.data
    localStorage.setItem('sbm_token', token)
    localStorage.setItem('sbm_user', JSON.stringify(usuario))
    return { token, usuario }
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Error al iniciar sesión')
  }
})

const storedUser = (() => {
  try { return JSON.parse(localStorage.getItem('sbm_user')) } catch { return null }
})()

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    usuario: storedUser,
    token: localStorage.getItem('sbm_token') || null,
    loading: false,
    error: null,
  },
  reducers: {
    logout(state) {
      state.usuario = null
      state.token = null
      localStorage.removeItem('sbm_token')
      localStorage.removeItem('sbm_user')
    },
    clearError(state) { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.token = action.payload.token
        state.usuario = action.payload.usuario
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const { logout, clearError } = authSlice.actions
export default authSlice.reducer
