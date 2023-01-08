import { createApp } from '@vue/runtime-dom'
import App from '@Veil/App.vue'
import router from '@Veil/router/index'
import LottieAnimation from "lottie-web-vue";
import '@Veil/assets/css/base.css'

// force https
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
	location.replace(`https:${location.href.substring(location.protocol.length)}`)
}

createApp(App)
	.use(router)
	.use(LottieAnimation)
	.mount('#app')
