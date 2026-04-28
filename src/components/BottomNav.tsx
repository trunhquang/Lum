/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MessageSquare, Folder, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { User } from "firebase/auth";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  language?: "vi" | "en";
  user: User | null;
}

export function BottomNav({ activeTab, onTabChange, language = "vi", user }: BottomNavProps) {
  const tabs = [
    { id: "chat", icon: MessageSquare, label: language === "vi" ? "Lượm" : "Collect" },
    { id: "groups", icon: Folder, label: language === "vi" ? "Nhóm" : "Groups" },
    { id: "stats", icon: BarChart3, label: language === "vi" ? "Thống kê" : "Stats" },
    { id: "settings", icon: Settings, label: language === "vi" ? "Cài đặt" : "Settings" },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-lg border-t border-gray-100 flex justify-around items-center py-2 pb-6 px-4 z-50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors relative",
            activeTab === tab.id ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
          )}
        >
          {tab.id === "settings" && user ? (
            <div className={cn(
              "w-6 h-6 rounded-full overflow-hidden border transition-all",
              activeTab === "settings" ? "border-blue-500 scale-110 shadow-sm" : "border-gray-200"
            )}>
              {user.photoURL ? (
                <img src={user.photoURL} alt="User" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                  {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
          ) : (
            <tab.icon className={cn("w-6 h-6", activeTab === tab.id && "fill-blue-50")} />
          )}
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
