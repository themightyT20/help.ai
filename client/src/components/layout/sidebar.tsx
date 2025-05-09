import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, Settings, HelpCircle, Menu, Moon, Sun } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth2";
import { useTheme } from "next-themes";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { LoginModal } from "@/components/login-modal";
import { SettingsModal } from "@/components/settings-modal";
import { useQuery } from "@tanstack/react-query";
import { getConversations } from "@/lib/api";

interface SidebarProps {
  onNewChat: () => void;
  currentConversationId?: number;
}

export function Sidebar({ onNewChat, currentConversationId }: SidebarProps) {
  const [location, navigate] = useLocation();
  // Try to get auth details, if auth context is available
  let user = null;
  let logout = async () => {}; // Default no-op logout function
  
  try {
    const auth = useAuth();
    user = auth.user;
    logout = auth.logout;
  } catch (error) {
    console.warn("Auth context not available in sidebar:", error);
  }
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Fetch the user's conversations
  const { data: conversationsData, isLoading: isLoadingConversations } = useQuery({
    queryKey: ['/api/conversations'],
    enabled: !!user,
  });
  
  // Ensure conversations is treated as an array
  const conversations = Array.isArray(conversationsData) ? conversationsData : [];

  // Close sidebar on location change on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-background shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] border-r border-gray-200 dark:border-gray-700 transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 transition-transform duration-300 ease-in-out z-40 flex flex-col`}
      >
        {/* Logo and title */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
            <Bot className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold">Help.ai</h1>
        </div>

        {/* New chat button */}
        <div className="p-4">
          <Button
            className="w-full"
            onClick={() => {
              onNewChat();
              // On mobile, close the sidebar after starting a new chat
              if (window.innerWidth < 1024) {
                setIsOpen(false);
              }
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Recent conversations */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Recent Conversations
            </h2>
            {isLoadingConversations ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Loading...
              </div>
            ) : conversations && conversations.length > 0 ? (
              <ul className="space-y-2">
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start p-2 text-left ${
                        currentConversationId === conversation.id
                          ? "bg-gray-200 dark:bg-gray-700"
                          : ""
                      }`}
                      onClick={() => {
                        navigate(`/?id=${conversation.id}`);
                        if (window.innerWidth < 1024) {
                          setIsOpen(false);
                        }
                      }}
                    >
                      <div className="truncate">{conversation.title}</div>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No conversations yet
              </div>
            )}
          </div>
        </div>

        {/* User account and settings */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {user ? (
            <div className="flex items-center space-x-2 p-2 rounded-md">
              <Avatar>
                <AvatarImage src={user.profilePicture || ""} />
                <AvatarFallback>
                  {user.username?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {user.username}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Button
              className="w-full mb-4"
              variant="outline"
              onClick={() => setShowLoginModal(true)}
            >
              Login
            </Button>
          )}

          <Separator className="my-2" />

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettingsModal(true)}
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Modals */}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </>
  );
}

// Import Bot icon as it wasn't imported above
import { Bot } from "lucide-react";
