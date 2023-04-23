import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Inbox from '@/views/Inbox.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/inbox'
  },
  {
    path: '/inbox',
    name: 'Inbox',
    component: Inbox
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
