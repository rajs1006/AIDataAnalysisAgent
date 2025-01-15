// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { authService } from '@/services/auth.service'
import SignIn from '@/components/SignIn.vue'
import AppLayout from '@/layouts/AppLayout.vue'

const routes = [
  {
    path: '/signin',
    name: 'SignIn',
    component: SignIn,
    meta: {
      requiresAuth: false,
      layout: 'none'
    }
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/components/AppContents.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const isAuthenticated = authService.isAuthenticated()

  if (requiresAuth && !isAuthenticated) {
    next({ name: 'SignIn' })
  } else if (to.name === 'SignIn' && isAuthenticated) {
    next({ name: 'Home' })
  } else {
    next()
  }
})

export default router
