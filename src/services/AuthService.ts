import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import { CredentialStorageService } from './CredentialStorage';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  username: string;
}

class SupabaseAuthService {
  private currentUser: AuthUser | null = null;

  constructor() {
    supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      this.currentUser = user ? this.mapSupabaseUser(user) : null;
    });
  }

  async login(
    credentials: LoginCredentials,
    rememberPassword: boolean = true
  ): Promise<{ user: AuthUser | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { user: null, error: 'Supabase 未配置。请设置 EXPO_PUBLIC_SUPABASE_URL 和 EXPO_PUBLIC_SUPABASE_ANON_KEY' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error || !data.user) {
      return { user: null, error: this.mapAuthError(error?.message || '登录失败') };
    }

    this.currentUser = this.mapSupabaseUser(data.user);

    try {
      await CredentialStorageService.saveCredentials(
        credentials.email,
        credentials.password,
        this.currentUser.username,
        rememberPassword
      );
      await CredentialStorageService.updateLastLoginTime();
    } catch (storageError) {
      console.error('保存登录凭据失败:', storageError);
    }

    return { user: this.currentUser, error: null };
  }

  async register(
    credentials: RegisterCredentials
  ): Promise<{ user: AuthUser | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { user: null, error: 'Supabase 未配置。请设置 EXPO_PUBLIC_SUPABASE_URL 和 EXPO_PUBLIC_SUPABASE_ANON_KEY' };
    }

    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          username: credentials.username,
        },
      },
    });

    if (error || !data.user) {
      return { user: null, error: this.mapAuthError(error?.message || '注册失败') };
    }

    await this.upsertProfile(data.user.id, credentials.username).catch(profileError => {
      console.error('创建用户资料失败:', profileError);
    });

    // Email 确认关闭时会直接返回 session；开启时 data.session 可能为空
    this.currentUser = this.mapSupabaseUser(data.user, credentials.username);
    return { user: this.currentUser, error: null };
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  async logout(clearSavedCredentials: boolean = false): Promise<void> {
    await supabase.auth.signOut();
    this.currentUser = null;

    if (clearSavedCredentials) {
      try {
        await CredentialStorageService.clearSavedCredentials();
      } catch (error) {
        console.error('清除保存的凭据失败:', error);
      }
    }
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  async autoLogin(): Promise<{ user: AuthUser | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { user: null, error: 'Supabase 未配置。请先完成环境变量配置' };
    }

    try {
      const shouldAuto = await CredentialStorageService.shouldAutoLogin();
      if (!shouldAuto) {
        return { user: null, error: '未启用自动登录或无保存的凭据' };
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!sessionError && sessionData.session?.user) {
        this.currentUser = this.mapSupabaseUser(sessionData.session.user);
        return { user: this.currentUser, error: null };
      }

      const savedCredentials = await CredentialStorageService.getSavedCredentials();
      if (!savedCredentials?.email || !savedCredentials.password) {
        return { user: null, error: '无有效的保存凭据' };
      }

      return this.login(
        {
          email: savedCredentials.email,
          password: savedCredentials.password,
        },
        true
      );
    } catch (error) {
      console.error('自动登录失败:', error);
      return { user: null, error: '自动登录失败' };
    }
  }

  async resetPassword(email: string): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase 未配置。请先完成环境变量配置' };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error ? this.mapAuthError(error.message) : null };
  }

  private mapSupabaseUser(user: SupabaseUser, fallbackUsername?: string): AuthUser {
    const metaUsername = (user.user_metadata?.username as string | undefined)?.trim();
    const username = metaUsername || fallbackUsername || user.email?.split('@')[0] || '用户';

    return {
      id: user.id,
      email: user.email || '',
      username,
      avatar_url: user.user_metadata?.avatar_url as string | undefined,
    };
  }

  private async upsertProfile(userId: string, username: string): Promise<void> {
    const { error } = await supabase.from('profiles').upsert(
      {
        id: userId,
        username,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      throw error;
    }
  }

  private mapAuthError(raw: string): string {
    if (raw.includes('Invalid login credentials')) return '邮箱或密码错误';
    if (raw.includes('Email not confirmed')) return '邮箱未验证，请先完成邮箱验证';
    if (raw.includes('User already registered')) return '该邮箱已被注册';
    if (raw.includes('Password should be at least')) return '密码长度不足';
    return raw;
  }
}

export const authService = new SupabaseAuthService();
export const AuthService = authService;
