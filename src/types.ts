/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Note {
  id: string;
  title?: string;
  content: string;
  timestamp: number;
  groupId: string; // "ungrouped" if not assigned
  source?: string; // URL or source info
  aiSummary?: string; // AI generated summary/description
  translatedContent?: string;
  translatedTitle?: string;
  translatedSummary?: string;
  translationLang?: "vi" | "en";
  isBookmarked: boolean;
  isPinned?: boolean;
  userId: string;
  isProcessing?: boolean;
  processingStatus?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  color: string;
  updatedAt: number;
  userId: string;
  topicId?: string; // ID of the topic this group belongs to
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  userId: string;
  updatedAt: number;
  color?: string;
}

export interface UserStats {
  totalNotes: number;
  totalGroups: number;
  bookmarks: number;
  lastActive: number;
  notesPerDay?: { date: string; count: number }[];
  topGroups?: { groupId: string; name: string; count: number }[];
}
