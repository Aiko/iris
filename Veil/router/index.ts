import { createWebHistory, createRouter, type RouteRecordRaw } from "vue-router"
import Inbox from "@Veil/views/Inbox.vue"
import Composer from "@Veil/views/Composer.vue"
import Calendar from "@Veil/views/Calendar.vue"
import DemoScribe from "@Veil/views/DemoScribe.vue"

const routes: RouteRecordRaw[] = [
	{
		path: "/",
		name: "Inbox",
		component: Inbox,
	},
	{
		path: "/composer",
		name: "Composer",
		component: Composer,
	},
	{
		path: "/scribe-demo",
		name: "Scribe Demo",
		component: DemoScribe
	},
	{
		path: "/calendar",
		name: "Calendar",
		component: Calendar
	}
]

const router = createRouter({
	history: createWebHistory(),
	routes
})

export default router