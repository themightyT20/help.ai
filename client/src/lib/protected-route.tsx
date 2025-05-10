import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';
import { Route } from 'wouter';

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {(params) => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        // Pass the user state to the component
        return <Component user={user} />;
      }}
    </Route>
  );
}