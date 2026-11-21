import { createApp } from 'vue'
import './app/global.css'
import './app/theme.css'
import App from './app/App.vue'
import { setupTheme } from './app/theme.js'

setupTheme()
createApp(App).mount('#root')
