import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

export function FormattedText({ text, className = '' }: FormattedTextProps) {
  // Process the text in multiple passes to handle nested formatting
  const processText = (text: string) => {
    // Split into blocks (paragraphs, lists, etc)
    const blocks = text.split('\n\n');
    
    return blocks.map((block, blockIndex) => {
      // Check if this block is a list
      if (block.trim().split('\n').every(line => line.trim().startsWith('- '))) {
        const listItems = block.split('\n');
        return (
          <ul key={blockIndex} className="my-2 list-disc list-inside">
            {listItems.map((item, itemIndex) => (
              <li key={itemIndex} className="ml-4">
                {processInlineFormatting(item.slice(2))}
              </li>
            ))}
          </ul>
        );
      }

      // Handle headers
      if (block.startsWith('### ')) {
        return (
          <h3 key={blockIndex} className="text-lg font-semibold mt-4 mb-2">
            {processInlineFormatting(block.slice(4))}
          </h3>
        );
      }

      // Handle paragraphs with inline formatting
      const lines = block.split('\n');
      return (
        <p key={blockIndex} className="my-2">
          {lines.map((line, lineIndex) => (
            <React.Fragment key={lineIndex}>
              {processInlineFormatting(line)}
              {lineIndex < lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );
    });
  };

  // Handle inline formatting (bold, links, etc)
  const processInlineFormatting = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
    
    return parts.map((part, index) => {
      // Handle bold text
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      
      // Handle links
      const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        return (
          <a
            key={index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {linkMatch[1]}
          </a>
        );
      }

      return part;
    });
  };

  return (
    <div className={`prose max-w-none ${className}`}>
      {processText(text)}
    </div>
  );
}