/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserStats, Group } from "@/src/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { Badge } from "@/components/ui/badge";

interface StatsDashboardProps {
  stats: UserStats;
  groups: Group[];
  language?: "vi" | "en";
}

export function StatsDashboard({ stats, groups, language = "vi" }: StatsDashboardProps) {
  const isVi = language === "vi";

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50/50 border-none shadow-sm">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">
              {isVi ? "Tổng số ghi chú" : "Total Notes"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <span className="text-3xl font-black text-blue-900">{stats.totalNotes}</span>
          </CardContent>
        </Card>
        <Card className="bg-purple-50/50 border-none shadow-sm">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-[10px] text-purple-600 font-bold uppercase tracking-widest">
              {isVi ? "Số nhóm" : "Total Groups"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <span className="text-3xl font-black text-purple-900">{stats.totalGroups}</span>
          </CardContent>
        </Card>
        <Card className="bg-green-50/50 border-none shadow-sm hidden lg:block">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-[10px] text-green-600 font-bold uppercase tracking-widest">
              {isVi ? "Ghi chú hôm nay" : "Notes Today"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <span className="text-3xl font-black text-green-900">
              {stats.notesPerDay[stats.notesPerDay.length - 1]?.count || 0}
            </span>
          </CardContent>
        </Card>
        <Card className="bg-orange-50/50 border-none shadow-sm hidden lg:block">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-[10px] text-orange-600 font-bold uppercase tracking-widest">
              {isVi ? "Trung bình/Ngày" : "Avg per Day"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <span className="text-3xl font-black text-orange-900">
              {(stats.totalNotes / 7).toFixed(1)}
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-6 border-b border-gray-50">
            <CardTitle className="text-sm font-bold text-gray-900 uppercase tracking-widest">
              {isVi ? "Tăng trưởng ghi chú" : "Notes Growth"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.notesPerDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#999', fontWeight: 600 }}
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#999', fontWeight: 600 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#1e3a8a' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#1d4ed8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-6 border-b border-gray-50">
            <CardTitle className="text-sm font-bold text-gray-900 uppercase tracking-widest">
              {isVi ? "Nhóm hoạt động nhất" : "Most Active Groups"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {stats.topGroups.map((group, idx) => (
              <div key={group.groupId} className="flex items-center gap-4">
                <span className="text-xs font-black text-gray-300 w-4">{idx + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-gray-700">{group.name}</span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {group.count} {isVi ? "ghi chú" : "notes"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                      style={{ width: `${(group.count / Math.max(...stats.topGroups.map(g => g.count))) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {stats.topGroups.length === 0 && (
              <div className="py-10 text-center text-gray-400 text-sm">
                {isVi ? "Chưa có dữ liệu nhóm" : "No group data yet"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
