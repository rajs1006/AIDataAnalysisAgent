// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { authService } from '@/services/auth.service'
import SignIn from '@/components/SignIn.vue'
import AppLayout from '@/layouts/AppLayout.vue'

const routes = [
  {
    path: '/',
    name: 'SignIn',
    component: SignIn,
    meta: {
      requiresAuth: false,
      layout: 'none'
    }
  },
  {
    path: '/auth',
    name: 'Auth',
    component: () => import('@/components/TokenAuth.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/home',
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

// Modified navigation guard to handle token in URL
router.beforeEach(async (to, from, next) => {
  console.log(to)
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const isAuthenticated = authService.isAuthenticated()
  const token = to.query.token as string | undefined

  // Handle incoming token
  if (token && !isAuthenticated) {
    try {
      await authService.authenticateWithToken(token)
      return next({ name: 'Home' })
    } catch (error) {
      console.error('Token authentication failed:', error)
      return next({ name: 'SignIn' })
    }
  }

  if (requiresAuth && !isAuthenticated) {
    next({ name: 'SignIn' })
  } else if (to.name === 'SignIn' && isAuthenticated) {
    next({ name: 'Home' })
  } else {
    next()
  }
})

export default router
