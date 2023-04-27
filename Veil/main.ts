import { createApp } from '@vue/runtime-dom'
import App from '@Veil/App.vue'
import router from '@Veil/router/index'
import LottieAnimation from "lottie-web-vue";
import '@Veil/assets/css/base.css'

// force https
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
	location.replace(`https:${location.href.substring(location.protocol.length)}`)
}

//? Set accent color
const accentColor = 0x486FFF // parseInt(location.hash.slice(1) ?? "486FFF", 16)
const root = document.documentElement
root.style.setProperty('--primary-color', `#${accentColor.toString(16)}`)
const hoverOffset = 0x050917
root.style.setProperty('--primary-color-hover', `#${(accentColor - hoverOffset).toString(16)}`)


createApp(App)
	.use(router)
	.use(LottieAnimation)
	.mount('#app')
