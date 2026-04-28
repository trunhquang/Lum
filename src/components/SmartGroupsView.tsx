/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Group, Note, Topic } from "../types";
import { GroupList } from "./GroupList";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Layers, 
  Plus, 
  MoreVertical, 
  FolderEdit, 
  Trash2, 
  LayoutGrid,
  Settings2,
  Tags,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface SmartGroupsViewProps {
  groups: Group[];
  topics: Topic[];
  notes: Note[];
  noteCounts: Record<string, number>;
  onGroupClick: (group: Group) => void;
  onCreateTopic: (name: string, description?: string) => void;
  onUpdateTopic: (id: string, updates: Partial<Topic>) => void;
  onRenameTopic: (topic: Topic) => void;
  onDeleteTopic: (id: string) => void;
  onAssignGroupToTopic: (groupId: string, topicId: string | null) => void;
  onAIGrowTopics: () => void;
  language?: "vi" | "en";
}

export function SmartGroupsView({ 
  groups, 
  topics, 
  notes, 
  noteCounts, 
  onGroupClick,
  onCreateTopic,
  onUpdateTopic,
  onRenameTopic,
  onDeleteTopic,
  onAssignGroupToTopic,
  onAIGrowTopics,
  language = "vi"
}: SmartGroupsViewProps) {
  const [activeMode, setActiveMode] = useState<"flat" | "topics">("flat");
  const [collapsedTopics, setCollapsedTopics] = useState<Set<string>>(new Set(topics.map(t => t.id)));

  // Sync collapsed state when topics change: new topics should be collapsed by default
  useEffect(() => {
    setCollapsedTopics(prev => {
      const next = new Set(prev);
      let changed = false;
      topics.forEach(t => {
        if (!prev.has(t.id) && !Array.from(prev).some(id => topics.find(topic => topic.id === id))) {
          // This is a fresh initialization or we're adding new topics
        }
        // If the topic is new and not in the set, add it to collapsed (default)
        if (!prev.has(t.id)) {
          // We only want to auto-collapse if it's truly "new" to this session's state
          // However, simple logic: if it's not in public state, it's collapsed.
          // This might re-collapse things if they were deleted and recreated.
        }
      });
      
      // Simpler approach: find IDs in 'topics' that aren't in 'prev' and haven't been explicitly expanded?
      // Actually, since the user wants EVERYTHING collapsed by default, 
      // we can just check for any topics not currently tracked in our selection state.
      
      const currentTopicIds = new Set(topics.map(t => t.id));
      const trackedIds = new Set(prev);
      
      // If we have a new topic ID, add it to collapsed
      topics.forEach(t => {
        if (!trackedIds.has(t.id)) {
          next.add(t.id);
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [topics]);

  const toggleTopic = (id: string) => {
    const next = new Set(collapsedTopics);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setCollapsedTopics(next);
  };

  const collapseAll = () => setCollapsedTopics(new Set(topics.map(t => t.id)));
  const expandAll = () => setCollapsedTopics(new Set());

  const ungroupedGroups = groups.filter(g => !g.topicId || g.topicId === "" || g.id === "ungrouped");

  const allCollapsed = topics.length > 0 && Array.from(collapsedTopics).length === topics.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-gray-50 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white shrink-0">
        <div className="flex items-center overflow-x-auto scrollbar-hide -mx-1 px-1">
          <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as any)} className="w-auto flex-shrink-0">
            <TabsList className="bg-gray-100/50 p-1 rounded-xl h-9">
              <TabsTrigger value="flat" className="rounded-lg text-[10px] uppercase font-bold tracking-wider px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <LayoutGrid className="w-3 h-3 mr-1.5" />
                <span className="whitespace-nowrap">Tất cả nhóm</span>
              </TabsTrigger>
              <TabsTrigger value="topics" className="rounded-lg text-[10px] uppercase font-bold tracking-wider px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Layers className="w-3 h-3 mr-1.5" />
                <span className="whitespace-nowrap">Chủ đề thông minh</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {activeMode === "topics" && topics.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={allCollapsed ? expandAll : collapseAll}
              className="rounded-xl h-8 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-blue-600 px-3 flex-shrink-0"
            >
              {allCollapsed ? (
                <>
                  <Maximize2 className="w-3 h-3 mr-1.5" />
                  <span className="whitespace-nowrap">Mở rộng hết</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-3 h-3 mr-1.5" />
                  <span className="whitespace-nowrap">Thu gọn hết</span>
                </>
              )}
            </Button>
          )}
          {activeMode === "topics" && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const name = prompt(language === "vi" ? "Tên chủ đề mới:" : "New Topic Name:");
                if (name) onCreateTopic(name);
              }}
              className="rounded-xl border-gray-100 text-gray-600 h-8 text-[10px] font-bold uppercase tracking-wider px-3 flex-shrink-0"
            >
              <Plus className="w-3 h-3 mr-1.5" />
              <span className="whitespace-nowrap">{language === "vi" ? "Chủ đề mới" : "New Topic"}</span>
            </Button>
          )}
          <Button 
            onClick={onAIGrowTopics}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 text-[10px] font-bold uppercase tracking-wider gap-2 shadow-sm shadow-blue-200 flex-shrink-0"
          >
            <Sparkles className="w-3 h-3" />
            <span className="whitespace-nowrap">AI Gom nhóm</span>
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {activeMode === "flat" ? (
            <motion.div 
              key="flat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">{language === "vi" ? "Danh sách tất cả các nhóm" : "All Groups List"}</h3>
              </div>
              <GroupList 
                groups={groups} 
                notes={notes} 
                noteCounts={noteCounts} 
                onGroupClick={onGroupClick} 
                language={language}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="topics"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 space-y-8"
            >
              {topics.length === 0 && (
                <div className="py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                    <Layers className="w-10 h-10 text-blue-400" />
                  </div>
                  <div className="space-y-1 max-w-sm mx-auto">
                    <p className="font-bold text-gray-900">{language === "vi" ? "Chủ đề trống" : "No Topics Yet"}</p>
                    <p className="text-xs text-gray-400">{language === "vi" ? "Hãy sử dụng AI để tự động tạo chủ đề hoặc tự tay gom nhóm các thư mục liên quan." : "Use AI to automatically create topics or manually group related folders."}</p>
                  </div>
                </div>
              )}

              {topics.map(topic => {
                const topicGroups = groups.filter(g => g.topicId === topic.id);
                const isCollapsed = collapsedTopics.has(topic.id);
                
                return (
                  <div key={topic.id} className="space-y-4">
                    <div 
                      className="flex items-center justify-between border-b border-gray-50 pb-2 cursor-pointer group"
                      onClick={() => toggleTopic(topic.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border transition-all ${
                          isCollapsed ? 'bg-gray-50 text-gray-400 border-gray-100' : 'bg-blue-50 text-blue-600 border-blue-100/50'
                        }`}>
                          <Tags className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-gray-900 flex items-center gap-2">
                            <span className="group-hover:text-blue-600 transition-colors">{topic.name}</span>
                            <Badge variant="outline" className={`transition-colors text-[10px] px-1.5 h-4 font-bold border-0 ${
                              isCollapsed ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {topicGroups.length} nhóm
                            </Badge>
                            {isCollapsed ? <ChevronRight className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                          </h4>
                          {topic.description && (
                            <p className="text-[10px] text-gray-400 leading-relaxed max-w-xl line-clamp-1">{topic.description}</p>
                          )}
                        </div>
                      </div>
                      
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors focus:outline-none">
                            <MoreVertical className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5 shadow-xl border-gray-100 bg-white">
                            <DropdownMenuItem 
                              className="rounded-lg gap-2 text-xs font-medium py-2 focus:bg-gray-50 focus:outline-none"
                              onSelect={() => onRenameTopic(topic)}
                            >
                              <FolderEdit className="w-3.5 h-3.5 text-gray-400" />
                              Đổi tên chủ đề
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="rounded-lg gap-2 text-xs font-medium py-2 focus:bg-gray-50 focus:outline-none">
                                <Plus className="w-3.5 h-3.5 text-gray-400" />
                                Thêm nhóm vào đây
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="w-56 rounded-xl p-1.5 border-gray-100 bg-white">
                                {ungroupedGroups.filter(g => g.id !== "ungrouped").map(g => (
                                  <DropdownMenuItem 
                                    key={g.id}
                                    className="rounded-lg text-xs py-2 focus:bg-gray-50 focus:outline-none"
                                    onSelect={() => onAssignGroupToTopic(g.id, topic.id)}
                                  >
                                    {g.name}
                                  </DropdownMenuItem>
                                ))}
                                {ungroupedGroups.filter(g => g.id !== "ungrouped").length === 0 && (
                                  <div className="p-4 text-center text-[10px] text-gray-400">Không còn nhóm nào để thêm</div>
                                )}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator className="my-1.5 bg-gray-50" />
                            <DropdownMenuItem 
                              className="rounded-lg gap-2 text-xs font-medium py-2 text-red-600 focus:text-red-600 focus:bg-red-50 focus:outline-none"
                              onSelect={() => onDeleteTopic(topic.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Xóa chủ đề
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          {topicGroups.length > 0 ? (
                            <GroupList 
                              groups={topicGroups} 
                              notes={notes} 
                              noteCounts={noteCounts} 
                              onGroupClick={onGroupClick} 
                              language={language}
                            />
                          ) : (
                            <div className="py-8 border-2 border-dashed border-gray-50 rounded-3xl flex flex-col items-center justify-center text-gray-300">
                              <Plus className="w-6 h-6 mb-2 opacity-20" />
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Kéo nhóm vào đây hoặc dùng menu dấu 3 chấm</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {ungroupedGroups.length > 0 && topics.length > 0 && (
                <div className="space-y-4 pt-10">
                  <div className="flex items-center gap-3 border-b border-gray-50 pb-2">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                      <Settings2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-gray-900">Nhóm tự do</h4>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest">Các nhóm chưa được phân vào chủ đề</p>
                    </div>
                  </div>
                  <GroupList 
                    groups={ungroupedGroups} 
                    notes={notes} 
                    noteCounts={noteCounts} 
                    onGroupClick={onGroupClick} 
                    language={language}
                  />
                  
                  {/* Option to bulk organize via AI */}
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-[2.5rem] border border-blue-100/50 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                        <Sparkles className="w-7 h-7" />
                      </div>
                      <div className="text-center md:text-left">
                        <h5 className="font-extrabold text-blue-900 text-lg leading-tight">Vẫn còn {ungroupedGroups.length} nhóm lẻ loi?</h5>
                        <p className="text-xs text-blue-600/70 mt-1 font-medium italic">Để Lượm AI suy nghĩ và gom chúng lại thành những chủ đề xịn xò cho bạn!</p>
                      </div>
                    </div>
                    <Button 
                      onClick={onAIGrowTopics}
                      className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-200/50 gap-2 font-bold px-6 py-6"
                    >
                      Sử dụng trí tuệ AI ngay
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}
