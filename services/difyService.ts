
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

/**
 * 调用 Dify 工作流生成报告（异步模式）
 * 1. 提交任务，获取 taskId
 * 2. 每 10 秒轮询状态
 * 3. 完成后返回结果
 * 
 * @param onProgress 可选的进度回调，用于更新 UI
 */
export const generateReportWithDify = async (
  profile: UserProfile,
  reportType: string,
  customTopic?: string,
  onProgress?: (progress: number, message: string) => void
): Promise<DifyReportResponse> => {
  try {
    // 获取用户的记忆碎片
    const memories = await getContextString(profile.id || 'self');

    // 构建请求数据
    const requestData: DifyReportRequest = {
      profile,
      memories,
      reportType,
      customTopic
    };

    // 第一步：提交任务
    onProgress?.(5, '正在提交报告生成任务...');
    const submitResponse = await fetch('/api/dify/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    if (!submitResponse.ok) {
      throw new Error(`提交失败: ${submitResponse.status}`);
    }

    const submitData = await submitResponse.json();
    
    if (!submitData.taskId) {
      // 如果没有 taskId，说明是旧版直接返回结果的模式
      return submitData;
    }

    const taskId = submitData.taskId;
    onProgress?.(10, '任务已提交，天机阁正在为您推演命盘...');

    // 第二步：轮询结果（最多等 12 分钟）
    const maxWait = 720000; // 12 分钟
    const pollInterval = 10000; // 10 秒
    const startTime = Date.now();

    const progressMessages = [
      '天机阁正在推演命盘...',
      '正在分析八字格局...',
      '正在查阅古籍典籍...',
      '正在结合流年运势...',
      '正在撰写深度报告...',
      '正在精修报告细节...',
      '报告即将生成完毕...'
    ];

    while (Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      try {
        const pollResponse = await fetch(`/api/dify/report/${taskId}`);
        const pollData = await pollResponse.json();

        if (pollData.status === 'completed') {
          onProgress?.(100, '报告已生成！');
          return {
            success: true,
            htmlContent: pollData.htmlContent,
            title: pollData.title,
            summary: pollData.summary
          };
        }

        if (pollData.status === 'failed') {
          throw new Error(pollData.error || '报告生成失败');
        }

        // 更新进度
        const elapsed = (Date.now() - startTime) / 1000;
        const msgIndex = Math.min(
          progressMessages.length - 1,
          Math.floor(elapsed / 60)
        );
        onProgress?.(pollData.progress || 20, progressMessages[msgIndex]);
      } catch (pollError) {
        console.warn('Poll error, will retry:', pollError);
      }
    }

    throw new Error('报告生成超时，请稍后重试');
  } catch (error) {
    console.error('Dify Report Generation Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '生成报告时发生未知错误'
    };
  }
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

