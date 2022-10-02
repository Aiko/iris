import { createWebHistory, createRouter } from "vue-router"
import Home from "@Veil/views/Home.vue"

const routes = [
    {
        path: "/",
        name: "Home",
        component: Home,
    }
]

const router = createRouter({
    history: createWebHistory(),
    //@ts-ignore
    routes
})

export default router