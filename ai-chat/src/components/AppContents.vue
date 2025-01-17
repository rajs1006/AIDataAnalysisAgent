# src/components/AppContents.vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { PlayIcon } from '@heroicons/vue/24/outline'
import { Role } from '@/models/role.model'
import { useChatStore } from '@/stores/chat.store'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import { FwbButton, FwbSpinner } from 'flowbite-vue'
import { useAppStore } from '@/stores/app.store'
import { POSITION, useToast } from 'vue-toastification'

const input = ref('')
const inputTextarea = ref<HTMLTextAreaElement | null>(null)
const scrollingDiv = ref<HTMLElement | null>(null)
const userScrolled = ref(false)
const pending = ref(false)
const showAnimation = ref(false)

const appStore = useAppStore()
const chatStore = useChatStore()
const toast = useToast()

// Configure markdown-it with all features enabled
const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch (e) {
        console.log(e)
      }
    }
    return ''
  }
})

const isInputEnabled = computed(() => !pending.value)
const isSendBtnEnabled = computed(() => input.value?.trim().length > 0)

// Get user initials from email
const userInitials = computed(() => {
  const email = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}').email : ''
  return email
    .split('@')[0]
    .split(/[._-]/)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
})

// Function to convert HTML to properly formatted plain text
const htmlToPlainText = (html: string): string => {
  // Create a temporary div to hold our HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html

  // Function to process a node and its children
  const processNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || ''
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element
      const tagName = element.tagName.toLowerCase()
      
      // Build text content from all child nodes
      const childTexts = Array.from(node.childNodes).map(child => processNode(child))
      let text = childTexts.join('')

      // Handle specific HTML elements
      switch (tagName) {
        case 'p':
          return `${text}\n\n`
        case 'br':
          return '\n'
        case 'div':
          return `${text}\n`
        case 'li':
          return `• ${text}\n`
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          return `${text}\n\n`
        case 'pre':
        case 'code':
          return `\n${text}\n\n`
        case 'blockquote':
          return `> ${text}\n\n`
        default:
          return text
      }
    }

    return ''
  }

  // Process the entire document and clean up extra whitespace
  const text = processNode(tempDiv)
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace multiple newlines with just two
    .replace(/^\s+|\s+$/g, '') // Trim start and end whitespace

  return text
}

// Function to copy text and show feedback
const copyToClipboard = async (html: string) => {
  try {
    let plainText = htmlToPlainText(html)
    plainText = plainText.replace(/\*\*/g, '')
    plainText = plainText.replace(/(\*|_)(.*?)\1/g, '$2')
    await navigator.clipboard.writeText(plainText)
    toast.success('Message copied to clipboard!', {
      timeout: 2000,
      position: POSITION.TOP_RIGHT
    })
  } catch (err) {
    toast.error('Failed to copy message', {
      timeout: 2000
    })
  }
}

onMounted(() => {
  setTimeout(() => {
    inputTextarea.value?.focus()
    showAnimation.value = true
  }, 100)
})

watch(() => chatStore.currentChatId, () => {
  input.value = ''
  focusInput()
})

function focusInput() {
  setTimeout(() => inputTextarea.value?.focus(), 100)
}

async function onSend() {
  if (!input.value.trim()) return
  
  pending.value = true
  try {
    userScrolled.value = false
    inputTextarea.value?.blur()

    const messageContent = input.value
    input.value = ''

    await chatStore.addMessage({ 
      role: Role.user, 
      content: messageContent 
    })
    
    autoScrollDown()
  } catch (e) {
    if (e instanceof Error) {
      appStore.addError(e.message)
    }
  }
  pending.value = false
  focusInput()
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    onSend()
  }
}

function autoScrollDown() {
  if (scrollingDiv.value && !userScrolled.value) {
    scrollingDiv.value.scrollTop = scrollingDiv.value.scrollHeight
  }
}

