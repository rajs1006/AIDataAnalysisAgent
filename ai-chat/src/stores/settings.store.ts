// src/stores/settings.store.ts
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { db } from '@/db'
import type { Settings } from '@/models/settings.model'
// import { authService } from '@/services/auth.service'

export const useSettingsStore = defineStore('settings', () => {
  const DEFAULT_TEMP = '0.7'
  const DEFAULT_MODEL = 'gpt-4o-mini'
  const DEFAULT_MAX_TOKENS = '500'

  const areSettingsVisible = ref(false)
  const apiKey = ref<string>('')
  const temp = ref<string>('')
  const model = ref<string>('')
  const maxTokens = ref<string>('')
  const dbReloadCount = ref(0)

  function showSettings() {
    areSettingsVisible.value = true
  }

  function hideSettings() {
    areSettingsVisible.value = false
  }

  async function reloadSettings(i = 1) {
    try {
      const settings = await db.settings.get(1)
      if (!settings) {
        if (i > 1) {
          throw new Error('Endless loop while creating settings DB')
        }
        await db.settings.add({
          openaiApiKey: '',
          openaiTemp: DEFAULT_TEMP,
          openaiModel: DEFAULT_MODEL,
          openaiMaxTokens: DEFAULT_MAX_TOKENS
        })
        i++
        await reloadSettings(i)
      } else {
        apiKey.value = settings.openaiApiKey
        temp.value = settings.openaiTemp
        model.value = settings.openaiModel
        maxTokens.value = settings.openaiMaxTokens
        // Sync with auth service
        // if (apiKey.value) {
        //   authService.setApiKey(apiKey.value)
        // }
        dbReloadCount.value++
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function updateSettings(form: Settings) {
    try {
      await db.settings.update(1, {
        openaiApiKey: form.openaiApiKey,
        openaiTemp: form.openaiTemp,
        openaiModel: form.openaiModel,
        openaiMaxTokens: form.openaiMaxTokens
      })
      // Update auth service
      // if (form.openaiApiKey) {
      //   authService.setApiKey(form.openaiApiKey)
      // } else {
      //   authService.clearApiKey()
      // }
    } catch (e) {
      console.error(e)
    }
  }

  watch(areSettingsVisible, async (newValue, oldValue) => {
    if (oldValue === true && newValue === false) {
      await reloadSettings()
    }
  })

  return {
    areSettingsVisible,
    apiKey,
    temp,
    model,
    maxTokens,
    dbReloadCount,
    showSettings,
    hideSettings,
    reloadSettings,
    updateSettings
  }
})
