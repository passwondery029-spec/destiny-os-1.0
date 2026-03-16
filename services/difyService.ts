
import { UserProfile } from '../types';
import { getContextString } from './memoryService';

/**
 * Dify 服务调用模块
 * 用于调用 Dify 工作流生成深度报告
 */

// Dify API 配置（从环境变量读取）
const DIFY_API_URL = import.meta.env.VITE_DIFY_API_URL || '';
const DIFY_API_KEY = import.meta.env.VITE_DIFY_API_KEY || '';

export interface DifyReportRequest {
  profile: UserProfile;
  memories: string;
  reportType: string;
  customTopic?: string;
}

export interface DifyReportResponse {
  success: boolean;
  htmlContent?: string;
  title?: string;
  summary?: string;
  error?: string;
}

// ============ localStorage 持久化 ============
const PENDING_TASK_KEY = 'dify_pending_task';

interface PendingTask {
  taskId: string;
  submittedAt: number; // timestamp
  reportType: string;
  customTopic?: string;
}

/** 保存待处理任务到 localStorage */
const savePendingTask = (task: PendingTask) => {
  localStorage.setItem(PENDING_TASK_KEY, JSON.stringify(task));
};

/** 读取待处理任务 */
const getPendingTask = (): PendingTask | null => {
  const raw = localStorage.getItem(PENDING_TASK_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/** 清除待处理任务 */
const clearPendingTask = () => {
  localStorage.removeItem(PENDING_TASK_KEY);
};

/**
 * 提交 Dify 报告生成任务（立即返回，不等待）
 * taskId 存入 localStorage，用户可离开页面
 */
export const submitDifyReport = async (
  profile: UserProfile,
  reportType: string,
  customTopic?: string
): Promise<{ success: boolean; taskId?: string; error?: string }> => {
  try {
    const memories = await getContextString(profile.id || 'self');

    const response = await fetch('/api/dify/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, memories, reportType, customTopic }),
    });

    if (!response.ok) throw new Error(`提交失败: ${response.status}`);

    const data = await response.json();
    
    if (data.taskId) {
      // 存入 localStorage，用户离开后回来还能查
      savePendingTask({
        taskId: data.taskId,
        submittedAt: Date.now(),
        reportType,
        customTopic
      });
    }

    return { success: true, taskId: data.taskId };
  } catch (error) {
    console.error('Submit Dify Report Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '提交失败' 
    };
  }
};

/**
 * 检查是否有待处理的报告（用户回到页面时调用）
 * 如果距离提交已超过 5 分钟，立即开始轮询
 * 如果不到 5 分钟，等到第 5 分钟再轮询
 */
export const checkPendingReport = async (): Promise<DifyReportResponse | null> => {
  const pending = getPendingTask();
  if (!pending) return null;

  const elapsed = Date.now() - pending.submittedAt;
  const FIVE_MINUTES = 5 * 60 * 1000;
  const MAX_WAIT = 12 * 60 * 1000; // 最多等 12 分钟

  // 超过 12 分钟的任务视为过期
  if (elapsed > MAX_WAIT) {
    clearPendingTask();
    return null;
  }

  // 不到 5 分钟，先等一等
  if (elapsed < FIVE_MINUTES) {
    const waitTime = FIVE_MINUTES - elapsed;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  // 开始轮询（每 15 秒一次，最多再等 7 分钟）
  const pollStart = Date.now();
  const POLL_TIMEOUT = 7 * 60 * 1000;
  const POLL_INTERVAL = 15000;

  while (Date.now() - pollStart < POLL_TIMEOUT) {
    try {
      const response = await fetch(`/api/dify/report/${pending.taskId}`);
      const data = await response.json();

      if (data.status === 'completed') {
        clearPendingTask();
        return {
          success: true,
          htmlContent: data.htmlContent,
          title: data.title,
          summary: data.summary
        };
      }

      if (data.status === 'failed') {
        clearPendingTask();
        return { success: false, error: data.error || '报告生成失败' };
      }
    } catch (err) {
      console.warn('Poll error, retrying...', err);
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }

  // 超时了但不清除任务，下次进来还能再查
  return null;
};

/**
 * 检查是否有正在生成中的任务（不轮询，只检查状态）
 */
export const hasPendingReport = (): PendingTask | null => {
  return getPendingTask();
};

/**
 * 兼容旧调用：提交 + 等待结果
 * （保留给需要同步等待的场景）
 */
export const generateReportWithDify = async (
  profile: UserProfile,
  reportType: string,
  customTopic?: string
): Promise<DifyReportResponse> => {
  const submitResult = await submitDifyReport(profile, reportType, customTopic);
  if (!submitResult.success || !submitResult.taskId) {
    return { success: false, error: submitResult.error || '提交失败' };
  }

  // 等待结果
  const result = await checkPendingReport();
  if (result) return result;

  return { 
    success: false, 
    error: '报告生成超时，请稍后在报告页面查看' 
  };
};

/**
 * Mock 函数：在 Dify 不可用时提供模拟数据
 */
export const generateMockReport = (
  profile: UserProfile,
  reportType: string,
  customTopic?: string
): DifyReportResponse => {
  const typeNames: Record<string, string> = {
    'YEARLY': '2025流年运势',
    'CAREER': '事业前程详批',
    'WEALTH': '财库补全指引',
    'CUSTOM': '定制深度报告'
  };

  const reportTitle = customTopic 
    ? `定制报告：${customTopic}`
    : `${typeNames[reportType] || '深度命理报告'} - ${profile.name}`;

  const summary = `这是为${profile.name}生成的${typeNames[reportType] || '深度'}报告。基于您的生辰八字${profile.bazi ? `(${profile.bazi})` : ''}和记忆档案，为您提供专业的命理分析。`;

  // 模拟 HTML 报告内容
  const htmlContent = `
<div style="font-family: 'Georgia', serif; max-width: 800px; margin: 0 auto; padding: 40px 20px;">
  <div style="text-align: center; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 2px solid #B8860B;">
    <h1 style="font-size: 32px; color: #1F1F1F; margin-bottom: 10px;">${reportTitle}</h1>
    <p style="color: #666; font-size: 14px;">生成时间：${new Date().toLocaleString('zh-CN')}</p>
  </div>

  <div style="background: #F7F7F5; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
    <h2 style="color: #8B0000; font-size: 18px; margin-bottom: 15px;">核心断语</h2>
    <p style="font-size: 18px; line-height: 1.8; color: #333; font-style: italic;">${summary}</p>
  </div>

  <div style="margin-bottom: 30px;">
    <h2 style="color: #1F1F1F; font-size: 20px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
      <span style="color: #B8860B;">▲</span> 个人档案
    </h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
      <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #eee;">
        <div style="color: #666; font-size: 12px; margin-bottom: 5px;">姓名</div>
        <div style="color: #1F1F1F; font-size: 16px; font-weight: bold;">${profile.name}</div>
      </div>
      <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #eee;">
        <div style="color: #666; font-size: 12px; margin-bottom: 5px;">出生日期</div>
        <div style="color: #1F1F1F; font-size: 16px; font-weight: bold;">${profile.birthDate} ${profile.birthTime}</div>
      </div>
      ${profile.bazi ? `
      <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #eee;">
        <div style="color: #666; font-size: 12px; margin-bottom: 5px;">八字排盘</div>
        <div style="color: #1F1F1F; font-size: 16px; font-weight: bold;">${profile.bazi}</div>
      </div>
      ` : ''}
    </div>
  </div>

  <div style="margin-bottom: 30px;">
    <h2 style="color: #1F1F1F; font-size: 20px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
      <span style="color: #8B0000;">●</span> ${typeNames[reportType] || '深度分析'}
    </h2>
    <div style="line-height: 2; color: #333; font-size: 16px;">
      <p style="margin-bottom: 20px;">
        <strong style="color: #1F1F1F;">【运势总论】</strong><br />
        基于您的命盘分析，${profile.name}的${typeNames[reportType] || '整体运势'}呈现${reportType === 'YEARLY' ? '上升发展' : reportType === 'CAREER' ? '稳步推进' : reportType === 'WEALTH' ? '稳健积累' : '积极向上'}的态势。
      </p>
      <p style="margin-bottom: 20px;">
        <strong style="color: #B8860B;">【关键提示】</strong><br />
        建议把握${reportType === 'YEARLY' ? '年中' : reportType === 'CAREER' ? '季度转换' : reportType === 'WEALTH' ? '财务规划' : '关键'}时期的机遇，保持积极心态，避免急躁冒进。
      </p>
      <p style="margin-bottom: 20px;">
        <strong style="color: #8B0000;">【行动建议】</strong><br />
        1. 保持规律作息，养护身心<br />
        2. 定期复盘，调整策略<br />
        3. 广结善缘，把握机遇<br />
        4. 稳健行事，避免冒险
      </p>
    </div>
  </div>

  ${customTopic ? `
  <div style="margin-bottom: 30px;">
    <h2 style="color: #1F1F1F; font-size: 20px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
      <span style="color: #B8860B;">★</span> 定制主题分析
    </h2>
    <div style="background: linear-gradient(135deg, #F7F7F5 0%, #fff 100%); padding: 25px; border-radius: 12px; border-left: 4px solid #B8860B;">
      <div style="color: #666; font-size: 12px; margin-bottom: 10px;">定制主题</div>
      <div style="color: #1F1F1F; font-size: 18px; font-weight: bold; margin-bottom: 15px;">${customTopic}</div>
      <div style="color: #333; line-height: 1.8;">
        针对您定制的主题"${customTopic}"，结合您的命盘和记忆档案，为您提供深度分析和具体建议。在接下来的日子里，建议您关注相关领域的变化，保持开放心态，积极应对各种可能性。
      </div>
    </div>
  </div>
  ` : ''}

  <div style="text-align: center; padding-top: 30px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
    <p>本报告仅供娱乐与文化研究，不依据科学标准，不应作为重大生活决策的依据。</p>
    <p>请用户相信科学，拒绝迷信。</p>
  </div>
</div>
  `;

  return {
    success: true,
    htmlContent,
    title: reportTitle,
    summary
  };
};

