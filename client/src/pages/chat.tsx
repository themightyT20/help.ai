import { useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessage } from "@/components/chat/chat-message";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { Sidebar } from "@/components/layout/sidebar";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/lib/auth-context";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginModal } from "@/components/login-modal";

interface ChatProps {
  user?: any;
}

export default function Chat(props: ChatProps = {}) {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const conversationId = params.get("id") ? parseInt(params.get("id")!) : null;

  // Get the user from props (passed by ProtectedRoute) and also try useAuth() as fallback
  const { user: propsUser } = props;
  
  // Try to get auth details from context
  let contextUser = null;
  let isAuthLoading = false;
  
  try {
    const auth = useAuth();
    contextUser = auth.user;
    isAuthLoading = auth.isLoading;
  } catch (error) {
    console.warn("Auth context not available:", error);
  }
  
  // Use the user from props if available, otherwise use from context
  const user = propsUser || contextUser;
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
    // Check if user is logged in or in guest mode
    const isGuestMode = localStorage.getItem('guest-mode') === 'true';
    
    if (!user && !isGuestMode) {
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
    // Check if user is logged in or in guest mode
    const isGuestMode = localStorage.getItem('guest-mode') === 'true';
    
    if (!user && !isGuestMode) {
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

      <main className="lg:ml-64 transition-all duration-300 flex flex-col h-screen bg-white dark:bg-black">
        <div
          id="chat-container"
          className="flex-1 overflow-y-auto px-4 py-6 md:px-8 flex justify-center"
        >
          <div className="w-full max-w-3xl mx-auto space-y-6">
            {/* Welcome Screen */}
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center space-y-6 h-full text-center py-8 max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Welcome to Help.ai</h1>
                <p className="text-md text-gray-800 dark:text-gray-200 max-w-lg">
                  Powered by Nous-Hermes-2-Mixtral-8x7B-DPO, I can assist with coding, answer questions, search the web, 
                  and help with many other tasks. How can I help you today?
                </p>

                {/* Example prompts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mt-4">
                  {examplePrompts.map((example, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto p-4 bg-white dark:bg-gray-800 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-700"
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
