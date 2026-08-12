// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import store from './app/store'
import router from './router'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1B2A6B',
            color: '#fff',
            fontSize: '13px',
            borderLeft: '3px solid #F5C433',
          },
          success: { iconTheme: { primary: '#F5C433', secondary: '#1B2A6B' } },
          error: { style: { borderLeftColor: '#A32D2D' } },
        }}
      />
    </Provider>
  </React.StrictMode>
)
