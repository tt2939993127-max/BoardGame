import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// 初始化 i18n（语言检测 + 本地缓存）
import './lib/i18n'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
