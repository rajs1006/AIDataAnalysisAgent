// src/components/SignIn.vue
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
    await chatStore.fetchAndSyncConversations(); // Fetch conversations after successful login
    router.push('/');
  } catch (error: any) {
    const errorMessage = error.detail || error.message || 'An error occurred during sign in';
    appStore.addError(errorMessage);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
      <!-- Logo/Header -->
      <div class="text-center">
        <img src="/icon-192.png" alt="Logo" class="mx-auto h-12 w-12">
        <h2 class="mt-6 text-3xl font-bold text-gray-900">Sign in to AI Chat</h2>
      </div>

      <!-- Alerts -->
      <!-- <div v-for="error in appStore.errors" :key="error.id">
        <fwb-alert
          closable
          type="danger"
          class="mb-4"
          @close="appStore.removeError(error.id)"
        >
          {{ error.message }}
        </fwb-alert>
      </div> -->

      <!-- Form -->
      <form class="mt-8 space-y-6" @submit.prevent="handleSignIn">
        <div class="space-y-4">
          <fwb-input
            v-model="email"
            type="email"
            label="Email address"
            required
            autocomplete="email"
          />
          <fwb-input
            v-model="password"
            type="password"
            label="Password"
            required
            autocomplete="current-password"
          />
        </div>

        <div>
          <fwb-button
            type="submit"
            color="blue"
            class="w-full rounded"
            :disabled="isLoading"
          >
            <span v-if="!isLoading">Sign in</span>
            <span v-else>Signing in...</span>
          </fwb-button>
        </div>
      </form>
    </div>
  </div>
</template>