import { createApp } from '@vue/runtime-dom'
import App from '@Veil/App.vue'
import router from '@Veil/router'
import LottieAnimation from "lottie-web-vue";
import '@Veil/assets/css/base.css'
import Logger from '@Veil/services/roots'
const Log = new Logger('Veil', { bgColor: "#09d8c1", fgColor: "#000000" })
// @ts-ignore
window.log = Log
import * as Puppetry from '@Veil/services/puppetry'
Puppetry.init()
import { setAccentColor } from '@Veil/state/common';

// force https
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
	location.replace(`https:${location.href.substring(location.protocol.length)}`)
}

//? Set accent color
setAccentColor(location.hash)

createApp(App)
	.use(router)
	.use(LottieAnimation)
	.mount('#app')
