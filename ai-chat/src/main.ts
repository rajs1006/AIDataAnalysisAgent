import './assets/main.css'
import '../node_modules/flowbite-vue/dist/index.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'

import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

import App from './App.vue'

const app = createApp(App)

app.use(createPinia())
app.use(router)
// Add this before app.mount('#app')
app.use(Toast, {
  position: 'top-right',
  timeout: 5000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true
})

app.mount('#app')
