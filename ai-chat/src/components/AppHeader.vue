// src/components/AppHeader.vue
<script setup lang="ts">
import { useAppStore } from '@/stores/app.store';
import { 
  Bars3Icon, 
  Cog6ToothIcon, 
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon 
} from '@heroicons/vue/24/outline';
// import { useSettingsStore } from '@/stores/settings.store';
import { authService } from '@/services/auth.service';

const appStore = useAppStore();
// const settingsStore = useSettingsStore();

function handleSignOut() {
  authService.signOut();
}
</script>

<template>
  <div class="p-2 bg-gray-200 flex justify-between">
    <div title="Toggle sidebar">
      <Bars3Icon 
        class="h-6 w-6 text-gray-500 cursor-pointer hover:text-blue-600" 
        @click="appStore.toggleSidebar()"
      />
    </div>
    <div class="flex items-center gap-2">
      <!-- <div title="Show settings">
        <Cog6ToothIcon 
          class="h-6 w-6 text-gray-500 cursor-pointer hover:text-blue-600" 
          @click="settingsStore.showSettings()"
        />
      </div> -->
      <!-- <div title="About">
        <QuestionMarkCircleIcon 
          class="h-6 w-6 text-gray-500 cursor-pointer hover:text-blue-600" 
          @click="appStore.showAbout()"
        />
      </div> -->
      <div title="Sign out">
        <ArrowRightOnRectangleIcon 
          class="h-6 w-6 text-gray-500 cursor-pointer hover:text-blue-600" 
          @click="handleSignOut"
        />
      </div>
    </div>
  </div>
</template>