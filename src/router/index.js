import { createRouter, createWebHistory } from 'vue-router'
import EventListView from '../views/EventListView.vue'
import EventDetailView from '../views/EventDetailView.vue'
import AdminView from '../views/AdminView.vue'
import LoginView from '../views/LoginView.vue'

const routes = [
  { path: '/', component: EventListView },
  { path: '/events/:id', component: EventDetailView },
  { path: '/admin', component: AdminView },
  { path: '/login', component: LoginView }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
