import { DestinyReport } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { MOCK_REPORTS } from './mockDataService';
import { supabase } from './supabaseClient';

const STORAGE_KEY = 'destiny_os_reports';

const getLocalReports = (): DestinyReport[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    // Initialize with mock data if empty
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_REPORTS));
    return MOCK_REPORTS;
  }
  return JSON.parse(stored);
};

// 辅助函数：获取当前用户ID
const getCurrentUserId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
        return user.id;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
        return session.user.id;
    }
    const stored = localStorage.getItem('sb-kvqqrlmapsfmskhhyyvm-auth-token');
    if (stored) {
        try {
            const tokenData = JSON.parse(stored);
            if (tokenData?.access_token) {
                const payload = JSON.parse(atob(tokenData.access_token.split('.')[1]));
                if (payload?.sub) {
                    return payload.sub;
                }
            }
        } catch (e) {}
    }
    return null;
  return user?.id || null;
};

export const getReports = async (profileId?: string): Promise<DestinyReport[]> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return getLocalReports();

    let url = '/api/reports';
    if (profileId) {
        url += `?profileId=${profileId}`;
    }

    const response = await fetch(url, {
        headers: { 'x-user-id': userId }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch reports');
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      return data.map((r: any) => ({
        id: r.id,
        profileId: r.profile_id || r.profileId || 'self',
        title: r.title,
        type: r.type,
        summary: r.summary || '',
        content: r.content || '',
        htmlContent: r.html_content || r.htmlContent,
        date: r.date,
        tags: r.tags || [],
        cost: r.cost
      }));
    }

    return getLocalReports();
  } catch (error) {
    console.error('[ReportService] getReports error:', error);
    return getLocalReports();
  }
};

export const addReport = async (
  title: string,
  type: DestinyReport['type'],
  summary: string,
  tags: string[],
  profileId: string = 'self',
  content?: string,
  htmlContent?: string,
  cost?: number
): Promise<DestinyReport> => {
  const newReport: DestinyReport = {
    id: uuidv4(),
    profileId,
    title,
    type,
    summary,
    content,
    htmlContent,
    date: new Date().toISOString().split('T')[0],
    tags,
    cost
  };

  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not logged in');

    const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId
        },
        body: JSON.stringify(newReport)
    });

    if (!response.ok) {
        throw new Error('Failed to add report');
    }

    const data = await response.json();
    return {
        ...newReport,
        id: data.id
    };
  } catch (error) {
    console.error('[ReportService] addReport error:', error);
    // Fallback to local storage
    const reports = getLocalReports();
    const updated = [newReport, ...reports];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newReport;
  }
};

export const deleteReport = async (id: string): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not logged in');

    const response = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId }
    });

    if (!response.ok) {
        throw new Error('Failed to delete report');
    }
  } catch (error) {
    console.error('[ReportService] deleteReport error:', error);
    // Fallback to local storage
    const reports = getLocalReports();
    const updated = reports.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
};
