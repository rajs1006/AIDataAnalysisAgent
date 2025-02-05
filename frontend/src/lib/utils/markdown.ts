import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

export const renderMarkdown = (content: string): string => {
  try {
    // Extensive logging for debugging
    console.log("Rendering markdown:", {
      contentLength: content.length,
      firstChars: content.slice(0, 100),
      containsList: /^\s*[-*+]\s/.test(content),
      containsCodeBlock: /```[\s\S]*```/.test(content),
    });

    // Synchronous markdown parsing
    const processor = unified()
      .use(remarkParse)      // Parse markdown
      .use(remarkGfm)        // Support GitHub Flavored Markdown
      .use(remarkRehype)     // Convert to HTML
      .use(rehypeStringify); // Stringify HTML

    const renderedContent = processor.processSync(content);

    return `<div class="markdown-content" data-raw-text="${encodeURIComponent(content)}">${String(renderedContent)}</div>`;
  } catch (error: unknown) {
    // Comprehensive error logging
    const errorDetails =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : { name: "Unknown Error", message: String(error) };

    console.error("Markdown rendering critical error:", {
      ...errorDetails,
      originalContent: content,
      contentLength: content.length,
      firstChars: content.slice(0, 100),
    });

    // Fallback to escaped content with basic formatting
    const safeContent = content
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br/>");

    return `<div class="markdown-content" data-raw-text="${encodeURIComponent(content)}">${safeContent}</div>`;
  }
};
