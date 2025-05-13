import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, ImageIcon, Download, Copy, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateImage } from "@/lib/api";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export function ImageGenerationWindow() {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [size, setSize] = useState<[number, number]>([1024, 1024]);
  const [stylePreset, setStylePreset] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Array<{ imageUrl: string, seed: number }>>([]);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a prompt to generate an image",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      const [width, height] = size;
      
      const result = await generateImage({
        prompt,
        negativePrompt,
        stylePreset,
        width,
        height,
        samples: 1
      });

      if (result.images && result.images.length > 0) {
        setGeneratedImages(result.images);
        toast({
          title: "Image generated",
          description: "Your image has been successfully generated",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to generate image",
        description: error.message || "An error occurred while generating the image",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Image downloaded",
      description: "The image has been saved to your device",
    });
  };

  const copyImageUrl = (imageUrl: string) => {
    navigator.clipboard.writeText(imageUrl)
      .then(() => {
        toast({
          title: "Image URL copied",
          description: "The image URL has been copied to your clipboard",
        });
      })
      .catch(() => {
        toast({
          title: "Failed to copy",
          description: "Could not copy the image URL to clipboard",
          variant: "destructive",
        });
      });
  };

  const clearImages = () => {
    setGeneratedImages([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Stability AI Image Generator</CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full" 
              onClick={() => window.history.back()}
            >
              <XCircle className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 overflow-y-auto flex-1">
          <Tabs defaultValue="generate">
            <TabsList className="mb-4">
              <TabsTrigger value="generate">Generate</TabsTrigger>
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
            </TabsList>
            
            <TabsContent value="generate" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="prompt" className="text-base font-medium">Prompt</Label>
                  <Input
                    id="prompt"
                    placeholder="A beautiful landscape with mountains and a lake..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isGenerating}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Be specific with details like style, lighting, and composition for better results.
                  </p>
                </div>

                <div>
                  <Label htmlFor="negative-prompt" className="text-base font-medium">Negative Prompt</Label>
                  <Input
                    id="negative-prompt"
                    placeholder="Blurry, distorted, low quality..."
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    disabled={isGenerating}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Specify what you don't want to see in the generated image.
                  </p>
                </div>

                <div>
                  <Label className="text-base font-medium">Image Size: {size[0]}×{size[1]}</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSize([1024, 1024])}
                      disabled={isGenerating || (size[0] === 1024 && size[1] === 1024)}
                      className={size[0] === 1024 && size[1] === 1024 ? "bg-accent" : ""}
                    >
                      1024×1024
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSize([1152, 896])}
                      disabled={isGenerating || (size[0] === 1152 && size[1] === 896)}
                      className={size[0] === 1152 && size[1] === 896 ? "bg-accent" : ""}
                    >
                      1152×896
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSize([896, 1152])}
                      disabled={isGenerating || (size[0] === 896 && size[1] === 1152)}
                      className={size[0] === 896 && size[1] === 1152 ? "bg-accent" : ""}
                    >
                      896×1152
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">Style Preset</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setStylePreset("photographic")}
                      disabled={isGenerating}
                      className={stylePreset === "photographic" ? "bg-accent" : ""}
                    >
                      Photographic
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setStylePreset("digital-art")}
                      disabled={isGenerating}
                      className={stylePreset === "digital-art" ? "bg-accent" : ""}
                    >
                      Digital Art
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setStylePreset("cinematic")}
                      disabled={isGenerating}
                      className={stylePreset === "cinematic" ? "bg-accent" : ""}
                    >
                      Cinematic
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setStylePreset("anime")}
                      disabled={isGenerating}
                      className={stylePreset === "anime" ? "bg-accent" : ""}
                    >
                      Anime
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setStylePreset("painting")}
                      disabled={isGenerating}
                      className={stylePreset === "painting" ? "bg-accent" : ""}
                    >
                      Painting
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setStylePreset(undefined)}
                      disabled={isGenerating}
                      className={stylePreset === undefined ? "bg-accent" : ""}
                    >
                      None
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Generate Image
                    </>
                  )}
                </Button>
              </div>

              {generatedImages.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Generated Image</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearImages}
                    >
                      Clear
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {generatedImages.map((img, i) => (
                      <div key={i} className="border rounded-md overflow-hidden bg-muted/30">
                        <div className="relative aspect-square overflow-hidden">
                          <img 
                            src={img.imageUrl} 
                            alt={`Generated image for: ${prompt}`} 
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="p-3 flex justify-between items-center">
                          <div className="text-sm">
                            Seed: {img.seed}
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => copyImageUrl(img.imageUrl)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => downloadImage(img.imageUrl)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="gallery">
              {generatedImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {generatedImages.map((img, i) => (
                    <div key={i} className="border rounded-md overflow-hidden">
                      <img 
                        src={img.imageUrl} 
                        alt={`Generated image ${i+1}`} 
                        className="w-full h-auto"
                      />
                      <div className="p-3 bg-muted/30">
                        <div className="flex justify-between items-center">
                          <div className="text-sm">
                            Seed: {img.seed}
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => copyImageUrl(img.imageUrl)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => downloadImage(img.imageUrl)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No images yet</h3>
                  <p className="text-muted-foreground">
                    Generated images will appear here
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="border-t bg-muted/30 p-3 justify-between">
          <p className="text-xs text-muted-foreground">
            Powered by Stability AI
          </p>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => window.history.back()}
          >
            Close
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}