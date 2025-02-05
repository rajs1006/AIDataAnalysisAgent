/**
 * Generates a title from the first message content
 * Extracts first few meaningful words or uses a default title
 */
export const generateTitle = (content: string): string => {
  // Remove special characters and extra spaces
  const cleanContent = content.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Get first few words (up to 5)
  const words = cleanContent.split(' ').slice(0, 5);
  
  // If we have words, create a title
  if (words.length > 0) {
    // Capitalize first word
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    
    // Join words and add ellipsis if truncated
    const title = words.join(' ');
    return title + (cleanContent.split(' ').length > 5 ? '...' : '');
  }
  
  // Fallback title
  return 'New Conversation';
};
