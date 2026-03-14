
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

export const getReports = async (): Promise<DestinyReport[]> => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    // Convert snake_case from DB to camelCase for frontend
    if (data && data.length > 0) {
      return data.map(r => {
        let parsedSummary = r.summary;
        let parsedContent = r.content || '';
        try {
          const packed = JSON.parse(r.summary);
          if (packed.brief) {
            parsedSummary = packed.brief;
            parsedContent = packed.full || parsedContent;
          }
        } catch (e) {
          // It was a normal string
        }

        return {
          id: r.id,
          profileId: r.profile_id || 'self',
          title: r.title,
          type: r.type,
          summary: parsedSummary,
          content: parsedContent,
          date: r.date,
          tags: r.tags || []
        };
      });
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
  content?: string
): Promise<DestinyReport> => {
  const newReport: DestinyReport = {
    id: uuidv4(),
    profileId,
    title,
    type,
    summary,
    content,
    date: new Date().toISOString().split('T')[0],
    tags
  };

  try {
    // Pack summary and content together
    const packedSummary = JSON.stringify({ brief: newReport.summary, full: newReport.content });

    // Insert into Supabase
    const { error } = await supabase
      .from('reports')
      .insert([
        {
          id: newReport.id,
          profile_id: newReport.profileId,
          title: newReport.title,
          type: newReport.type,
          summary: packedSummary,
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
