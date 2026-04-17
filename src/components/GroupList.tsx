/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Group, Note } from "@/src/types";
import { Card } from "@/components/ui/card";
import { ChevronRight, Clock, Hash, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";

interface GroupListProps {
  groups: Group[];
  notes: Note[];
  noteCounts: Record<string, number>;
  onGroupClick: (group: Group) => void;
  language?: "vi" | "en";
}

export function GroupList({ groups, notes, noteCounts, onGroupClick, language = "vi" }: GroupListProps) {
  const locale = language === "vi" ? vi : enUS;

  const exportGroupAsMarkdown = (group: Group, e: React.MouseEvent) => {
    e.stopPropagation();
    const groupNotes = notes.filter(n => n.groupId === group.id);
    const markdown = `# ${group.name}\n\n${groupNotes.map(n => `## ${new Date(n.timestamp).toLocaleString()}\n${n.content}\n${n.source ? `\nSource: ${n.source}` : ''}`).join('\n\n---\n\n')}`;
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${group.name.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
      {groups.map((group) => (
        <Card 
          key={group.id} 
          onClick={() => onGroupClick(group)}
          className="p-5 flex flex-col cursor-pointer hover:shadow-lg hover:shadow-blue-900/5 transition-all duration-300 border-none shadow-sm bg-white group/item relative overflow-hidden"
        >
          {/* Decorative background element */}
          <div 
            className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-[0.03] group-hover/item:scale-150 transition-transform duration-500"
            style={{ backgroundColor: group.color }}
          />

          <div className="flex justify-between items-start mb-4 relative z-10">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
              style={{ backgroundColor: group.color, boxShadow: `0 8px 16px -4px ${group.color}40` }}
            >
              {group.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="opacity-0 group-hover/item:opacity-100 transition-all h-8 w-8 hover:bg-blue-50"
                onClick={(e) => exportGroupAsMarkdown(group, e)}
              >
                <Download className="w-4 h-4 text-blue-500" />
              </Button>
              <div className="p-1.5 bg-gray-50 rounded-lg text-gray-300 group-hover/item:text-blue-400 group-hover/item:bg-blue-50 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 relative z-10">
            <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover/item:text-blue-600 transition-colors line-clamp-2 leading-tight min-h-[3.5rem] flex items-center">
              {group.name}
            </h3>
            {group.description && (
              <p className="text-xs text-gray-500 line-clamp-3 mb-4 leading-relaxed min-h-[3rem]">
                {group.description}
              </p>
            )}
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md text-gray-500">
                  <Hash className="w-3 h-3" />
                  <span className="text-[10px] font-bold">{noteCounts[group.id] || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatDistanceToNow(group.updatedAt, { addSuffix: true, locale })}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
