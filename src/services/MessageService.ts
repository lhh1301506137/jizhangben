import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealtimeChannel } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../config/supabase';
import { authService } from './AuthService';

const STORAGE_KEYS = {
  MESSAGE_SETTINGS: '@message_settings',
  LAST_READ_TS: '@message_last_read_ts',
  MESSAGE_CACHE: '@message_cache',
};

const getUserStorageKey = (baseKey: string, userId?: string): string => {
  if (!userId) return baseKey;
  return `${baseKey}_${userId}`;
};

export interface Message {
  id: string;
  date: string;
  content: string;
  emoji?: string;
  timestamp: number;
  authorName: string;
  isFromMe: boolean;
  readAt?: number;
}

export interface MessageSettings {
  enableNotifications: boolean;
  autoRead: boolean;
  showPreview: boolean;
}

const DEFAULT_SETTINGS: MessageSettings = {
  enableNotifications: true,
  autoRead: false,
  showPreview: true,
};

type MessageRow = {
  id: string;
  couple_id: string;
  sender_id: string;
  content: string;
  entry_date: string;
  created_at: string;
};

export class MessageService {
  static async sendMessage(date: string, content: string, emoji?: string): Promise<Message> {
    const { coupleInfo, currentUser } = await this.requireCoupleContext();

    if (!isSupabaseConfigured || !this.isUuid(coupleInfo.id)) {
      throw new Error('当前离线，仅可查看历史留言，发送需联网');
    }

    const finalContent = emoji ? `${emoji} ${content}` : content;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          couple_id: coupleInfo.id,
          sender_id: currentUser.id,
          content: finalContent,
          entry_date: date,
        })
        .select('id,couple_id,sender_id,content,entry_date,created_at')
        .single();

      if (error || !data) {
        throw error || new Error('发送留言失败');
      }

      const message = this.mapRowToMessage(data as MessageRow, currentUser.id, coupleInfo.myName, coupleInfo.partnerName);
      const cached = await this.getLocalMessages(currentUser.id, coupleInfo.id);
      cached.push(message);
      await this.setLocalMessages(currentUser.id, coupleInfo.id, cached);
      return message;
    } catch {
      throw new Error('当前网络不可用，发送需联网');
    }
  }

  static async getMyMessages(): Promise<Message[]> {
    const messages = await this.getRecentMessages(200);
    return messages.filter(message => message.isFromMe);
  }

  static async getPartnerMessages(): Promise<Message[]> {
    const messages = await this.getRecentMessages(200);
    return messages.filter(message => !message.isFromMe);
  }

  static async getMessagesByDate(date: string): Promise<Message[]> {
    const messages = await this.fetchMessages();
    return messages.filter(message => message.date === date).sort((a, b) => a.timestamp - b.timestamp);
  }

  static async getRecentMessages(limit: number = 50): Promise<Message[]> {
    const messages = await this.fetchMessages();
    const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);
    return sorted.slice(Math.max(sorted.length - limit, 0));
  }

  static async markMessageAsRead(_messageId: string): Promise<boolean> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return false;

      const storageKey = getUserStorageKey(STORAGE_KEYS.LAST_READ_TS, currentUser.id);
      await AsyncStorage.setItem(storageKey, Date.now().toString());
      return true;
    } catch (error) {
      console.error('标记留言已读失败:', error);
      return false;
    }
  }

  static async getUnreadCount(): Promise<number> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return 0;

      const messages = await this.getPartnerMessages();
      const storageKey = getUserStorageKey(STORAGE_KEYS.LAST_READ_TS, currentUser.id);
      const lastReadTsStr = await AsyncStorage.getItem(storageKey);
      const lastReadTs = lastReadTsStr ? Number(lastReadTsStr) : 0;

      if (!lastReadTsStr) {
        const latestPartnerTs = messages.length > 0 ? Math.max(...messages.map(m => m.timestamp)) : Date.now();
        await AsyncStorage.setItem(storageKey, latestPartnerTs.toString());
        return 0;
      }

      return messages.filter(message => message.timestamp > lastReadTs).length;
    } catch (error) {
      console.error('获取未读留言数量失败:', error);
      return 0;
    }
  }

  static async deleteMessage(messageId: string): Promise<boolean> {
    try {
      if (!isSupabaseConfigured) return false;
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return false;

      const { error } = await supabase.from('messages').delete().eq('id', messageId);
      if (error) throw error;

      const context = await this.tryGetCoupleContext();
      if (context) {
        const local = await this.getLocalMessages(currentUser.id, context.coupleInfo.id);
        await this.setLocalMessages(currentUser.id, context.coupleInfo.id, local.filter(item => item.id !== messageId));
      }
      return true;
    } catch (error) {
      console.error('删除留言失败:', error);
      return false;
    }
  }

  static async getSettings(): Promise<MessageSettings> {
    try {
      const settings = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGE_SETTINGS);
      return settings ? JSON.parse(settings) : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('获取留言设置失败:', error);
      return DEFAULT_SETTINGS;
    }
  }

  static async updateSettings(settings: MessageSettings): Promise<boolean> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MESSAGE_SETTINGS, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('更新留言设置失败:', error);
      return false;
    }
  }

  static async checkAndReceivePendingMessages(): Promise<void> {
    return;
  }

  static async simulateReceiveMessage(content: string, emoji?: string, date?: string): Promise<Message> {
    const today = date || new Date().toISOString().split('T')[0];
    return {
      id: `sim_${Date.now()}`,
      date: today,
      content,
      emoji,
      timestamp: Date.now(),
      authorName: '模拟伙伴',
      isFromMe: false,
    };
  }

  static async simulatePartnerMessages(): Promise<void> {
    return;
  }

  static async searchMessages(keyword: string): Promise<Message[]> {
    const allMessages = await this.getRecentMessages(500);
    const lowerKeyword = keyword.toLowerCase();
    return allMessages
      .filter(
        message =>
          message.content.toLowerCase().includes(lowerKeyword) ||
          message.authorName.toLowerCase().includes(lowerKeyword)
      )
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  static async getMessageStats(): Promise<{
    totalMessages: number;
    myMessagesCount: number;
    partnerMessagesCount: number;
    todayMessages: number;
    unreadCount: number;
  }> {
    try {
      const myMessages = await this.getMyMessages();
      const partnerMessages = await this.getPartnerMessages();
      const today = new Date().toISOString().split('T')[0];
      const todayMessages = [...myMessages, ...partnerMessages].filter(message => message.date === today).length;
      const unreadCount = await this.getUnreadCount();

      return {
        totalMessages: myMessages.length + partnerMessages.length,
        myMessagesCount: myMessages.length,
        partnerMessagesCount: partnerMessages.length,
        todayMessages,
        unreadCount,
      };
    } catch (error) {
      console.error('获取留言统计失败:', error);
      return {
        totalMessages: 0,
        myMessagesCount: 0,
        partnerMessagesCount: 0,
        todayMessages: 0,
        unreadCount: 0,
      };
    }
  }

  static async clearAllMessages(): Promise<void> {
    try {
      const context = await this.tryGetCoupleContext();
      if (!context) return;

      await this.setLocalMessages(context.currentUser.id, context.coupleInfo.id, []);

      if (!isSupabaseConfigured || !this.isUuid(context.coupleInfo.id)) return;

      const { error } = await supabase.from('messages').delete().eq('couple_id', context.coupleInfo.id);
      if (error) throw error;
    } catch (error) {
      console.error('清空留言数据失败:', error);
    }
  }

  static async subscribeToCoupleMessages(onMessage: (message: Message) => void): Promise<() => void> {
    const context = await this.tryGetCoupleContext();
    if (!context || !isSupabaseConfigured || !this.isUuid(context.coupleInfo.id)) {
      return () => {};
    }

    const channelName = `messages_${context.coupleInfo.id}_${context.currentUser.id}`;
    const channel: RealtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `couple_id=eq.${context.coupleInfo.id}`,
        },
        payload => {
          const row = payload.new as MessageRow;
          const message = this.mapRowToMessage(row, context.currentUser.id, context.coupleInfo.myName, context.coupleInfo.partnerName);
          onMessage(message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  private static async fetchMessages(): Promise<Message[]> {
    const context = await this.tryGetCoupleContext();
    if (!context) return [];

    const localMessages = await this.getLocalMessages(context.currentUser.id, context.coupleInfo.id);

    if (!isSupabaseConfigured || !this.isUuid(context.coupleInfo.id)) {
      return localMessages;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id,couple_id,sender_id,content,entry_date,created_at')
        .eq('couple_id', context.coupleInfo.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const rows = (data || []) as MessageRow[];
      const remoteMessages = rows.map(row =>
        this.mapRowToMessage(row as MessageRow, context.currentUser.id, context.coupleInfo.myName, context.coupleInfo.partnerName)
      );

      await this.setLocalMessages(context.currentUser.id, context.coupleInfo.id, remoteMessages);
      return remoteMessages;
    } catch {
      return localMessages;
    }
  }

  private static async requireCoupleContext(): Promise<{
    coupleInfo: { id: string; myName: string; partnerName: string };
    currentUser: { id: string };
  }> {
    const context = await this.tryGetCoupleContext();
    if (!context) {
      throw new Error('未连接到伙伴');
    }
    return {
      coupleInfo: context.coupleInfo,
      currentUser: context.currentUser,
    };
  }

  private static async tryGetCoupleContext(): Promise<{
    coupleInfo: { id: string; myName: string; partnerName: string };
    currentUser: { id: string };
  } | null> {
    const currentUser = await this.resolveCurrentUser();
    if (!currentUser) return null;

    const coupleInfo = await this.getCoupleInfoSafe();
    if (!coupleInfo?.isConnected) return null;

    return {
      coupleInfo: {
        id: coupleInfo.id,
        myName: coupleInfo.myName,
        partnerName: coupleInfo.partnerName,
      },
      currentUser: { id: currentUser.id },
    };
  }

  private static async getCoupleInfoSafe(): Promise<any | null> {
    try {
      const { CoupleService } = await import('./CoupleService');
      return await this.withTimeout(CoupleService.getCoupleInfo(), 1200);
    } catch {
      try {
        const raw = await AsyncStorage.getItem('@couple_info');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
  }

  private static async resolveCurrentUser(): Promise<{ id: string; username?: string } | null> {
    const inMemoryUser = authService.getCurrentUser();
    if (inMemoryUser?.id) {
      return { id: inMemoryUser.id, username: inMemoryUser.username };
    }

    if (!isSupabaseConfigured) return null;

    try {
      const { data, error } = await this.withTimeout(supabase.auth.getUser(), 1200);
      if (error || !data?.user?.id) return null;
      return {
        id: data.user.id,
        username:
          (data.user.user_metadata?.username as string | undefined) ||
          data.user.email?.split('@')[0],
      };
    } catch {
      return null;
    }
  }

  private static isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private static mapRowToMessage(
    row: MessageRow,
    currentUserId: string,
    myName: string,
    partnerName: string
  ): Message {
    const isFromMe = row.sender_id === currentUserId;
    const content = row.content || '';
    const emojiMatch = content.match(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation})\s/u);
    const emoji = emojiMatch ? emojiMatch[0].trim() : undefined;
    const pureContent = emoji ? content.replace(`${emoji} `, '') : content;

    return {
      id: row.id,
      date: row.entry_date,
      content: pureContent,
      emoji,
      timestamp: new Date(row.created_at).getTime(),
      authorName: isFromMe ? myName : partnerName,
      isFromMe,
    };
  }

  private static getCacheKey(base: string, userId: string, coupleId: string): string {
    return `${base}_${userId}_${coupleId}`;
  }

  private static async getLocalMessages(userId: string, coupleId: string): Promise<Message[]> {
    const key = this.getCacheKey(STORAGE_KEYS.MESSAGE_CACHE, userId, coupleId);
    const value = await AsyncStorage.getItem(key);
    if (!value) return [];
    const messages = JSON.parse(value) as Message[];
    return [...messages].sort((a, b) => a.timestamp - b.timestamp);
  }

  private static async setLocalMessages(userId: string, coupleId: string, messages: Message[]): Promise<void> {
    const key = this.getCacheKey(STORAGE_KEYS.MESSAGE_CACHE, userId, coupleId);
    const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);
    await AsyncStorage.setItem(key, JSON.stringify(sorted));
  }

  private static async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
}
