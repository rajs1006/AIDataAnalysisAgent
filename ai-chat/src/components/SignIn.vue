# src/components/SignIn.vue
<script setup lang="ts">
import { ref } from 'vue';
import { FwbButton, FwbInput, FwbAlert } from 'flowbite-vue';
import { useRouter } from 'vue-router';
import { authService } from '@/services/auth.service';
import { useAppStore } from '@/stores/app.store';
import { useChatStore } from '@/stores/chat.store';

const email = ref('');
const password = ref('');
const isLoading = ref(false);
const router = useRouter();
const appStore = useAppStore();
const chatStore = useChatStore();

async function handleSignIn() {
  if (!email.value || !password.value) {
    appStore.addError('Please fill in all fields');
    return;
  }

  isLoading.value = true;
  try {
    await authService.signIn(email.value, password.value);
    await chatStore.fetchAndSyncConversations();
    router.push('/home');
  } catch (error: any) {
    const errorMessage = error.detail || error.message || 'An error occurred during sign in';
    appStore.addError(errorMessage);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[#0f1015] py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-[#1a1b23] p-8 rounded-xl shadow-2xl border border-[#2a2b33]
                transform transition-all duration-500 hover:shadow-blue-500/5">
      <!-- Logo/Header -->
      <div class="text-center">
        <img 
          src="/icon-192.png" 
          alt="Logo" 
          class="mx-auto h-12 w-12 rounded-lg transform transition-transform duration-300 hover:scale-110"
        >
        <h2 class="mt-0 -m-5 text-3xl font-bold text-gray-100">ANDRUAL</h2>
        <p class="mt-6 text-sm font-medium italic text-gray-500">Talk to your data</p>
      </div>

      <!-- Form -->
      <form class="mt-8 space-y-6" @submit.prevent="handleSignIn">
        <div class="space-y-4">
          <!-- Email Input -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-300 mb-2">Email address</label>
            <input
              v-model="email"
              id="email"
              type="email"
              required
              autocomplete="email"
              class="appearance-none relative block w-full px-3 py-2 border border-[#2a2b33] 
                     placeholder-gray-500 text-gray-100 rounded-lg
                     bg-[#0f1015] focus:outline-none focus:ring-2 focus:ring-blue-500 
                     focus:border-transparent transition-all duration-200
                     [&:not(:placeholder-shown)]:bg-[#0f1015] [&:not(:placeholder-shown)]:text-gray-100"
            />
          </div>

          <!-- Password Input -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <input
              v-model="password"
              id="password"
              type="password"
              required
              autocomplete="current-password"
              placeholder="Enter your password"
              class="appearance-none relative block w-full px-3 py-2 border border-[#2a2b33] 
                     placeholder-gray-500 text-gray-100 rounded-lg
                     bg-[#0f1015] focus:outline-none focus:ring-2 focus:ring-blue-500 
                     focus:border-transparent transition-all duration-200
                     [&:not(:placeholder-shown)]:bg-[#0f1015] [&:not(:placeholder-shown)]:text-gray-100"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent 
                   text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                   disabled:hover:scale-100"
          >
            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg 
                class="h-5 w-5 text-blue-200 group-hover:text-blue-200 transition-colors duration-200" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 20 20" 
                fill="currentColor" 
                aria-hidden="true"
              >
                <path 
                  fill-rule="evenodd" 
                  d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" 
                  clip-rule="evenodd" 
                />
              </svg>
            </span>
            <span v-if="!isLoading">Sign in</span>
            <span v-else class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Gradient animation for the card border */
.shadow-2xl {
  animation: borderGlow 4s ease-in-out infinite;
}

@keyframes borderGlow {
  0% { box-shadow: 0 25px 50px -12px rgba(29, 78, 216, 0.05); }
  50% { box-shadow: 0 25px 50px -12px rgba(29, 78, 216, 0.15); }
  100% { box-shadow: 0 25px 50px -12px rgba(29, 78, 216, 0.05); }
}
</style>