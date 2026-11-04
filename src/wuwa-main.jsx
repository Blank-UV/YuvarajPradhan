import React from 'react'
import { createRoot } from 'react-dom/client'
import WutheringWaves from './WutheringWaves.jsx'
import './styles.css'
import './gaming.css'
import './wuwa.css'
import './light.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WutheringWaves />
  </React.StrictMode>,
)
