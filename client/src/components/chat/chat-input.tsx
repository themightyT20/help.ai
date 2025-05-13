import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageIcon, SendIcon } from "lucide-react";
import { ImageGenerationDialog } from "./image-generation-dialog";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  conversationId?: number;
}

export function ChatInput({ onSendMessage, disabled = false, conversationId }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showImageDialog, setShowImageDialog] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      
      // Limit to 5 rows max
      const lineHeight = parseInt(getComputedStyle(textareaRef.current).lineHeight);
      const maxHeight = lineHeight * 5;
      
      if (scrollHeight > maxHeight) {
        textareaRef.current.style.height = `${maxHeight}px`;
        textareaRef.current.style.overflowY = "auto";
      } else {
        textareaRef.current.style.height = `${scrollHeight}px`;
        textareaRef.current.style.overflowY = "hidden";
      }
    }
  }, [message]);

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage("");
      
      // Reset the textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-background transition-colors duration-200">
      <div className="max-w-3xl mx-auto px-4">
        <div className="relative flex items-center">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Help.ai..."
            className="w-full p-3 pr-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none min-h-[56px] shadow-sm"
            disabled={disabled}
          />
          <div className="absolute right-3 bottom-2 flex items-center space-x-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              disabled={disabled}
              onClick={() => setShowImageDialog(true)}
            >
              <ImageIcon className="h-5 w-5" />
              <span className="sr-only">Generate image</span>
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="p-2 bg-primary hover:bg-primary/90 text-white rounded-lg w-10 h-10 flex items-center justify-center"
              disabled={!message.trim() || disabled}
            >
              <SendIcon className="h-5 w-5" />
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          Help.ai may produce inaccurate information about people, places, or facts.
        </div>
      </div>
      
      {/* Image Generation Dialog */}
      <ImageGenerationDialog
        open={showImageDialog}
        onClose={() => setShowImageDialog(false)}
        onImageGenerated={(imageUrl, prompt) => {
          // When an image is generated, send the user's prompt as a message first
          onSendMessage(prompt);
          setShowImageDialog(false);
        }}
        conversationId={conversationId}
      />
    </div>
  );
}
