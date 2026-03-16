
import { SYSTEM_INSTRUCTION } from '../constants';
import { getContextString, addMemory } from './memoryService';
import { supabase } from './supabaseClient';

let currentProfileId: string = 'self';
let chatHistory: { role: string, content: string }[] = [];

export const initializeChat = async (profileId: string = 'self', existingHistory: { role: string, content: string }[] = []) => {
  const context = await getContextString(profileId);
  currentProfileId = profileId;

  const fullSystemInstruction = `${SYSTEM_INSTRUCTION}\n\nCURRENT USER CONTEXT (LIFE DATABASE FOR PROFILE_ID: ${profileId}):\n${context}`;

  // Reset chat history with system instruction + existing history
  chatHistory = [
    { role: 'system', content: fullSystemInstruction },
    ...existingHistory
  ];
};

export const sendMessageToOracle = async (message: string, profileId: string = 'self'): Promise<string> => {
  // Re-initialize if profile context changes or session doesn't exist
  if (chatHistory.length === 0 || currentProfileId !== profileId) {
    await initializeChat(profileId);
  }

  try {
    // Add user message to history
    chatHistory.push({ role: 'user', content: message });

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: chatHistory,
        profileId: profileId,
        userId: (await supabase.auth.getSession()).data.session?.user?.id,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    const replyText = data.text || "The Oracle is silent (No response text).";

    // Add assistant response to history
    chatHistory.push({ role: 'assistant', content: replyText });

    return replyText;
  } catch (error) {
    console.error("Ark API Error:", error);
    // Remove the failed user message from history
    chatHistory.pop();
    return "连接暂时中断，请稍后再试。";
  }
};

/**
 * Generates a structured report based on a topic.
 * Returns a JSON object with title, summary, and content.
 */
export const generateReportContent = async (topic: string, profileInfo: string, profileId: string = 'self'): Promise<{ title: string, summary: string, content: string }> => {
  try {
    const context = await getContextString(profileId);
    const response = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, profileInfo, context })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return data;
  } catch (e) {
    console.error("Report Generation Failed", e);
    return {
      title: `${topic} - 命理详批`,
      summary: "报告生成中遇到小问题，请稍后再试。",
      content: "暂时无法生成详细报告，请稍后再试或直接与魔术师对话获取指引。"
    };
  }
}

/**
 * ONE-SHOT Divination (The Diviner Persona)
 * Uses a strict system instruction for specific event prediction (Liu Yao / I Ching simulation).
 */
export const consultDiviner = async (question: string, hexagramCode: string): Promise<string> => {
  try {
    const response = await fetch('/api/divine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, hexagramCode })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return data.text || "卦象混沌，请诚心再试。";
  } catch (e) {
    console.error("Divination Failed", e);
    return "连接暂时中断，请稍后再试。";
  }
};
