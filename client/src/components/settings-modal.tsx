import { useState, useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { settingsSchema } from "@shared/schema";
import { loadSettings, saveSettings, saveApiKeys, getApiKeysStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { queryClient } from "@/lib/queryClient";

interface SettingsModalProps {
  onClose: () => void;
}

const apiKeysSchema = z.object({
  togetherApiKey: z.string().optional(),
  stabilityApiKey: z.string().optional(),
  seperDevApiKey: z.string().optional(),
});

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const [showTogetherApiKey, setShowTogetherApiKey] = useState(false);
  const [showStabilityApiKey, setShowStabilityApiKey] = useState(false);
  const [showSeperDevApiKey, setShowSeperDevApiKey] = useState(false);
  const [hasTogetherApiKey, setHasTogetherApiKey] = useState(false);
  const [hasStabilityApiKey, setHasStabilityApiKey] = useState(false);
  const [hasSeperDevApiKey, setHasSeperDevApiKey] = useState(false);

  // Load settings from local storage
  const userSettings = loadSettings();

  // Settings form
  const settingsForm = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: userSettings,
  });

  // API keys form
  const apiKeysForm = useForm<z.infer<typeof apiKeysSchema>>({
    resolver: zodResolver(apiKeysSchema),
    defaultValues: {
      togetherApiKey: "",
      stabilityApiKey: "",
      seperDevApiKey: "",
    },
  });

  // Fetch API key status when logged in
  useEffect(() => {
    if (user) {
      getApiKeysStatus()
        .then((data) => {
          setHasTogetherApiKey(data.hasTogetherApiKey);
          setHasStabilityApiKey(data.hasStabilityApiKey);
          setHasSeperDevApiKey(data.hasSeperDevApiKey);
        })
        .catch((error) => {
          console.error("Failed to get API key status:", error);
        });
    }
  }, [user]);

  const onSettingsSubmit = (values: z.infer<typeof settingsSchema>) => {
    try {
      saveSettings(values);
      toast({
        title: "Settings saved",
        description: "Your settings have been updated",
      });
    } catch (error) {
      toast({
        title: "Failed to save settings",
        description: "There was an error saving your settings",
        variant: "destructive",
      });
    }
  };

  const onApiKeysSubmit = async (values: z.infer<typeof apiKeysSchema>) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "You need to be logged in to save API keys",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await saveApiKeys(
        values.togetherApiKey || undefined,
        values.stabilityApiKey || undefined,
        values.seperDevApiKey || undefined
      );
      
      setHasTogetherApiKey(result.hasTogetherApiKey);
      setHasStabilityApiKey(result.hasStabilityApiKey);
      setHasSeperDevApiKey(result.hasSeperDevApiKey);
      
      apiKeysForm.reset({
        togetherApiKey: "",
        stabilityApiKey: "",
        seperDevApiKey: "",
      });
      
      toast({
        title: "API keys saved",
        description: "Your API keys have been securely saved",
      });
    } catch (error) {
      toast({
        title: "Failed to save API keys",
        description: "There was an error saving your API keys",
        variant: "destructive",
      });
    }
  };

  const clearConversationHistory = () => {
    if (confirm("Are you sure you want to clear all your conversation history?")) {
      try {
        localStorage.removeItem("help-ai-conversations");
        queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
        
        toast({
          title: "History cleared",
          description: "Your conversation history has been cleared",
        });
      } catch (error) {
        toast({
          title: "Failed to clear history",
          description: "There was an error clearing your conversation history",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <Tabs
          defaultValue="general"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="api">API Keys</TabsTrigger>
            <TabsTrigger value="model">AI Model</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <Form {...settingsForm}>
              <form
                onSubmit={settingsForm.handleSubmit(onSettingsSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={settingsForm.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Theme</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select theme" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the application theme
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={settingsForm.control}
                  name="saveConversations"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Save Conversations
                        </FormLabel>
                        <FormDescription>
                          Store your chat history for future reference
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={clearConversationHistory}
                  >
                    Clear History
                  </Button>
                  <Button type="submit">Save Settings</Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api" className="space-y-6">
            {!user ? (
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  You need to be logged in to save API keys
                </p>
              </div>
            ) : (
              <Form {...apiKeysForm}>
                <form
                  onSubmit={apiKeysForm.handleSubmit(onApiKeysSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={apiKeysForm.control}
                    name="togetherApiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Together AI API Key</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              placeholder={
                                hasTogetherApiKey
                                  ? "API key already saved"
                                  : "Enter your Together AI API key"
                              }
                              type={showTogetherApiKey ? "text" : "password"}
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            onClick={() =>
                              setShowTogetherApiKey(!showTogetherApiKey)
                            }
                          >
                            {showTogetherApiKey ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <FormDescription>
                          Required for AI model functionality
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={apiKeysForm.control}
                    name="stabilityApiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stability AI API Key</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              placeholder={
                                hasStabilityApiKey
                                  ? "API key already saved"
                                  : "Enter your Stability AI API key"
                              }
                              type={showStabilityApiKey ? "text" : "password"}
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            onClick={() =>
                              setShowStabilityApiKey(!showStabilityApiKey)
                            }
                          >
                            {showStabilityApiKey ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <FormDescription>
                          Required for image generation functionality
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={apiKeysForm.control}
                    name="seperDevApiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seper.dev API Key</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              placeholder={
                                hasSeperDevApiKey
                                  ? "API key already saved"
                                  : "Enter your Seper.dev API key"
                              }
                              type={showSeperDevApiKey ? "text" : "password"}
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            onClick={() =>
                              setShowSeperDevApiKey(!showSeperDevApiKey)
                            }
                          >
                            {showSeperDevApiKey ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <FormDescription>
                          Required for web search functionality
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full">
                    Save API Keys
                  </Button>
                </form>
              </Form>
            )}
          </TabsContent>

          {/* Model Settings Tab */}
          <TabsContent value="model" className="space-y-6">
            <Form {...settingsForm}>
              <form
                onSubmit={settingsForm.handleSubmit(onSettingsSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={settingsForm.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature: {field.value}</FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={1}
                          step={0.1}
                          value={[field.value]}
                          onValueChange={(values) => field.onChange(values[0])}
                        />
                      </FormControl>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>More deterministic (0)</span>
                        <span>More creative (1)</span>
                      </div>
                      <FormDescription>
                        Adjust the randomness of the AI responses
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={settingsForm.control}
                  name="maxTokens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Output Length</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select length" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="256">Short (256 tokens)</SelectItem>
                          <SelectItem value="512">Medium (512 tokens)</SelectItem>
                          <SelectItem value="1024">Standard (1024 tokens)</SelectItem>
                          <SelectItem value="2048">Long (2048 tokens)</SelectItem>
                          <SelectItem value="4096">Maximum (4096 tokens)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Limit the length of AI-generated responses
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  Save Model Settings
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
