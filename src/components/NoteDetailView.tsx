/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Note, Group } from "@/src/types";
import { ChevronLeft, Save, Trash2, Calendar, Hash, Sparkles, Eye, Edit3, Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { groupNoteWithAI, translateContent } from "@/src/lib/gemini";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface NoteDetailViewProps {
  note: Note;
  group?: Group;
  existingGroups: Group[];
  onBack: () => void;
  onSave: (id: string, updates: Partial<Note>) => void;
  onDelete?: (id: string) => void;
  language?: "vi" | "en";
}

export function NoteDetailView({ note, group, existingGroups, onBack, onSave, onDelete, language = "vi" }: NoteDetailViewProps) {
  const [title, setTitle] = useState(note.title || "");
  const [content, setContent] = useState(note.content);
  const [selectedGroupId, setSelectedGroupId] = useState(note.groupId);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGroupsExpanded, setIsGroupsExpanded] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const locale = language === "vi" ? vi : enUS;

  const displayedGroups = isGroupsExpanded 
    ? existingGroups 
    : existingGroups.filter(g => g.id === selectedGroupId || existingGroups.indexOf(g) < 2).slice(0, 3);

  const handleSave = () => {
    onSave(note.id, { title, content, groupId: selectedGroupId });
    onBack();
  };

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const targetLang = language === "vi" ? "vi" : "en";
      const translated = await translateContent(content, targetLang);
      setContent(translated);
      
      // Also translate title if it exists
      if (title) {
        const tTitle = await translateContent(title, targetLang);
        setTitle(tTitle);
      }

      toast.success(language === "vi" ? "Đã dịch nội dung" : "Content translated");
    } catch (error) {
      toast.error(language === "vi" ? "Lỗi khi dịch" : "Translation error");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    try {
      const result = await groupNoteWithAI(content, existingGroups);
      if (result.suggestedTitle) {
        setTitle(result.suggestedTitle);
        toast.success(language === "vi" ? "Đã cập nhật tiêu đề mới" : "New title generated");
      }
    } catch (error) {
      toast.error(language === "vi" ? "Không thể tạo tiêu đề" : "Failed to generate title");
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <span className="font-semibold text-gray-700">{language === "vi" ? "Chi tiết ghi chú" : "Note Details"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
            className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 gap-2"
          >
            {mode === "edit" ? (
              <><Eye className="w-4 h-4" /> {language === "vi" ? "Xem" : "Preview"}</>
            ) : (
              <><Edit3 className="w-4 h-4" /> {language === "vi" ? "Sửa" : "Edit"}</>
            )}
          </Button>
          {onDelete && (
            <Button variant="ghost" size="icon" onClick={() => onDelete(note.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="w-5 h-5" />
            </Button>
          )}
          <Button onClick={handleSave} size="sm" className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Save className="w-4 h-4" />
            {language === "vi" ? "Lưu" : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{format(note.timestamp, "PPP p", { locale })}</span>
            </div>
            {group && (
              <div 
                className={cn(
                  "text-[10px] font-bold px-2.5 py-1 rounded-lg overflow-hidden max-w-[180px] truncate inline-block align-middle transition-colors border",
                  group.id !== "ungrouped" ? "border-transparent" : "bg-orange-100 text-orange-600 border-orange-200"
                )}
                style={group.id !== "ungrouped" ? { 
                  backgroundColor: `color-mix(in srgb, ${group.color}, transparent 90%)`, 
                  color: group.color,
                  borderColor: `color-mix(in srgb, ${group.color}, transparent 80%)`
                } : {}}
              >
                {group.id !== "ungrouped" && <Hash className="w-2.5 h-2.5 inline-block mr-1 -mt-0.5" />}
                {group.name}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{language === "vi" ? "Phân loại vào nhóm" : "Assign to Group"}</label>
              {existingGroups.length > 3 && (
                <button 
                  onClick={() => setIsGroupsExpanded(!isGroupsExpanded)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors px-1"
                >
                  {isGroupsExpanded ? (language === "vi" ? "Thu gọn" : "Collapse") : (language === "vi" ? `Xem thêm (${existingGroups.length - displayedGroups.length})` : `Show More (${existingGroups.length - displayedGroups.length})`)}
                  <ChevronLeft className={cn("w-3 h-3 transition-transform duration-300", isGroupsExpanded ? "rotate-90" : "-rotate-90")} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 transition-all duration-300">
              {displayedGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-medium transition-all border shrink-0",
                    selectedGroupId === g.id 
                      ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm" 
                      : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                  )}
                >
                  {g.name}
                </button>
              ))}
              {!isGroupsExpanded && existingGroups.length > displayedGroups.length && (
                <div className="flex items-center px-1">
                  <div className="w-1 h-1 rounded-full bg-gray-200 mr-0.5" />
                  <div className="w-1 h-1 rounded-full bg-gray-200 mr-0.5" />
                  <div className="w-1 h-1 rounded-full bg-gray-200" />
                </div>
              )}
            </div>
          </div>

          <Input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={language === "vi" ? "Tiêu đề ghi chú..." : "Note title..."}
            className="text-xl font-bold border-none px-0 focus-visible:ring-0 placeholder:text-gray-300"
          />

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSummarize}
              disabled={isSummarizing || !content}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-2 px-0"
            >
              <Sparkles className={`w-4 h-4 ${isSummarizing ? "animate-spin" : ""}`} />
              <span className="text-xs">{language === "vi" ? "AI Tóm tắt tiêu đề" : "AI Summarize Title"}</span>
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleTranslate}
              disabled={isTranslating || !content}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-2 px-0"
            >
              {isTranslating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Languages className="w-4 h-4" />
              )}
              <span className="text-xs">{language === "vi" ? "Dịch AI" : "AI Translate"}</span>
            </Button>
          </div>

          {note.aiSummary && (
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
              <div className="flex items-center gap-2 mb-2 text-blue-600">
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">AI Insight</span>
              </div>
              <p className="text-sm text-blue-800 italic leading-relaxed">
                {note.aiSummary}
              </p>
            </div>
          )}

          {mode === "edit" ? (
            <Textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={language === "vi" ? "Nội dung ghi chú..." : "Note content..."}
              className="min-h-[300px] text-base border-none px-0 focus-visible:ring-0 resize-none placeholder:text-gray-300 leading-relaxed"
            />
          ) : (
            <div className="min-h-[300px] text-base prose prose-blue max-w-none prose-p:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ node, ...props }) => (
                    <a 
                      {...props} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                    />
                  )
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
