import { Bot } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex items-start space-x-4">
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white flex-shrink-0">
        <Bot className="h-5 w-5" />
      </div>
      <div className="flex-1 bg-[hsl(var(--lightChat))] dark:bg-[hsl(var(--darkChat))] p-4 rounded-lg shadow-sm">
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
}
