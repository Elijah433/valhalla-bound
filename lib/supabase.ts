import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xpkbyvjjqdfajegkddma.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwa2J5dmpqcWRmYWplZ2tkZG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjcxODgsImV4cCI6MjA5NjcwMzE4OH0.8PSZF6ADi908MUMRf09RUGhl0lldPcPyTo-IwNUW-KE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Crew = {
  id: string;
  name: string;
  code: string;
  leader_device_id: string;
  created_at: string;
};

export type CrewMember = {
  id: string;
  crew_id: string;
  device_id: string;
  warrior_name: string;
  rank_xp: number;
  streak_days: number;
  is_shieldmaiden: boolean;
  last_active: string;
};