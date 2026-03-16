
import { SYSTEM_INSTRUCTION } from '../constants';
import { getContextString, addMemory } from './memoryService';
import { supabase } from './supabaseClient';
import { OracleLevelConfig } from '../types';

let currentProfileId: string = 'self';
let chatHistory: { role: string, content: string }[] = [];

// 更新 system message 中的记忆碎片（每次发送消息前调用）
const updateSystemMessageWithMemories = async (profileId: string) => {
  const context = await getContextString(profileId);
  const fullSystemInstruction = `${SYSTEM_INSTRUCTION}\n\nCURRENT USER CONTEXT (LIFE DATABASE FOR PROFILE_ID: ${profileId}):\n${context}`;
  
  if (chatHistory.length > 0 && chatHistory[0].role === 'system') {
    chatHistory[0] = { role: 'system', content: fullSystemInstruction };
  } else {
    chatHistory.unshift({ role: 'system', content: fullSystemInstruction });
  }
};

export const initializeChat = async (profileId: string = 'self', existingHistory: { role: string, content: string }[] = []) => {
  currentProfileId = profileId;
  await updateSystemMessageWithMemories(profileId);
  
  // 如果有现有历史，添加到 system message 后面
  if (existingHistory.length > 0) {
    chatHistory = [chatHistory[0], ...existingHistory];
  }
};

export const sendMessageToOracle = async (
  message: string, 
  profileId: string = 'self',
  levelConfig?: OracleLevelConfig
): Promise<string> => {
  // Re-initialize if profile context changes or session doesn't exist
  if (chatHistory.length === 0 || currentProfileId !== profileId) {
    await initializeChat(profileId);
  } else {
    // 每次发送消息前都更新记忆碎片，确保 AI 看到最新的记忆
    await updateSystemMessageWithMemories(profileId);
  }

  try {
    // Add user message to history
    chatHistory.push({ role: 'user', content: message });

    // 根据等级配置限制发送的聊天记录数量
    let messagesToSend = [...chatHistory];
    if (levelConfig && levelConfig._maxChatHistory) {
      // 保留 system message（包含最新记忆）+ 最近的 _maxChatHistory 条对话
      const systemMessage = messagesToSend[0];
      const recentMessages = messagesToSend.slice(1).slice(-levelConfig._maxChatHistory * 2); // 每个对话包含 user 和 assistant 两条
      messagesToSend = [systemMessage, ...recentMessages];
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messagesToSend,
        profileId: profileId,
        userId: (await supabase.auth.getSession()).data.session?.user?.id,
        temperature: 0.7,
        levelConfig: levelConfig
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
