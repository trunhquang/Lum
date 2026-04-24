/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note, Group } from "@/src/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { ExternalLink, Bookmark, Pin, Languages, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { translateNoteContent } from "@/src/lib/gemini";
import { toast } from "sonner";
import { useState } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface NoteCardProps {
  note: Note;
  group?: Group;
  language?: "vi" | "en";
  onToggleBookmark?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onNoteClick?: (note: Note) => void;
  onUpdateNote?: (id: string, updates: Partial<Note>) => void;
  onStopProcessing?: (id: string) => void;
  onReclassify?: (note: Note) => void;
  key?: string;
}

export function NoteCard({ 
  note, 
  group, 
  language = "vi", 
  onToggleBookmark, 
  onTogglePin,
  onNoteClick, 
  onUpdateNote,
  onStopProcessing,
  onReclassify
}: NoteCardProps) {
  const locale = language === "vi" ? vi : enUS;
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const handleTranslate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (note.translatedContent && note.translationLang === (language === "vi" ? "vi" : "en")) {
      setShowTranslation(!showTranslation);
      return;
    }

    setIsTranslating(true);
    try {
      const targetLang = language === "vi" ? "vi" : "en";
      const result = await translateNoteContent(
        note.content,
        note.title || "",
        note.aiSummary || "",
        targetLang
      );

      onUpdateNote?.(note.id, {
        translatedContent: result.translatedContent,
        translatedTitle: result.translatedTitle || undefined,
        translatedSummary: result.translatedSummary || undefined,
        translationLang: targetLang
      });
      setShowTranslation(true);
      toast.success(language === "vi" ? "Đã dịch nội dung" : "Content translated");
    } catch (error) {
      toast.error(language === "vi" ? "Lỗi khi dịch" : "Translation error");
    } finally {
      setIsTranslating(false);
    }
  };

  const displayTitle = showTranslation ? note.translatedTitle || note.title : note.title;
  const displaySummary = showTranslation ? note.translatedSummary || note.aiSummary : note.aiSummary;
  const displayContent = showTranslation ? note.translatedContent || note.content : note.content;

  if (note.isProcessing) {
    return (
      <Card className="p-4 mb-3 border-none shadow-sm bg-blue-50/30 backdrop-blur-sm border border-blue-100/50 animate-pulse">
        <div className="flex justify-between items-start mb-4">
          <Badge variant="secondary" className="bg-blue-100 text-blue-600 border-none">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            {language === "vi" ? "Đang xử lý..." : "Processing..."}
          </Badge>
          <span className="text-[10px] text-gray-400">
            {formatDistanceToNow(note.timestamp, { addSuffix: true, locale })}
          </span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-600">
              <Sparkles className="w-4 h-4 animate-bounce" />
              <span className="text-xs font-bold">{note.processingStatus || (language === "vi" ? "Đang phân tích..." : "Analyzing...")}</span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onStopProcessing?.(note.id);
              }}
              className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-full hover:bg-red-100 transition-colors"
            >
              {language === "vi" ? "Dừng" : "Stop"}
            </button>
          </div>
          <div className="h-4 bg-gray-100 rounded w-3/4" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className="p-4 mb-3 border-none shadow-sm bg-white/80 backdrop-blur-sm hover:shadow-md transition-shadow group/card cursor-pointer"
      onClick={() => onNoteClick?.(note)}
    >
      <div className="flex justify-between items-start gap-3 mb-2">
        <div className="flex flex-1 gap-2 items-center min-w-0">
          <div 
            className={cn(
              "text-[10px] font-bold px-2.5 py-1 rounded-lg overflow-hidden max-w-[140px] xs:max-w-[180px] sm:max-w-[220px] truncate inline-block align-middle transition-colors border",
              group && group.id !== "ungrouped" ? "border-transparent" : "bg-orange-100 text-orange-600 border-orange-200"
            )}
            style={group && group.id !== "ungrouped" ? { 
              backgroundColor: `color-mix(in srgb, ${group.color}, transparent 88%)`, 
              color: group.color,
              borderColor: `color-mix(in srgb, ${group.color}, transparent 80%)`
            } : {}}
          >
            {group ? group.name : (language === "vi" ? "Chưa phân loại" : "Ungrouped")}
          </div>
          {note.groupId === "ungrouped" && !note.isProcessing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReclassify?.(note);
              }}
              className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 shrink-0"
            >
              <Sparkles className="w-3 h-3" />
              {language === "vi" ? "Phân loại lại" : "Reclassify"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin?.(note.id);
              }}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title={language === "vi" ? "Ghim" : "Pin"}
            >
              <Pin className={cn("w-4 h-4 transition-all", note.isPinned ? "fill-blue-500 text-blue-500 rotate-45 scale-110" : "text-gray-300")} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark?.(note.id);
              }}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title={language === "vi" ? "Đánh dấu" : "Bookmark"}
            >
              <Bookmark className={cn("w-4 h-4", note.isBookmarked ? "fill-yellow-400 text-yellow-400" : "text-gray-300")} />
            </button>
            <button 
              onClick={handleTranslate}
              disabled={isTranslating}
              className={cn(
                "p-1 hover:bg-gray-100 rounded-full transition-colors",
                showTranslation ? "text-blue-600 bg-blue-50" : "text-gray-300"
              )}
              title={language === "vi" ? "Dịch nội dung" : "Translate content"}
            >
              {isTranslating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Languages className="w-4 h-4" />
              )}
            </button>
          </div>
          <span className="text-[10px] text-gray-400">
            {formatDistanceToNow(note.timestamp, { addSuffix: true, locale })}
          </span>
        </div>
      </div>
      
      {displayTitle && (
        <h3 className="font-bold text-sm text-gray-900 mb-1 line-clamp-2 break-words">{displayTitle}</h3>
      )}

      {displaySummary && (
        <div className="text-[11px] text-blue-600/80 font-medium mb-3 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100/50 italic break-words leading-relaxed">
          {displaySummary}
        </div>
      )}
      
      <div className="text-sm text-gray-800 prose prose-sm max-w-none line-clamp-4 prose-p:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline break-words overflow-hidden">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ node, ...props }) => (
              <a 
                {...props} 
                onClick={(e) => e.stopPropagation()} 
                target="_blank" 
                rel="noopener noreferrer" 
              />
            )
          }}
        >
          {displayContent}
        </ReactMarkdown>
      </div>

      {note.source && (
        <div className="mt-3 flex items-center gap-1 text-[10px] text-blue-500 hover:underline cursor-pointer">
          <ExternalLink className="w-3 h-3" />
          <span className="truncate max-w-[200px]">{note.source}</span>
        </div>
      )}
    </Card>
  );
}
