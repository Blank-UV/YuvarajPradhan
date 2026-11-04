import React from 'react'
import { createRoot } from 'react-dom/client'
import SilverPalace from './SilverPalace.jsx'
import './styles.css'
import './gaming.css'
import './wuwa.css'
import './silver-palace.css'
import './light.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SilverPalace />
  </React.StrictMode>,
)
