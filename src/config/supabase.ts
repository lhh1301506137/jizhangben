import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  !supabaseUrl.includes('your-project.supabase.co') &&
  supabaseAnonKey !== 'your-anon-key';

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-key', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// 数据库类型定义
export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Couple {
  id: string;
  user1_id: string;
  user2_id: string;
  couple_name: string;
  anniversary?: string;
  invite_code: string;
  status: 'pending' | 'active' | 'inactive';
  created_at: string;
}

export interface MoodRecord {
  id: string;
  user_id: string;
  couple_id: string;
  date: string;
  mood_type: 'happy' | 'sad' | 'neutral' | 'excited' | 'angry';
  note?: string;
  emoji: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  couple_id?: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  description: string;
  date: string;
  created_at: string;
}

export interface CoupleWallet {
  id: string;
  couple_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  couple_id: string;
  title: string;
  description?: string;
  type: 'personal' | 'partner' | 'together';
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to?: string;
  due_date?: string;
  created_at: string;
}

export interface Photo {
  id: string;
  couple_id: string;
  url: string;
  caption?: string;
  is_shared: boolean;
  created_at: string;
}
