import { forwardRef } from "react";
import { User, Bot } from "lucide-react";
import { CodeBlock } from "./code-block";

interface ChatMessageProps {
  content: string;
  role: "user" | "assistant" | "system";
  timestamp?: Date;
}

export const ChatMessage = forwardRef<HTMLDivElement, ChatMessageProps>(
  ({ content, role, timestamp }, ref) => {
    // Process the content to extract code blocks
    const processContent = () => {
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = codeBlockRegex.exec(content)) !== null) {
        // Add text before the code block
        if (match.index > lastIndex) {
          parts.push({
            type: "text",
            content: content.slice(lastIndex, match.index),
          });
        }

        // Add the code block
        parts.push({
          type: "code",
          language: match[1] || "plaintext",
          content: match[2],
        });

        lastIndex = match.index + match[0].length;
      }

      // Add remaining text after the last code block
      if (lastIndex < content.length) {
        parts.push({
          type: "text",
          content: content.slice(lastIndex),
        });
      }

      return parts.length > 0 ? parts : [{ type: "text", content }];
    };

    const processedContent = processContent();

    return (
      <div ref={ref} className="flex items-start space-x-4">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 ${
            role === "user" ? "bg-blue-500" : "bg-primary"
          }`}
        >
          {role === "user" ? (
            <User className="h-5 w-5" />
          ) : (
            <Bot className="h-5 w-5" />
          )}
        </div>
        <div
          className={`flex-1 p-4 rounded-lg shadow-sm ${
            role === "user"
              ? "bg-blue-100 dark:bg-blue-900"
              : "bg-[hsl(var(--lightChat))] dark:bg-[hsl(var(--darkChat))]"
          }`}
        >
          {processedContent.map((part, index) => {
            if (part.type === "text") {
              // Split text content by newlines and preserve them
              const textWithLineBreaks = part.content
                .split("\n")
                .map((line, i, arr) => (
                  <span key={i}>
                    {line}
                    {i < arr.length - 1 && <br />}
                  </span>
                ));

              return <div key={index} className="mb-4">{textWithLineBreaks}</div>;
            } else if (part.type === "code") {
              return (
                <CodeBlock
                  key={index}
                  code={part.content}
                  language={part.language}
                  className="mb-4"
                />
              );
            }
            return null;
          })}

          {timestamp && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {timestamp instanceof Date && !isNaN(timestamp.getTime()) 
                ? timestamp.toLocaleString() 
                : ''}
            </div>
          )}
        </div>
      </div>
    );
  }
);

ChatMessage.displayName = "ChatMessage";
