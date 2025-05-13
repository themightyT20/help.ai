import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Loader2, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateImage } from "@/lib/api";

interface ImageGenerationDialogProps {
  open: boolean;
  onClose: () => void;
  onImageGenerated: (imageUrl: string, prompt: string) => void;
  conversationId?: number;
}

export function ImageGenerationDialog({ 
  open, 
  onClose, 
  onImageGenerated,
  conversationId 
}: ImageGenerationDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [size, setSize] = useState<[number, number]>([1024, 1024]);
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
        width,
        height,
        samples: 1,
        ...(conversationId ? { conversationId } : {})
      });

      if (result.images && result.images.length > 0) {
        setGeneratedImages(result.images);
        // Pass the first generated image back to the parent component
        if (result.images[0].imageUrl) {
          onImageGenerated(result.images[0].imageUrl, prompt);
        }
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

  const handleClose = () => {
    // Reset state when dialog is closed
    setPrompt("");
    setNegativePrompt("");
    setSize([512, 512]);
    setGeneratedImages([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Image</DialogTitle>
          <DialogDescription>
            Create an image using AI. Enter a detailed prompt for best results.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Input
              id="prompt"
              placeholder="A beautiful landscape with mountains and a lake..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="negative-prompt">Negative Prompt (Optional)</Label>
            <Input
              id="negative-prompt"
              placeholder="Blurry, distorted, low quality..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <div className="grid gap-2">
            <Label>Image Size: {size[0]}x{size[1]}</Label>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSize([1024, 1024])}
                disabled={isGenerating || (size[0] === 1024 && size[1] === 1024)}
              >
                1024×1024
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSize([1152, 896])}
                disabled={isGenerating || (size[0] === 1152 && size[1] === 896)}
              >
                1152×896
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSize([896, 1152])}
                disabled={isGenerating || (size[0] === 896 && size[1] === 1152)}
              >
                896×1152
              </Button>
            </div>
          </div>

          {generatedImages.length > 0 && (
            <div className="grid gap-2 mt-4">
              <Label>Generated Image</Label>
              <div className="grid grid-cols-1 gap-2">
                {generatedImages.map((img, i) => (
                  <div key={i} className="border rounded-md overflow-hidden">
                    <img 
                      src={img.imageUrl} 
                      alt={`Generated image for: ${prompt}`} 
                      className="w-full h-auto"
                    />
                    <div className="p-2 text-xs bg-muted">
                      Seed: {img.seed}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ImageIcon className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}