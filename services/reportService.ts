
import { DestinyReport } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { MOCK_REPORTS } from './mockDataService';
import { supabase } from './supabaseClient';

const STORAGE_KEY = 'destiny_os_reports';

const getLocalReports = (): DestinyReport[] =&gt; {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    // Initialize with mock data if empty
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_REPORTS));
    return MOCK_REPORTS;
  }
  return JSON.parse(stored);
};

export const getReports = async (): Promise&lt;DestinyReport[]&gt; =&gt; {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    // Convert snake_case from DB to camelCase for frontend
    if (data &amp;&amp; data.length &gt; 0) {
      return data.map(r =&gt; {
        let parsedSummary = r.summary;
        let parsedContent = r.content || '';
        let parsedHtmlContent: string | undefined;
        let parsedCost: number | undefined;
        try {
          const packed = JSON.parse(r.summary);
          if (packed.brief) {
            parsedSummary = packed.brief;
            parsedContent = packed.full || parsedContent;
            parsedHtmlContent = packed.html;
            parsedCost = packed.cost;
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
          htmlContent: parsedHtmlContent,
          date: r.date,
          tags: r.tags || [],
          cost: parsedCost
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
  content?: string,
  htmlContent?: string,
  cost?: number
): Promise&lt;DestinyReport&gt; =&gt; {
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
    // Pack summary, content, htmlContent, and cost together
    const packedSummary = JSON.stringify({ 
      brief: newReport.summary, 
      full: newReport.content,
      html: newReport.htmlContent,
      cost: newReport.cost
    });

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

export const deleteReport = async (id: string): Promise&lt;void&gt; =&gt; {
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
    const updated = reports.filter(r =&gt; r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
};

