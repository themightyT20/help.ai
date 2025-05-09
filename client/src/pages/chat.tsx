import { useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessage } from "@/components/chat/chat-message";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { Sidebar } from "@/components/layout/sidebar";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/lib/auth2";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginModal } from "@/components/login-modal";

export default function Chat() {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const conversationId = params.get("id") ? parseInt(params.get("id")!) : null;

  // Try to get auth details, if auth context is available
  let user = null;
  let isAuthLoading = false;
  
  try {
    const auth = useAuth();
    user = auth.user;
    isAuthLoading = auth.isLoading;
  } catch (error) {
    console.warn("Auth context not available:", error);
  }
  const {
    messages,
    isLoading: isChatLoading,
    conversation,
    loadConversation,
    startNewConversation,
    sendUserMessage,
  } = useChat();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLoading = isChatLoading || isAuthLoading;

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Load conversation or start a new one when the component mounts
  useEffect(() => {
    const initializeChat = async () => {
      if (conversationId) {
        await loadConversation(conversationId);
      } else if (user && !conversationId) {
        // Start a new conversation if user is logged in but no conversation is selected
        const newId = await startNewConversation();
        if (newId) {
          navigate(`/?id=${newId}`);
        }
      }
    };

    if (!isAuthLoading) {
      initializeChat();
    }
  }, [conversationId, user, isAuthLoading]);

  const handleSendMessage = async (content: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!conversation) {
      const newId = await startNewConversation();
      if (newId) {
        navigate(`/?id=${newId}`);
        await sendUserMessage(content);
      }
    } else {
      await sendUserMessage(content);
    }
  };

  const handleNewChat = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const newId = await startNewConversation();
    if (newId) {
      navigate(`/?id=${newId}`);
    }
  };

  // Example prompts for the welcome screen
  const examplePrompts = [
    {
      title: "Web search example",
      prompt: "Find the latest research on climate change solutions",
    },
    {
      title: "Code generation example",
      prompt: "Write a Python function to calculate Fibonacci numbers",
    },
    {
      title: "Project assistance",
      prompt: "Help me design a database schema for a task management app",
    },
    {
      title: "Creative writing",
      prompt: "Write a short story about a robot discovering emotions",
    },
  ];

  return (
    <>
      <Sidebar onNewChat={handleNewChat} currentConversationId={conversationId || undefined} />

      <main className="lg:ml-64 transition-all duration-300 flex flex-col h-screen">
        <div
          id="chat-container"
          className="flex-1 overflow-y-auto px-4 py-6 md:px-8"
        >
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Welcome Screen */}
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center space-y-6 h-full text-center py-8">
                <div className="w-24 h-24 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
                  <Bot className="h-12 w-12 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">Welcome to Help.ai</h1>
                <p className="text-md text-gray-600 dark:text-gray-300 max-w-lg">
                  Powered by Mixtral 8x7b, I can assist with coding, answer questions, search the web, 
                  and help with many other tasks. How can I help you today?
                </p>

                {/* Example prompts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mt-4">
                  {examplePrompts.map((example, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto p-4 bg-[hsl(var(--lightChat))] dark:bg-[hsl(var(--darkChat))] rounded-lg text-left hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => handleSendMessage(example.prompt)}
                    >
                      <div className="flex flex-col items-start">
                        <div className="font-medium mb-1">{example.title}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {example.prompt}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {messages.map((message, index) => (
              message.isLoading ? (
                <TypingIndicator key={`loading-${index}`} />
              ) : (
                <ChatMessage 
                  key={message.id || index}
                  content={message.content}
                  role={message.role}
                  timestamp={message.timestamp}
                />
              )
            ))}

            {/* Loading Indicator */}
            {isLoading && messages.length === 0 && <TypingIndicator />}

            {/* This empty div is for scrolling to the bottom */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Chat Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading}
        />
      </main>

      {/* Login Modal */}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </>
  );
}
