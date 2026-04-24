/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { Note, Group, UserStats } from "./types";
import { groupNoteWithAI } from "./lib/gemini";
import { BottomNav } from "./components/BottomNav";
import { NoteCard } from "./components/NoteCard";
import { ChatInput } from "./components/ChatInput";
import { GroupList } from "./components/GroupList";
import { GroupDetailView } from "./components/GroupDetailView";
import { NoteDetailView } from "./components/NoteDetailView";
import { StatsDashboard } from "./components/StatsDashboard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Search, Sparkles, RefreshCw, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { DesktopSidebar } from "./components/DesktopSidebar";
import { authService } from "./lib/authService";
import { firestoreService } from "./lib/firestoreService";
import { User } from "firebase/auth";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");
  const [notes, setNotes] = useState<Note[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<"tabs" | "group-detail" | "note-detail">("tabs");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isGrouping, setIsGrouping] = useState(false);
  const [groupingStatus, setGroupingStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cancelledNotes = useRef<Set<string>>(new Set());
  const [settingsApiKey, setSettingsApiKey] = useState(localStorage.getItem("GEMINI_API_KEY") || "");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<{notes: any[], groups: any[]} | null>(null);

  // Auth Effect
  useEffect(() => {
    const unsubscribe = authService.onAuthChange((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync Effect
  useEffect(() => {
    if (!user) return;

    // Load and listen to notes
    const unsubNotes = firestoreService.subscribeNotes(user.uid, (data) => {
      setNotes(data);
    });

    // Load and listen to groups
    const unsubGroups = firestoreService.subscribeGroups(user.uid, (data) => {
      // Add "ungrouped" if missing
      const hasUngrouped = data.some(g => g.id === "ungrouped");
      if (!hasUngrouped) {
        setGroups([
          {
            id: "ungrouped",
            name: "Chưa phân loại",
            color: "#f97316",
            updatedAt: Date.now(),
            userId: user.uid
          },
          ...data
        ]);
      } else {
        setGroups(data);
      }
    });

    return () => {
      unsubNotes();
      unsubGroups();
    };
  }, [user]);

  const processNoteWithAI = async (noteId: string, content: string) => {
    if (!user) return;
    try {
      await firestoreService.updateNote(noteId, { 
        isProcessing: true, 
        processingStatus: "Đang phân loại và tạo tiêu đề..." 
      });
      
      const aiResult = await groupNoteWithAI(content, groups.filter(g => g.id !== "ungrouped"));
      
      if (cancelledNotes.current.has(noteId)) {
        cancelledNotes.current.delete(noteId);
        return;
      }

      let finalGroupId = aiResult.groupId;
      
      if (aiResult.groupId === "new" && aiResult.newGroupName) {
        const newGroupId = await firestoreService.addGroup({
          name: aiResult.newGroupName,
          description: aiResult.groupDescription || "",
          color: `hsl(${Math.random() * 360}, 70%, 60%)`,
          updatedAt: Date.now(),
          userId: user.uid
        });
        finalGroupId = newGroupId!;
        toast.success(`Đã tạo nhóm mới: ${aiResult.newGroupName}`);
      }

      await firestoreService.updateNote(noteId, { 
        groupId: finalGroupId, 
        title: aiResult.suggestedTitle || content.split('\n')[0].substring(0, 50),
        aiSummary: aiResult.aiSummary,
        isProcessing: false,
        processingStatus: undefined
      });
      
      if (finalGroupId !== "ungrouped") {
        const gn = groups.find(g => g.id === finalGroupId)?.name || aiResult.newGroupName || "Nhóm mới";
        toast.info(`Đã phân loại vào: ${gn}`);
      }
    } catch (error) {
      console.error(error);
      await firestoreService.updateNote(noteId, { isProcessing: false, processingStatus: undefined });
      
      const errorStr = String(error);
      if (error instanceof Error && error.message === "MISSING_API_KEY") {
        toast.error("Vui lòng nhập Gemini API Key trong phần Cài đặt để sử dụng AI");
        setActiveTab("settings");
      } else if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED')) {
        toast.error("Hạn mức AI đã hết. Nếu bạn dùng Key miễn phí, vui lòng đợi 1 phút rồi thử lại.");
      } else {
        toast.error("Lỗi khi xử lý AI");
      }
    }
  };

  const handleStopProcessing = async (id: string) => {
    cancelledNotes.current.add(id);
    await firestoreService.updateNote(id, { isProcessing: false, processingStatus: undefined });
    toast.info("Đã dừng xử lý AI");
  };

  const handleReclassify = (note: Note) => {
    processNoteWithAI(note.id, note.content);
  };

  const handleAddNote = async (content: string) => {
    if (!user) return;
    
    const noteData: Omit<Note, 'id'> = {
      title: content.split('\n')[0].substring(0, 50),
      content,
      timestamp: Date.now(),
      groupId: "ungrouped",
      isBookmarked: false,
      userId: user.uid,
      source: content.match(/https?:\/\/[^\s]+/)?.[0],
      isProcessing: true,
      processingStatus: "Đang phân tích nội dung..."
    };

    const newId = await firestoreService.addNote(noteData);
    if (newId) {
      processNoteWithAI(newId, content);
    }
  };

  const handleToggleBookmark = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      await firestoreService.updateNote(id, { isBookmarked: !note.isBookmarked });
    }
  };
  
  const handleTogglePin = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      const newPinnedStatus = !note.isPinned;
      await firestoreService.updateNote(id, { isPinned: newPinnedStatus });
      toast.success(newPinnedStatus ? "Đã ghim ghi chú" : "Đã bỏ ghim ghi chú");
    }
  };

  const handleDeleteNote = async (id: string) => {
    await firestoreService.deleteNote(id);
    toast.info("Đã xóa ghi chú");
    if (selectedNote?.id === id) {
      setCurrentView("tabs");
    }
  };

  const handleUpdateNote = async (id: string, updates: Partial<Note>) => {
    await firestoreService.updateNote(id, updates);
    toast.success("Đã thay đổi");
  };

  const handleUpdateGroup = async (id: string, updates: Partial<Group>) => {
    await firestoreService.updateGroup(id, updates);
    toast.success("Đã cập nhật nhóm");
  };

  const handleCreateGroup = async (name: string) => {
    if (!user) return;
    const newGroupId = await firestoreService.addGroup({
      name,
      description: "",
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      updatedAt: Date.now(),
      userId: user.uid
    });
    toast.success(`Đã tạo nhóm: ${name}`);
    return newGroupId;
  };

  const handleDeleteGroup = async (id: string) => {
    if (id === "ungrouped") return;
    
    // Move notes to ungrouped
    const notesInGroup = notes.filter(n => n.groupId === id);
    for (const note of notesInGroup) {
      await firestoreService.updateNote(note.id, { groupId: "ungrouped" });
    }

    await firestoreService.deleteGroup(id);
    setSelectedGroupId(null);
    setCurrentView("tabs");
    toast.info("Đã xóa nhóm và chuyển ghi chú vào mục chưa phân loại");
  };

  const exportData = () => {
    const data = { notes, groups };
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'lum_notes_export.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success("Đã xuất dữ liệu thành công");
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.notes && data.groups) {
          setPendingImportData(data);
          setShowImportDialog(true);
        } else {
          toast.error("Định dạng file không hợp lệ");
        }
      } catch (error) {
        toast.error("Lỗi khi đọc file");
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = "";
  };

  const handleExecuteImport = async (mode: 'add' | 'overwrite') => {
    if (!pendingImportData || !user) return;
    setShowImportDialog(false);
    
    try {
      toast.loading(mode === 'overwrite' ? "Đang xóa và ghi đè dữ liệu..." : "Đang nhập dữ liệu...");
      
      if (mode === 'overwrite') {
        await firestoreService.clearUserData(user.uid);
      }

      const idMap: Record<string, string> = { "ungrouped": "ungrouped" };
      let groupsAdded = 0;
      let notesAdded = 0;
      let failedGroups = 0;
      let failedNotes = 0;

      // 1. Add groups and store ID mapping
      for (const g of pendingImportData.groups) {
        if (g.id === "ungrouped") continue;
        
        try {
          const { id: oldId, ...rawGroupData } = g;
          const groupData = {
            name: rawGroupData.name || "Nhóm không tên",
            description: rawGroupData.description || "",
            color: rawGroupData.color || `hsl(${Math.random() * 360}, 70%, 60%)`,
            updatedAt: Number(rawGroupData.updatedAt || rawGroupData.timestamp || Date.now()),
            userId: user.uid,
            icon: rawGroupData.icon || ""
          };
          
          const newId = await firestoreService.addGroup(groupData);
          if (newId) {
            idMap[oldId] = newId;
            groupsAdded++;
          } else {
            failedGroups++;
          }
        } catch (err) {
          console.error("Failed to import group:", g, err);
          failedGroups++;
        }
      }

      // 2. Add notes with mapped group IDs
      // Using smaller chunks to avoid memory issues or too many concurrent requests if needed
      const notePromises = pendingImportData.notes.map(async (n) => {
        try {
          const { id: _id, ...rawNoteData } = n;
          const targetGroupId = idMap[rawNoteData.groupId] || "ungrouped";
          
          const noteData = {
            title: rawNoteData.title || "",
            content: rawNoteData.content || "",
            timestamp: Number(rawNoteData.timestamp || Date.now()),
            groupId: targetGroupId,
            userId: user.uid,
            isBookmarked: !!rawNoteData.isBookmarked,
            source: rawNoteData.source || "",
            type: rawNoteData.type || "text",
            aiSummary: rawNoteData.aiSummary || "",
            translatedContent: rawNoteData.translatedContent || "",
            translatedTitle: rawNoteData.translatedTitle || "",
            translatedSummary: rawNoteData.translatedSummary || "",
            translationLang: rawNoteData.translationLang || "",
            isProcessing: !!rawNoteData.isProcessing,
            processingStatus: rawNoteData.processingStatus || ""
          };

          const newId = await firestoreService.addNote(noteData);
          if (newId) notesAdded++;
          else failedNotes++;
        } catch (err) {
          console.error("Failed to import note:", n, err);
          failedNotes++;
        }
      });

      await Promise.all(notePromises);
      
      toast.dismiss();
      if (failedGroups > 0 || failedNotes > 0) {
        toast.warning(`Hoàn tất: Đã nhập ${groupsAdded} nhóm, ${notesAdded} ghi chú. Thất bại: ${failedGroups} nhóm, ${failedNotes} ghi chú.`);
      } else {
        toast.success(`Đã nhập thành công ${groupsAdded} nhóm và ${notesAdded} ghi chú.`);
      }
      setPendingImportData(null);
    } catch (error) {
      toast.dismiss();
      console.error("Import error:", error);
      toast.error("Có lỗi nghiêm trọng xảy ra khi nhập dữ liệu");
    }
  };

  const noteCounts = notes.reduce((acc, note) => {
    acc[note.groupId] = (acc[note.groupId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         n.title?.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedGroupId) {
      return n.groupId === selectedGroupId && matchesSearch;
    }
    return matchesSearch;
  }).sort((a, b) => {
    // Sort by pinned first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    // Then by timestamp desc
    return b.timestamp - a.timestamp;
  });

  const stats: UserStats = {
    totalNotes: notes.length,
    totalGroups: groups.length - 1,
    bookmarks: notes.filter(n => n.isBookmarked).length,
    lastActive: notes[0]?.timestamp || Date.now(),
    notesPerDay: Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      return {
        date: dateStr,
        count: notes.filter(n => new Date(n.timestamp).toISOString().split('T')[0] === dateStr).length
      };
    }),
    topGroups: groups
      .filter(g => g.id !== "ungrouped")
      .map(g => ({ groupId: g.id, name: g.name, count: noteCounts[g.id] || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Sparkles className="w-12 h-12 text-blue-600 animate-pulse" />
          <p className="text-gray-400 font-medium tracking-tight">Đang khởi động LUM...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-6 font-sans">
        <Card className="max-w-md w-full p-10 border-none shadow-2xl shadow-blue-100/50 rounded-[2.5rem] text-center space-y-10 bg-white/80 backdrop-blur-xl">
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-300 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-700 to-blue-500 transition-transform group-hover:scale-110 duration-500" />
              <Sparkles className="w-12 h-12 text-white relative z-10" />
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <span className="text-5xl font-black text-blue-900 tracking-tighter italic">LUM</span>
              <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest">PRO</Badge>
            </div>
            <p className="text-gray-500 font-medium text-lg leading-tight px-4 tracking-tight">Lượm nhặt ý tưởng, kiến thức từ mọi nơi và ghi nhớ chúng bằng AI.</p>
          </div>

          <div className="space-y-4 pt-4">
            <Button 
              onClick={() => authService.loginWithGoogle()}
              className="w-full h-16 rounded-[1.25rem] bg-white hover:bg-gray-50 text-gray-900 border border-gray-100 shadow-xl shadow-gray-200/50 flex items-center justify-center gap-4 text-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" />
              Đăng nhập với Google
            </Button>
            <p className="text-[11px] text-gray-400 leading-relaxed font-medium px-4">
              Dữ liệu của bạn được đồng bộ và bảo mật tuyệt đối trên nền tảng đám mây của Google Firebase.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex bg-[#F8F9FB] text-gray-900 font-sans selection:bg-blue-100 overflow-hidden">
      <DesktopSidebar 
        activeTab={activeTab} 
        onTabChange={(tab) => {
          setActiveTab(tab);
          setCurrentView("tabs");
        }}
        groups={groups}
        selectedGroupId={selectedGroupId}
        onGroupSelect={setSelectedGroupId}
        isGrouping={isGrouping}
        groupingStatus={groupingStatus}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <header className="md:hidden shrink-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold italic">L</div>
            <h1 className="text-xl font-bold tracking-tight text-blue-900">LUM</h1>
          </div>
          <div className="flex items-center gap-3">
            {isGrouping && (
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="text-blue-500"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </motion.div>
                <span className="text-[10px] font-bold text-blue-600 whitespace-nowrap animate-pulse">
                  {groupingStatus}
                </span>
              </div>
            )}
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Lum" alt="User" referrerPolicy="no-referrer" />
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-5xl mx-auto relative overflow-hidden flex flex-col md:px-6 md:py-4">
          <AnimatePresence mode="wait">
            {currentView === "group-detail" && selectedGroup && (
              <motion.div
                key="group-detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 bg-white md:rounded-3xl md:shadow-xl md:shadow-blue-900/5 overflow-hidden border border-gray-100"
              >
                <GroupDetailView 
                  group={selectedGroup} 
                  notes={notes} 
                  onBack={() => setCurrentView("tabs")}
                  onUpdateNote={handleUpdateNote}
                  onToggleBookmark={handleToggleBookmark}
                  onTogglePin={handleTogglePin}
                  onUpdateGroup={handleUpdateGroup}
                  onDeleteGroup={handleDeleteGroup}
                  onStopProcessing={handleStopProcessing}
                  onReclassify={handleReclassify}
                  onNoteClick={(note) => {
                    setSelectedNote(note);
                    setCurrentView("note-detail");
                  }}
                />
              </motion.div>
            )}

            {currentView === "note-detail" && selectedNote && (
              <motion.div
                key="note-detail"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="flex-1 bg-white md:rounded-3xl md:shadow-xl md:shadow-blue-900/5 overflow-hidden border border-gray-100"
              >
                <NoteDetailView 
                  note={selectedNote}
                  group={groups.find(g => g.id === selectedNote.groupId)}
                  existingGroups={groups}
                  onBack={() => setCurrentView(selectedGroup ? "group-detail" : "tabs")}
                  onSave={handleUpdateNote}
                  onDelete={handleDeleteNote}
                  onTogglePin={handleTogglePin}
                  onToggleBookmark={handleToggleBookmark}
                />
              </motion.div>
            )}

            {currentView === "tabs" && activeTab === "chat" && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col flex-1 min-h-0 bg-white md:rounded-3xl md:shadow-xl md:shadow-blue-900/5 overflow-hidden border border-gray-100"
              >
                <div className="p-4 md:p-6 flex gap-3 items-center border-b border-gray-50">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      placeholder="Tìm kiếm ghi chú, ý tưởng..." 
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSelectedGroupId(null);
                      }}
                      className="pl-9 bg-gray-50 border-none shadow-none rounded-xl focus-visible:ring-1 focus-visible:ring-blue-200"
                    />
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="rounded-xl text-gray-400">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {selectedGroupId && (
                  <div className="px-4 md:px-6 py-2 flex items-center justify-between bg-blue-50/30">
                    <div className="flex items-center gap-2 bg-blue-100/50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200/50">
                      <span>Nhóm: {groups.find(g => g.id === selectedGroupId)?.name}</span>
                      <button 
                        onClick={() => setSelectedGroupId(null)}
                        className="hover:text-blue-900 ml-1"
                      >
                        ✕
                      </button>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{filteredNotes.length} kết quả</span>
                  </div>
                )}

                <ScrollArea className="flex-1 px-4 md:px-6 min-h-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 pb-8">
                    {filteredNotes.length === 0 && !searchQuery && (
                      <div className="col-span-full py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                          <Sparkles className="w-10 h-10 text-blue-400" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-gray-600">Bắt đầu lượm nhặt</p>
                          <p className="text-xs text-gray-400 px-10">Quăng bất cứ thứ gì vào đây, AI sẽ giúp bạn sắp xếp gọn gàng.</p>
                        </div>
                      </div>
                    )}
                    {filteredNotes.map((note) => (
                      <NoteCard 
                        key={note.id} 
                        note={note} 
                        group={groups.find(g => g.id === note.groupId)} 
                        onToggleBookmark={handleToggleBookmark}
                        onTogglePin={handleTogglePin}
                        onUpdateNote={handleUpdateNote}
                        onStopProcessing={handleStopProcessing}
                        onReclassify={handleReclassify}
                        onNoteClick={(note) => {
                          setSelectedNote(note);
                          setSelectedGroup(null);
                          setCurrentView("note-detail");
                        }}
                      />
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="p-4 md:p-6 bg-white border-t border-gray-50">
                  <ChatInput onSend={handleAddNote} />
                </div>
              </motion.div>
            )}

            {currentView === "tabs" && activeTab === "groups" && (
              <motion.div
                key="groups"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col min-h-0 bg-white md:rounded-3xl md:shadow-xl md:shadow-blue-900/5 overflow-hidden border border-gray-100"
              >
                <div className="p-6 flex justify-between items-center border-b border-gray-50 shrink-0">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Nhóm thông minh</h2>
                    <p className="text-xs text-gray-400 mt-1">AI tự động phân loại ghi chú của bạn</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl gap-2 text-blue-600 border-blue-100 hover:bg-blue-50"
                      onClick={() => {
                        const name = prompt("Nhập tên nhóm mới:");
                        if (name) handleCreateGroup(name);
                      }}
                    >
                      + Thêm nhóm
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl gap-2 text-blue-600 border-blue-100 hover:bg-blue-50">
                      <RefreshCw className="w-4 h-4" />
                      Làm mới AI
                    </Button>
                  </div>
                </div>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-6">
                    <GroupList 
                      groups={groups} 
                      notes={notes}
                      noteCounts={noteCounts} 
                      onGroupClick={(g) => {
                        setSelectedGroup(g);
                        setCurrentView("group-detail");
                      }} 
                    />
                  </div>
                </ScrollArea>
              </motion.div>
            )}

            {currentView === "tabs" && activeTab === "stats" && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="flex-1 overflow-y-auto min-h-0 bg-white md:rounded-3xl md:shadow-xl md:shadow-blue-900/5 overflow-hidden border border-gray-100"
              >
                <StatsDashboard stats={stats} groups={groups} />
              </motion.div>
            )}

            {currentView === "tabs" && activeTab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col min-h-0 bg-white md:rounded-3xl md:shadow-xl md:shadow-blue-900/5 overflow-hidden border border-gray-100"
              >
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-6 md:p-10 space-y-8 pb-10">
                    <div>
                      <h2 className="text-3xl font-bold text-blue-900">Cài đặt</h2>
                      <p className="text-gray-400 mt-2">Quản lý dữ liệu và tùy chỉnh ứng dụng của bạn</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="p-6 border-none bg-gray-50 shadow-none rounded-2xl">
                        <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-widest">Tài khoản</h3>
                        <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" />
                            ) : (
                              <UserIcon className="w-6 h-6 text-blue-500" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{user.displayName || user.email}</p>
                            <p className="text-[10px] text-gray-400">{user.email}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          onClick={() => authService.logout()}
                          className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          Đăng xuất
                        </Button>
                      </Card>

                      <Card className="p-6 border-none bg-gray-50 shadow-none rounded-2xl">
                        <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-widest">AI Configuration</h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gemini API Key</label>
                            <Input 
                              type="password"
                              placeholder="Nhập API Key của bạn..."
                              value={settingsApiKey}
                              onChange={(e) => {
                                const val = e.target.value.trim();
                                setSettingsApiKey(val);
                                if (val) {
                                  localStorage.setItem("GEMINI_API_KEY", val);
                                } else {
                                  localStorage.removeItem("GEMINI_API_KEY");
                                }
                                toast.success("Đã cập nhật API Key", { id: "api-key-toast" });
                              }}
                              className="bg-white border-none shadow-sm rounded-xl focus-visible:ring-1 focus-visible:ring-blue-200"
                            />
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                              API Key được lưu cục bộ trên trình duyệt của bạn (Local Storage). 
                              {settingsApiKey ? (
                                <span className="text-green-600 font-bold block mt-1">
                                  ✓ Đang sử dụng Key cá nhân (Kết thúc bằng: {settingsApiKey.slice(-4)})
                                </span>
                              ) : (
                                <span className="text-blue-600 font-medium block mt-1">• Đang sử dụng Key mặc định của hệ thống</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-6 border-none bg-gray-50 shadow-none rounded-2xl">
                        <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-widest">Dữ liệu cá nhân</h3>
                        <div className="space-y-3">
                          <Button 
                            variant="outline" 
                            className="w-full justify-start gap-3 bg-white border-none shadow-sm rounded-xl py-6"
                            onClick={exportData}
                          >
                            <RefreshCw className="w-5 h-5 text-blue-500" />
                            <div className="text-left">
                              <p className="text-sm font-bold">Xuất dữ liệu (JSON)</p>
                              <p className="text-[10px] text-gray-400">Tải về toàn bộ ghi chú và nhóm</p>
                            </div>
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start gap-3 bg-white border-none shadow-sm rounded-xl py-6"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <RefreshCw className="w-5 h-5 text-green-500 rotate-180" />
                            <div className="text-left">
                              <p className="text-sm font-bold">Nhập dữ liệu (JSON)</p>
                              <p className="text-[10px] text-gray-400">Khôi phục ghi chú từ file backup</p>
                            </div>
                          </Button>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={importData} 
                            accept=".json" 
                            className="hidden" 
                          />
                          <Button 
                            variant="destructive" 
                            className="w-full justify-start gap-3 bg-red-50 text-red-600 hover:bg-red-100 border-none shadow-none rounded-xl py-6 opacity-50"
                            disabled
                          >
                            <div className="text-left">
                              <p className="text-sm font-bold">Xóa tất cả dữ liệu</p>
                              <p className="text-[10px] text-red-400">Hành động này không thể hoàn tác</p>
                            </div>
                          </Button>
                        </div>
                      </Card>

                      <Card className="p-6 border-none bg-gray-50 shadow-none rounded-2xl">
                        <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-widest">Tùy chỉnh</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                            <span className="text-sm font-medium">Ngôn ngữ hiển thị</span>
                            <span className="text-blue-600 text-sm font-bold">Tiếng Việt</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                            <span className="text-sm font-medium">Chế độ tối (Dark Mode)</span>
                            <span className="text-gray-400 text-xs">Sắp ra mắt</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                            <span className="text-sm font-medium">Phiên bản ứng dụng</span>
                            <span className="text-gray-400 text-sm">1.0.0</span>
                          </div>
                        </div>
                      </Card>
                    </div>

                    <div className="text-center pt-20 pb-4">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        <p className="text-[10px] text-blue-700 font-bold uppercase tracking-widest">Powered by Gemini AI</p>
                      </div>
                      <p className="text-xs text-gray-300 mt-4">LUM © 2026 • Made with Love</p>
                    </div>
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <div className="md:hidden">
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        <Toaster position="top-center" />

        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Tùy chọn nhập dữ liệu</DialogTitle>
              <DialogDescription>
                Bạn muốn xử lý dữ liệu nhập vào như thế nào? Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 py-4">
              <Button 
                variant="outline" 
                className="justify-start h-auto p-4 flex flex-col items-start gap-1"
                onClick={() => handleExecuteImport('add')}
              >
                <div className="font-bold">Thêm mới</div>
                <div className="text-xs text-muted-foreground font-normal">Giữ lại dữ liệu hiện tại và thêm dữ liệu mới từ file.</div>
              </Button>
              <Button 
                variant="destructive" 
                className="justify-start h-auto p-4 flex flex-col items-start gap-1"
                onClick={() => handleExecuteImport('overwrite')}
              >
                <div className="font-bold">Ghi đè tất cả</div>
                <div className="text-xs text-red-100 font-normal">Xóa toàn bộ dữ liệu hiện tại trên mây và thay thế bằng dữ liệu từ file.</div>
              </Button>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowImportDialog(false)}>Hủy bỏ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
