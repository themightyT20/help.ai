import { useState } from "react";
import { FaGoogle, FaDiscord } from "react-icons/fa";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

interface LoginModalProps {
  onClose: () => void;
}

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const registerSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export function LoginModal({ onClose }: LoginModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const { toast } = useToast();
  
  // Initialize with dummy functions that show the auth error
  let login = async (_email: string, _password: string) => {
    toast({
      title: "Authentication error",
      description: "Auth provider not available",
      variant: "destructive",
    });
    return {} as any;
  };
  
  let register = async (_username: string, _email: string, _password: string) => {
    toast({
      title: "Authentication error",
      description: "Auth provider not available",
      variant: "destructive",
    });
    return {} as any;
  };
  
  // Try to get auth functions if context is available
  try {
    const auth = useAuth();
    login = auth.login;
    register = auth.register;
  } catch (error) {
    console.warn("Auth context not available in login modal:", error);
  }

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onLoginSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      await login(values.email, values.password);
      toast({
        title: "Login successful",
        description: "You have been logged in",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const onRegisterSubmit = async (values: z.infer<typeof registerSchema>) => {
    try {
      await register(values.username, values.email, values.password);
      toast({
        title: "Registration successful",
        description: "Your account has been created and you are now logged in",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleOAuthLogin = (provider: string) => {
    window.location.href = `/api/auth/${provider}`;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "login" ? "Sign in to Help.ai" : "Sign up for Help.ai"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* OAuth Buttons */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                toast({
                  title: "Google authentication not configured",
                  description: "Please use email/password login or register a new account",
                  variant: "destructive"
                });
              }}
              disabled
            >
              <FaGoogle className="mr-2 h-4 w-4 text-red-500" />
              Continue with Google
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                toast({
                  title: "Discord authentication not configured",
                  description: "Please use email/password login or register a new account",
                  variant: "destructive"
                });
              }}
              disabled
            >
              <FaDiscord className="mr-2 h-4 w-4 text-indigo-500" />
              Continue with Discord
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-2">Or</span>
            </div>
          </div>

          {/* Login Form */}
          {mode === "login" ? (
            <Form {...loginForm}>
              <form
                onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@example.com"
                          type="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  Sign in
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...registerForm}>
              <form
                onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={registerForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@example.com"
                          type="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  Create Account
                </Button>
              </form>
            </Form>
          )}

          <div className="text-center text-sm">
            {mode === "login" ? (
              <div>
                Don't have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => setMode("register")}
                >
                  Sign up
                </Button>
              </div>
            ) : (
              <div>
                Already have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => setMode("login")}
                >
                  Sign in
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
