/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MessageSquare, Folder, BarChart3, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Group } from "../types";

import { User } from "firebase/auth";

interface DesktopSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  groups: Group[];
  selectedGroupId: string | null;
  onGroupSelect: (id: string | null) => void;
  language?: "vi" | "en";
  isGrouping?: boolean;
  groupingStatus?: string;
  user: User | null;
}

export function DesktopSidebar({ 
  activeTab, 
  onTabChange, 
  groups, 
  selectedGroupId, 
  onGroupSelect,
  language = "vi",
  isGrouping,
  groupingStatus,
  user
}: DesktopSidebarProps) {
  const tabs = [
    { id: "chat", icon: MessageSquare, label: language === "vi" ? "Lượm nhặt" : "Collect" },
    { id: "groups", icon: Folder, label: language === "vi" ? "Nhóm thông minh" : "Smart Groups" },
    { id: "stats", icon: BarChart3, label: language === "vi" ? "Thống kê" : "Statistics" },
    { id: "settings", icon: Settings, label: language === "vi" ? "Cài đặt" : "Settings" },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 h-full z-40">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold italic text-xl shadow-lg shadow-blue-200">L</div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-blue-900 leading-none">LUM</h1>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-1">AI Note Taker</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Menu</div>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
              activeTab === tab.id 
                ? "bg-blue-50 text-blue-600 shadow-sm" 
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600")} />
            <span className="text-sm font-semibold">{tab.label}</span>
          </button>
        ))}

        <div className="pt-8 mb-2">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 flex items-center justify-between">
            <span>{language === "vi" ? "Nhóm" : "Groups"}</span>
            {isGrouping && <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />}
          </div>
        </div>
        
        <div className="space-y-1">
          <button
            onClick={() => onGroupSelect(null)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              !selectedGroupId && activeTab === "chat" ? "text-blue-600 font-medium" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <span>{language === "vi" ? "Tất cả" : "All Notes"}</span>
          </button>
          {groups.filter(g => g.id !== "ungrouped").map((group) => (
            <button
              key={group.id}
              onClick={() => {
                onGroupSelect(group.id);
                onTabChange("chat");
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors truncate",
                selectedGroupId === group.id ? "text-blue-600 font-medium bg-blue-50/50" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
              <span className="truncate">{group.name}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-gray-50">
        {isGrouping && (
          <div className="mb-3 p-2.5 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold text-blue-600 truncate">
              {groupingStatus}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-blue-100 overflow-hidden border border-white shadow-sm flex items-center justify-center shrink-0">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="User" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold text-xs">
                {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">
              {user?.displayName || (language === "vi" ? "Người dùng" : "User")}
            </p>
            <p className="text-[10px] text-gray-400 truncate mt-0.5">
              {user?.email || "guest@lulum.ai"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
