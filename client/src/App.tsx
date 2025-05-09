import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Chat from "@/pages/chat";
import Login from "@/pages/auth/login";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth";

function App() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render anything on the server side
  if (!isMounted) {
    return null;
  }

  return (
    <AuthProvider>
      <TooltipProvider>
        <Router />
      </TooltipProvider>
    </AuthProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Chat} />
      <Route path="/login" component={Login} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
