import { authService } from '@/services/auth.service'
import { useAppStore } from '@/stores/app.store'

export function handleApiError(error: any) {
  if (error.response?.status === 401) {
    // Get app store for showing error message
    const appStore = useAppStore()

    // Show error message
    appStore.addError('Your session has expired. Please login again.')

    // Trigger logout
    authService.signOut()
  }

  return Promise.reject(error)
}
