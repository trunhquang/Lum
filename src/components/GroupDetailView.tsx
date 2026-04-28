/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note, Group, Topic } from "@/src/types";
import { ChevronLeft, Tags } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { NoteCard } from "./NoteCard";
import { Badge } from "@/components/ui/badge";

interface GroupDetailViewProps {
  group: Group;
  topics: Topic[];
  notes: Note[];
  onBack: () => void;
  onNoteClick: (note: Note) => void;
  onUpdateNote?: (id: string, updates: Partial<Note>) => void;
  onToggleBookmark?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onUpdateGroup?: (id: string, updates: Partial<Group>) => void;
  onDeleteGroup?: (id: string) => void;
  onStopProcessing?: (id: string) => void;
  onReclassify?: (note: Note) => void;
  language?: "vi" | "en";
}

export function GroupDetailView({ 
  group, 
  topics,
  notes, 
  onBack, 
  onNoteClick, 
  onUpdateNote, 
  onToggleBookmark, 
  onTogglePin,
  onUpdateGroup,
  onDeleteGroup,
  onStopProcessing,
  onReclassify,
  language = "vi" 
}: GroupDetailViewProps) {
  const groupNotes = notes.filter(n => n.groupId === group.id).sort((a, b) => {
    // Sort by pinned first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    // Then by timestamp desc
    return b.timestamp - a.timestamp;
  });

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden min-h-0">
      <div className="p-4 border-b flex items-center justify-between bg-white/80 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg truncate" style={{ color: group.color }}>{group.name}</h2>
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold">
                {groupNotes.length}
              </span>
            </div>
            {group.topicId && topics.find(t => t.id === group.topicId) && (
              <div className="flex items-center gap-1 text-[10px] text-blue-500 font-bold uppercase tracking-wider">
                <Tags className="w-3 h-3" />
                <span>{topics.find(t => t.id === group.topicId)?.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {group.id !== "ungrouped" && (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-500 hover:text-blue-600 h-8 px-2"
                onClick={() => {
                  const newName = prompt("Nhập tên mới cho nhóm:", group.name);
                  if (newName && newName !== group.name) {
                    onUpdateGroup?.(group.id, { name: newName });
                  }
                }}
              >
                Đổi tên
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-red-500 hover:text-red-600 h-8 px-2"
                onClick={() => {
                  if (confirm("Bạn có chắc chắn muốn xóa nhóm này? Các ghi chú sẽ được chuyển vào mục 'Chưa phân loại'.")) {
                    onDeleteGroup?.(group.id);
                  }
                }}
              >
                Xóa nhóm
              </Button>
            </>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
          {groupNotes.map((note) => (
            <NoteCard 
              key={note.id}
              note={note}
              group={group}
              language={language}
              onNoteClick={onNoteClick}
              onUpdateNote={onUpdateNote}
              onToggleBookmark={onToggleBookmark}
              onTogglePin={onTogglePin}
              onStopProcessing={onStopProcessing}
              onReclassify={onReclassify}
            />
          ))}
          {groupNotes.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400">
              <p className="text-sm font-medium">{language === "vi" ? "Chưa có ghi chú nào trong nhóm này." : "No notes in this group yet."}</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
