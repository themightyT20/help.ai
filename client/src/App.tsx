import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Chat from "@/pages/chat";
import Login from "@/pages/auth/login";
import ImageGenerator from "@/pages/image-generator";
import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/lib/auth-context";
import { ProtectedRoute } from "@/lib/protected-route";

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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        {() => <Chat />}
      </Route>
      <Route path="/login">
        {() => <Login />}
      </Route>
      <Route path="/register">
        {() => <Login />}
      </Route>  {/* Reuse Login component for register too */}
      <Route path="/image-generator">
        {() => <ImageGenerator />}
      </Route>
      <Route>
        {() => <NotFound />}
      </Route>
    </Switch>
  );
}

export default App;
