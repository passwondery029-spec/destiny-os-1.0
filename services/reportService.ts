
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
  return user?.id || null;
};

export const getReports = async (profileId?: string): Promise<DestinyReport[]> => {
  try {
    let query = supabase
      .from('reports')
      .select('*')
      .order('date', { ascending: false });

    // 如果指定了 profileId，按其筛选
    if (profileId) {
      query = query.eq('profile_id', profileId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Convert snake_case from DB to camelCase for frontend
    if (data && data.length > 0) {
      return data.map(r => ({
        id: r.id,
        profileId: r.profile_id || 'self',
        title: r.title,
        type: r.type,
        summary: r.summary || '',
        content: r.content || '',
        htmlContent: r.html_content,
        date: r.date,
        tags: r.tags || [],
        cost: r.cost
      }));
    }

    return getLocalReports(); // Fallback if DB is empty
  } catch (error) {
    console.error('Error fetching reports from Supabase:', error);
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
    // 获取当前用户ID
    const userId = await getCurrentUserId();

    // Insert into Supabase with correct column names
    const { error } = await supabase
      .from('reports')
      .insert([
        {
          id: newReport.id,
          user_id: userId,
          profile_id: newReport.profileId,
          title: newReport.title,
          type: newReport.type,
          summary: newReport.summary,
          content: newReport.content,
          html_content: newReport.htmlContent,
          cost: newReport.cost,
          date: newReport.date,
          tags: newReport.tags
        }
      ]);

    if (error) throw error;
  } catch (error) {
    console.error('Error adding report to Supabase:', error);
    // Fallback to local storage
    const reports = getLocalReports();
    const updated = [newReport, ...reports];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  return newReport;
};

export const deleteReport = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting report from Supabase:', error);
    // Fallback to local storage
    const reports = getLocalReports();
    const updated = reports.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
};

