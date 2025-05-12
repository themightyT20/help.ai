import { useState } from "react";
import { Clipboard, Download, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateCodeDownload } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-php";
import "prismjs/components/prism-ruby";
import "prismjs/themes/prism-tomorrow.css";

interface CodeBlockProps {
  code: string;
  language: string;
  className?: string;
}

export function CodeBlock({ code, language, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  // Map language aliases to Prism's language names
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    py: "python",
    rb: "ruby",
    cs: "csharp",
    sh: "bash",
    shell: "bash",
    yml: "yaml",
    md: "markdown",
  };

  const prismLanguage = languageMap[language] || language || "plaintext";

  // Highlight the code using Prism, with safeguards
  let highlightedCode = '';
  try {
    // Make sure we have a valid language and it's loaded
    const language = Prism.languages[prismLanguage] || Prism.languages.plaintext;
    highlightedCode = Prism.highlight(
      code || '',  // Ensure code is never undefined
      language,
      prismLanguage || 'plaintext'
    );
  } catch (error) {
    console.error('Error highlighting code:', error);
    // Fallback to displaying plain text if highlighting fails
    highlightedCode = code || '';
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
      toast({
        title: "Failed to copy",
        description: "Could not copy the code to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const filename = `code_snippet_${new Date().getTime()}`;
      const result = await generateCodeDownload(code, language || 'plaintext', filename);
      
      // Create a link element and click it to download
      const link = document.createElement("a");
      link.href = result.downloadUrl;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download ready",
        description: `Your code has been downloaded as ${result.filename}`,
      });
    } catch (error) {
      console.error("Failed to download code:", error);
      toast({
        title: "Download failed",
        description: "Could not generate code download",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={`code-block relative mb-4 ${className}`}>
      <div className="flex justify-between items-center bg-gray-800 text-gray-200 py-2 px-4 rounded-t-md">
        <div className="text-sm">{language || "code"}</div>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs rounded h-8 bg-gray-700 text-white hover:bg-gray-600"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <CheckCheck className="h-4 w-4 mr-1" /> Copied
              </>
            ) : (
              <>
                <Clipboard className="h-4 w-4 mr-1" /> Copy
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs rounded h-8 bg-primary text-white hover:bg-opacity-90"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            <Download className="h-4 w-4 mr-1" /> Download
          </Button>
        </div>
      </div>
      <pre className="bg-gray-800 text-gray-200 p-4 rounded-b-md overflow-x-auto font-mono text-sm">
        <code
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
          className={`language-${prismLanguage}`}
        />
      </pre>
    </div>
  );
}