function checkIfUserScrolled() {
  if (scrollingDiv.value) {
    userScrolled.value =
      scrollingDiv.value.scrollTop + scrollingDiv.value.clientHeight !==
      scrollingDiv.value.scrollHeight
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col h-screen bg-[#0f1015] text-gray-100">
    <!-- Main chat area -->
    <main 
      class="flex-1 px-4 py-6 overflow-y-auto mb-4 scroll-smooth" 
      ref="scrollingDiv" 
      @scroll="checkIfUserScrolled()"
    >
      <div class="max-w-4xl mx-auto">
        <template v-if="chatStore.currentChat">
          <TransitionGroup 
            name="message"
            tag="div"
            class="space-y-8"
          >
            <template v-for="(message, index) in chatStore.currentChat.messages" :key="index">
              <!-- User message -->
              <div v-if="message.content && message.role === Role.user"
                   class="flex items-start justify-end space-x-3 fade-in">
                <div class="flex flex-col items-end space-y-2 flex-1">
                  <div
                    class="message-bubble user-message max-w-2xl rounded-lg px-4 py-3 shadow-lg 
                           bg-blue-600 text-white transform transition-all duration-300 hover:scale-[1.02]"
                    v-html="md.render(message.content)"
                  />
                </div>
                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-semibold text-white">
                  {{ userInitials }}
                </div>
              </div>

              <!-- Assistant message -->
              <div v-if="message.content && message.role === Role.assistant"
                   class="flex items-start space-x-3 fade-in">
                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-semibold text-white">
                  <img
                    className="w-10 h-10 rounded-full"
                    src="/icon-192.png"
                    alt="My icon"
                  />
                </div>
                <div class="flex flex-col space-y-2 flex-1">
                  <div @contextmenu.prevent="(e: MouseEvent) => copyToClipboard((e.currentTarget as HTMLElement)?.innerText ?? '')"
                    class="message-bubble assistant-message max-w-2xl rounded-lg px-4 py-3 shadow-lg 
                           bg-[#1a1b23] transform transition-all duration-300 hover:scale-[1.02]
                           cursor-pointer select-all"
                    v-html="md.render(message.content)"
                  />
                </div>
              </div>
            </template>
          </TransitionGroup>
        </template>
      </div>
    </main>

    <!-- Footer with input area -->
    <footer 
      class="border-t border-[#1a1b23] bg-[#0f1015] mb-8 transition-opacity duration-500"
      :class="{ 'opacity-100': showAnimation, 'opacity-0': !showAnimation }"
    >
      <div class="max-w-4xl mx-auto px-4 py-4">
        <div class="flex items-center space-x-4">
          <div class="flex-grow relative">
            <textarea
              class="w-full h-24 px-4 py-3 bg-[#1a1b23] text-gray-100 rounded-lg border border-[#2a2b33] 
                     resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     transition-colors duration-200 placeholder-gray-400"
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              ref="inputTextarea"
              v-model="input"
              @keydown="handleKeyDown"
              :disabled="!isInputEnabled"
            />
          </div>
          <div class="flex-shrink-0">
            <button
              @click="onSend"
              :disabled="!isSendBtnEnabled || pending"
              class="p-4 rounded-full bg-blue-600 text-white hover:bg-blue-700 
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transform transition-all duration-200 hover:scale-105 active:scale-95
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#0f1015]"
            >
              <PlayIcon class="h-6 w-6" v-if="!pending" />
              <FwbSpinner size="6" v-else />
            </button>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
@import '../../node_modules/highlight.js/styles/github-dark.css';

/* Message animations */
.message-enter-active,
.message-leave-active {
  transition: all 0.5s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.message-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Fade in animation */
.fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #1f2937;
}

::-webkit-scrollbar-thumb {
  background: #374151;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #4b5563;
}

.message-content {
  font-size: 1rem;
  line-height: 1.6;

  /* Basic text styling */
  p:not(:last-child) {
    margin-bottom: 1rem;
  }

  /* Lists */
  ul, ol {
    margin: 1rem 0;
    padding-left: 2rem;
  }

  ul {
    list-style-type: disc;
  }

  ol {
    list-style-type: decimal;
  }

  li {
    margin-bottom: 0.5rem;
  }

  /* Headings */
  h1, h2, h3, h4, h5, h6 {
    font-weight: bold;
    margin-top: 1.5rem;
    margin-bottom: 1rem;
    line-height: 1.3;
  }

  h1 { font-size: 1.8rem; }
  h2 { font-size: 1.5rem; }
  h3 { font-size: 1.3rem; }
  h4 { font-size: 1.2rem; }
  h5 { font-size: 1.1rem; }
  h6 { font-size: 1rem; }

  /* Links */
  a {
    color: #60a5fa;
    text-decoration: underline;
    transition: color 0.2s;
    &:hover {
      color: #93c5fd;
    }
  }

  /* Blockquotes */
  blockquote {
    border-left: 4px solid #374151;
    margin: 1rem 0;
    padding: 0.5rem 0 0.5rem 1rem;
    font-style: italic;
    color: #9ca3af;
  }

  /* Code blocks */
  pre {
    background-color: #1f2937;
    border-radius: 0.5rem;
    padding: 1rem;
    margin: 1rem 0;
    overflow-x: auto;
  }

  code {
    background-color: #374151;
    padding: 0.2rem 0.4rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
  }

  /* Inline formatting */
  strong {
    font-weight: 600;
    color: #f3f4f6;
  }

  em {
    font-style: italic;
  }

  /* Tables */
  table {
    width: 100%;
    margin: 1rem 0;
    border-collapse: collapse;
  }

  th, td {
    border: 1px solid #374151;
    padding: 0.5rem;
    text-align: left;
  }

  th {
    background-color: #1f2937;
    font-weight: 600;
  }

  /* Horizontal rule */
  hr {
    border: 0;
    border-top: 1px solid #374151;
    margin: 1.5rem 0;
  }
}

/* Message bubbles */
.message-bubble {
  position: relative;
  transition: all 0.3s ease;
}

.user-message {
  border-radius: 20px 20px 0 20px;
}

.assistant-message {
  border-radius: 20px 20px 20px 0;
}

/* Typing indicator animation */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
}

.typing-dot {
  width: 6px;
  height: 6px;
  background-color: #ffffff;
  border-radius: 50%;
  animation: typingDot 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingDot {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
}

/* Add pointer cursor for assistant messages */
.assistant-message {
  cursor: pointer;
}

/* Add selection color */
::selection {
  background-color: rgba(59, 130, 246, 0.5);
  color: white;
}
</style>