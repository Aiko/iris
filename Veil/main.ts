import { createApp } from '@vue/runtime-dom'
import App from '@Veil/App.vue'
import router from '@Veil/router/index'
import '@Veil/assets/css/base.css'

createApp(App).use(router).mount('#app')
