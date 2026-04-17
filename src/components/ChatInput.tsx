/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, Mic } from "lucide-react";

interface ChatInputProps {
  onSend: (content: string) => void;
  language?: "vi" | "en";
}

export function ChatInput({ onSend, language = "vi" }: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText("");
    }
  };

  return (
    <div className="flex items-center gap-2 z-10">
      <Button variant="ghost" size="icon" className="text-gray-400 hidden sm:flex">
        <Paperclip className="w-5 h-5" />
      </Button>
      <div className="relative flex-1">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={language === "vi" ? "Lượm gì đó..." : "Collect something..."}
          className="pr-10 bg-gray-50 border-none focus-visible:ring-1 focus-visible:ring-blue-400"
        />
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400"
        >
          <Mic className="w-4 h-4" />
        </Button>
      </div>
      <Button 
        onClick={handleSend} 
        disabled={!text.trim()}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 p-0"
      >
        <Send className="w-5 h-5" />
      </Button>
    </div>
  );
}
