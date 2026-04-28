import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  setDoc,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Note, Group, Topic } from '../types';

export const firestoreService = {
  // TOPICS
  subscribeTopics: (userId: string, callback: (topics: Topic[]) => void) => {
    const q = query(
      collection(db, 'topics'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const topics = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Topic[];
      callback(topics);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'topics');
    });
  },

  addTopic: async (topic: Omit<Topic, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'topics'), topic);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'topics');
    }
  },

  updateTopic: async (topicId: string, updates: Partial<Topic>) => {
    try {
      const docRef = doc(db, 'topics', topicId);
      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `topics/${topicId}`);
    }
  },

  deleteTopic: async (topicId: string) => {
    try {
      const docRef = doc(db, 'topics', topicId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `topics/${topicId}`);
    }
  },

  // NOTES
  subscribeNotes: (userId: string, callback: (notes: Note[]) => void) => {
    const q = query(
      collection(db, 'notes'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const notes = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Note[];
      callback(notes);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notes');
    });
  },

  addNote: async (note: Omit<Note, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'notes'), note);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notes');
    }
  },

  updateNote: async (noteId: string, updates: Partial<Note>) => {
    try {
      const docRef = doc(db, 'notes', noteId);
      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notes/${noteId}`);
    }
  },

  deleteNote: async (noteId: string) => {
    try {
      const docRef = doc(db, 'notes', noteId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notes/${noteId}`);
    }
  },

  // GROUPS
  subscribeGroups: (userId: string, callback: (groups: Group[]) => void) => {
    const q = query(
      collection(db, 'groups'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const groups = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Group[];
      
      // Ensure "ungrouped" is present if needed, or handle it in UI
      callback(groups);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'groups');
    });
  },

  addGroup: async (group: Omit<Group, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'groups'), group);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'groups');
    }
  },

  updateGroup: async (groupId: string, updates: Partial<Group>) => {
    try {
      const docRef = doc(db, 'groups', groupId);
      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}`);
    }
  },

  deleteGroup: async (groupId: string) => {
    try {
      const docRef = doc(db, 'groups', groupId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `groups/${groupId}`);
    }
  },

  // SETTINGS (User Level)
  updateUserApiKey: async (userId: string, key: string) => {
    try {
      const docRef = doc(db, 'users', userId);
      await updateDoc(docRef, { customApiKey: key });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  },

  clearUserData: async (userId: string) => {
    try {
      const notesQ = query(collection(db, 'notes'), where('userId', '==', userId));
      const groupsQ = query(collection(db, 'groups'), where('userId', '==', userId));
      const topicsQ = query(collection(db, 'topics'), where('userId', '==', userId));
      
      const [notesSnap, groupsSnap, topicsSnap] = await Promise.all([
        getDocs(notesQ),
        getDocs(groupsQ),
        getDocs(topicsQ)
      ]);

      const deletePromises = [
        ...notesSnap.docs.map(d => deleteDoc(doc(db, 'notes', d.id))),
        ...groupsSnap.docs.map(d => deleteDoc(doc(db, 'groups', d.id))),
        ...topicsSnap.docs.map(d => deleteDoc(doc(db, 'topics', d.id)))
      ];

      await Promise.all(deletePromises);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'clearUserData');
    }
  }
};
