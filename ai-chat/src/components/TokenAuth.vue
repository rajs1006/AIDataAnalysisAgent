# src/components/TokenAuth.vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/services/auth.service'
import { useAppStore } from '@/stores/app.store'
import { FwbSpinner } from 'flowbite-vue'

const router = useRouter()
const appStore = useAppStore()

onMounted(async () => {
  console.log(router.currentRoute.value)
  const token = router.currentRoute.value.query.token as string

  if (!token) {
    appStore.addError('No authentication token provided')
    router.push('/')
    return
  }

  try {
    await authService.authenticateWithToken(token)
    router.push('/home')
  } catch (error) {
    appStore.addError('Authentication failed')
    router.push('/')
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[#0f1015]">
    <div 
      class="bg-[#1a1b23] p-8 rounded-xl shadow-2xl border border-[#2a2b33] 
             transform transition-all duration-500"
    >
      <div class="text-center">
        <img 
          src="/icon-192.png" 
          alt="Logo" 
          class="mx-auto h-12 w-12 mb-4 rounded-lg animate-pulse"
        >
        <FwbSpinner size="8" class="mb-4 text-blue-500" />
        <p class="text-gray-300">Authenticating...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Subtle pulsing animation for the container */
.shadow-2xl {
  animation: shadowPulse 2s infinite;
}

@keyframes shadowPulse {
  0% {
    box-shadow: 0 25px 50px -12px rgba(29, 78, 216, 0.05);
  }
  50% {
    box-shadow: 0 25px 50px -12px rgba(29, 78, 216, 0.15);
  }
  100% {
    box-shadow: 0 25px 50px -12px rgba(29, 78, 216, 0.05);
  }
}
</style>