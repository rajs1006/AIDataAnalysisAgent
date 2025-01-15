// src/utils/title-generator.ts

export function generateTitle(message: string): string {
  // Remove special characters and extra spaces
  const cleanMessage = message
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Get first 5-8 words
  const words = cleanMessage.split(' ')
  const titleWords = words.slice(0, words.length > 7 ? 5 : Math.min(words.length, 8))

  // Create title
  let title = titleWords.join(' ')

  // Add ellipsis if we truncated the message
  if (words.length > titleWords.length) {
    title += '...'
  }

  return title
}
