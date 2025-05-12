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

        // Add the code block with language type safety
        parts.push({
          type: "code",
          language: (match[1] || "plaintext") as string,
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
      <div ref={ref} className={`flex items-start space-x-4 mb-4 ${role === "user" ? "flex-row-reverse justify-start pl-12" : "pr-12"}`}>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 ${
            role === "user" ? "bg-blue-500 ml-4" : "bg-primary mr-4"
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
              ? "bg-blue-600 dark:bg-blue-800 text-white"
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
                  language={part.language || 'plaintext'}
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
