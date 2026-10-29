import React from 'react'
import { createRoot } from 'react-dom/client'
import Gaming from './Gaming.jsx'
import './styles.css'
import './gaming.css'
import './light.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Gaming />
  </React.StrictMode>,
)
