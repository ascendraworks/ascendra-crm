import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          deal_value: number;
          stage: 'New' | 'Contacted' | 'Qualified' | 'Closed Won' | 'Closed Lost';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          deal_value?: number;
          stage?: 'New' | 'Contacted' | 'Qualified' | 'Closed Won' | 'Closed Lost';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          deal_value?: number;
          stage?: 'New' | 'Contacted' | 'Qualified' | 'Closed Won' | 'Closed Lost';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};

export type Lead = Database['public']['Tables']['leads']['Row'];
export type LeadInsert = Database['public']['Tables']['leads']['Insert'];
export type LeadUpdate = Database['public']['Tables']['leads']['Update'];