import { createWebHistory, createRouter } from "vue-router"
import Home from "@Veil/views/Home.vue"
import Composer from "@Veil/views/Composer.vue"

const routes = [
    {
        path: "/",
        name: "Home",
        component: Home,
    },
    {
        path: "/composer",
        name: "Composer",
        component: Composer,
    }
]

const router = createRouter({
    history: createWebHistory(),
    //@ts-ignore
    routes
})

export default router