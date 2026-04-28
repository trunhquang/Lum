/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";

// Helper to get AI instance with the latest key
const getAIInstance = () => {
  const userKey = localStorage.getItem("GEMINI_API_KEY")?.trim();
  const envKey = (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined);
  
  // Use user key if available, otherwise fallback to env key
  const apiKey = userKey || envKey || "";
  
  if (!apiKey || apiKey === "undefined") {
    throw new Error("MISSING_API_KEY");
  }
  
  // Log which key is being used (masked for security)
  const keyType = userKey ? "User Custom Key" : "System Default Key";
  console.log(`[AI] Using ${keyType}: ***${apiKey.slice(-4)}`);
  
  return new GoogleGenAI({ apiKey });
};

export async function groupNoteWithAI(content: string, existingGroups: { id: string; name: string }[]) {
  const prompt = `
    You are an AI organizer for a note-taking app called LUM.
    Your task is to analyze the following note content and decide if it belongs to one of the existing groups or if a new group should be created.

    Note Content: "${content}"

    Existing Groups:
    ${existingGroups.map(g => `- ${g.name} (ID: ${g.id})`).join('\n')}

    Rules:
    1. If the note fits well into an existing group, return that group's ID.
    2. If it doesn't fit any existing group, create a HIGHLY SPECIFIC, granular, and descriptive new group name.
       - AVOID generic names like "Công việc", "Cá nhân", "Website", "Lập trình", "Học tập".
       - PREFER specific topics like "React Performance", "UI Design Patterns", "Món ngon mỗi ngày", "Kỹ năng lãnh đạo", "Thị trường Crypto".
       - The group name should clearly reflect the specific niche of the content.
    3. If the content is just a URL, use your knowledge of that website to suggest a descriptive title AND a brief summary of what the website does (max 30 words).
    4. If the content is text, summarize it into a catchy title (max 10 words) and a brief summary (max 30 words).
    5. The group name should be in Vietnamese if the content is in Vietnamese or if it's a general topic.
    6. Return the result in JSON format.

    Response format:
    {
      "groupId": "existing_id" or "new",
      "newGroupName": "Name if new (be specific and granular)",
      "groupDescription": "A brief description of why this group was created and what it contains",
      "suggestedTitle": "A short, catchy title for this specific note (max 10 words)",
      "aiSummary": "A brief description or summary of the content (max 30 words)",
      "reason": "Brief explanation"
    }
  `;

  try {
    const ai = getAIInstance();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            groupId: { type: Type.STRING },
            newGroupName: { type: Type.STRING },
            groupDescription: { type: Type.STRING },
            suggestedTitle: { type: Type.STRING },
            aiSummary: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ["groupId", "reason", "suggestedTitle", "aiSummary", "newGroupName"]
        }
      }
    });

    if (!response.text) {
      throw new Error("AI returned empty response");
    }

    try {
      return JSON.parse(response.text);
    } catch (parseError) {
      console.error("Failed to parse AI response:", response.text);
      throw new Error("AI response was not valid JSON");
    }
  } catch (error) {
    console.error("AI Grouping Error:", error);
    throw error; // Rethrow to handle in the UI
  }
}

export async function generateGroupSummary(notes: string[]) {
  const prompt = `
    Summarize these notes into a concise topic description:
    ${notes.join('\n---\n')}
  `;

  try {
    const ai = getAIInstance();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
    return response.text;
  } catch (error) {
    console.error("AI Summary Error:", error);
    return "";
  }
}

export async function translateNoteContent(
  text: string, 
  title: string, 
  summary: string, 
  targetLang: "vi" | "en"
) {
  const prompt = `
    Translate the following note components into ${targetLang === "vi" ? "Vietnamese" : "English"}.
    Return the result in JSON format.
    
    Maintain any markdown formatting in the content.
    If the text is already in the target language, return it as is.
    Be natural and accurate.

    Content: "${text}"
    Title: "${title}"
    Summary: "${summary}"

    Response format:
    {
      "translatedContent": "...",
      "translatedTitle": "...",
      "translatedSummary": "..."
    }
  `;

  try {
    const ai = getAIInstance();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedContent: { type: Type.STRING },
            translatedTitle: { type: Type.STRING },
            translatedSummary: { type: Type.STRING }
          },
          required: ["translatedContent", "translatedTitle", "translatedSummary"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Translation Error:", error);
    throw error;
  }
}

export async function groupContentIntoTopicsAI(groups: { id: string; name: string; description?: string }[]) {
  const prompt = `
    You are an AI data architect for LUM.
    Your task is to take a list of "Groups" (folders) and organize them into higher-level "Topics" (Themes/Categories).
    
    Groups to organize:
    ${groups.map(g => `- ${g.name} (ID: ${g.id}): ${g.description || "No description"}`).join('\n')}

    Rules:
    1. Group related items into cohesive topics.
    2. Suggest a name and description for each topic.
    3. Return a list of mappings: which group belongs to which topic using the provided group IDs.
    4. If a group is too unique, it can be its own topic or left out by not assigning a topic (assign null).
    5. Topics should be broad enough to house multiple groups but specific enough to be useful (e.g., "Kỳ nghỉ & Du lịch", "Học thuật & Nghiên cứu", "Tài chính Cá nhân").
    6. Return the results in JSON.
    7. IMPORTANT: Only use the IDs provided in the "Groups to organize" section. Do not use group names as groupIds.

    Response format:
    {
      "topics": [
        {
          "name": "Topic Name",
          "description": "Topic Description",
          "groupIds": ["id1", "id2"]
        }
      ]
    }
  `;

  try {
    const ai = getAIInstance();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  groupIds: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["name", "description", "groupIds"]
              }
            }
          },
          required: ["topics"]
        }
      }
    });

    if (!response.text) return { topics: [] };
    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Topic Grouping Error:", error);
    return { topics: [] };
  }
}

export async function translateContent(text: string, targetLang: "vi" | "en") {
  const prompt = `
    Translate the following text to ${targetLang === "vi" ? "Vietnamese" : "English"}.
    - Maintain any markdown formatting.
    - If it's a URL, don't translate the URL itself, but you can translate any surrounding text.
    - If the text is already in the target language, return it as is.
    - Be natural and accurate.

    Text:
    ${text}
  `;

  try {
    const ai = getAIInstance();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
    return response.text;
  } catch (error) {
    console.error("AI Translation Error:", error);
    throw error;
  }
}
