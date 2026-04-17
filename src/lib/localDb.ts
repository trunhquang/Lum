/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note, Group } from "@/src/types";

const STORAGE_KEY_NOTES = "lum_notes";
const STORAGE_KEY_GROUPS = "lum_groups";

export const LocalDB = {
  getNotes: (): Note[] => {
    const data = localStorage.getItem(STORAGE_KEY_NOTES);
    return data ? JSON.parse(data) : [];
  },
  saveNotes: (notes: Note[]) => {
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
  },
  getGroups: (): Group[] => {
    const data = localStorage.getItem(STORAGE_KEY_GROUPS);
    return data ? JSON.parse(data) : [
      {
        id: "ungrouped",
        name: "Chưa phân loại",
        color: "#f97316",
        updatedAt: Date.now(),
        userId: "local-user"
      }
    ];
  },
  saveGroups: (groups: Group[]) => {
    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groups));
  },
  addNote: (note: Note) => {
    const notes = LocalDB.getNotes();
    LocalDB.saveNotes([note, ...notes]);
  },
  addGroup: (group: Group) => {
    const groups = LocalDB.getGroups();
    LocalDB.saveGroups([...groups, group]);
  }
};
