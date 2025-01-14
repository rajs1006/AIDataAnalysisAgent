import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useToast } from 'vue-toastification';

export const useAppStore = defineStore('app', () => {
  const isSidebarVisible = ref(true)
  const isAboutVisible = ref(false)
  const toast = useToast()

  function toggleSidebar() {
    isSidebarVisible.value = !isSidebarVisible.value
  }

  function showAbout() {
    isAboutVisible.value = true
  }

  function hideAbout() {
    isAboutVisible.value = false
  }

  function addError(error: string) {
    toast.error(error)
  }

  return {
    isSidebarVisible,
    isAboutVisible,
    toggleSidebar,
    showAbout,
    hideAbout,
    addError
  };
})
