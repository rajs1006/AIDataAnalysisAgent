# src/components/AppHeader.vue
<script setup lang="ts">
import { useAppStore } from '@/stores/app.store';
import { 
  Bars3Icon, 
  Cog6ToothIcon, 
  QuestionMarkCircleIcon,
  PowerIcon 
} from '@heroicons/vue/24/outline';
import { authService } from '@/services/auth.service';

const appStore = useAppStore();

function handleSignOut() {
  authService.signOut();
}
</script>

<template>
  <div class="p-2 bg-[#1a1b23] border-b border-[#2a2b33] flex justify-between">
    <div title="Toggle sidebar">
      <Bars3Icon 
        class="h-6 w-6 text-gray-400 cursor-pointer hover:text-blue-400 transition-colors duration-200" 
        @click="appStore.toggleSidebar()"
      />
    </div>
    <div class="flex items-center gap-2">
      <div title="Sign out">
        <PowerIcon 
          class="h-6 w-6 text-gray-400 cursor-pointer hover:text-blue-400 transition-colors duration-200" 
          @click="handleSignOut"
        />
      </div>
    </div>
  </div>
</template>