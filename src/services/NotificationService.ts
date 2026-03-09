import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const STORAGE_KEYS = {
  NOTIFICATION_SETTINGS: '@notification_settings',
  NOTIFICATION_PERMISSION: '@notification_permission',
};

export interface NotificationSettings {
  enabled: boolean;
  time: string;
  days: number[]; // 0-6, 0 = Sunday
  lastNotificationId?: string;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  time: '20:00',
  days: [1, 2, 3, 4, 5, 6, 0],
};

export class NotificationService {
  static async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('mood-reminders', {
          name: '心情提醒',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF69B4',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      const granted = finalStatus === 'granted';
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_PERMISSION, JSON.stringify(granted));
      return granted;
    } catch (error) {
      console.error('请求通知权限失败:', error);
      return false;
    }
  }

  static async getSettings(): Promise<NotificationSettings> {
    try {
      const settings = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      return settings ? JSON.parse(settings) : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('获取通知设置失败:', error);
      return DEFAULT_SETTINGS;
    }
  }

  static async saveSettings(settings: NotificationSettings): Promise<boolean> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(settings));
      await this.scheduleNotifications(settings);
      return true;
    } catch (error) {
      console.error('保存通知设置失败:', error);
      return false;
    }
  }

  static async scheduleNotifications(settings?: NotificationSettings): Promise<boolean> {
    try {
      await this.cancelAllNotifications();

      const notificationSettings = settings || (await this.getSettings());
      if (!notificationSettings.enabled) {
        return true;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      const [hours, minutes] = notificationSettings.time.split(':').map(Number);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return false;
      }

      if (Platform.OS === 'android') {
        const now = new Date();
        const next = new Date();
        next.setHours(hours, minutes, 0, 0);
        if (next.getTime() <= now.getTime()) {
          next.setDate(next.getDate() + 1);
        }

        const secondsUntilNext = Math.max(1, Math.floor((next.getTime() - now.getTime()) / 1000));
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '💕 心情记录提醒',
            body: '记录今天的心情，让爱情更甜蜜～',
            data: { type: 'mood_reminder' },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntilNext,
            repeats: true,
          },
        });

        await AsyncStorage.setItem(
          STORAGE_KEYS.NOTIFICATION_SETTINGS,
          JSON.stringify({ ...notificationSettings, lastNotificationId: notificationId })
        );
        return true;
      }

      const weekdays = notificationSettings.days
        .map(day => (day === 0 ? 1 : day + 1))
        .filter(day => day >= 1 && day <= 7);

      const notificationIds: string[] = [];
      for (const weekday of weekdays) {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '💕 心情记录提醒',
            body: '记录今天的心情，让爱情更甜蜜～',
            data: { type: 'mood_reminder' },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            weekday,
            hour: hours,
            minute: minutes,
            repeats: true,
          },
        });
        notificationIds.push(notificationId);
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATION_SETTINGS,
        JSON.stringify({ ...notificationSettings, lastNotificationId: notificationIds[0] })
      );

      return true;
    } catch (error) {
      console.warn('安排通知失败，忽略并继续运行:', error);
      return false;
    }
  }

  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('取消通知失败:', error);
    }
  }

  static async sendTestNotification(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💕 测试通知',
          body: '这是一条测试通知，用于验证通知设置。',
          data: { type: 'test' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2,
        },
      });

      return true;
    } catch (error) {
      console.error('发送测试通知失败:', error);
      return false;
    }
  }

  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('获取已安排通知失败:', error);
      return [];
    }
  }

  static async hasPermission(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('检查通知权限失败:', error);
      return false;
    }
  }

  static async initialize(): Promise<void> {
    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) {
        await this.requestPermissions();
      }

      const settings = await this.getSettings();
      if (settings.enabled) {
        await this.scheduleNotifications(settings);
      }
    } catch (error) {
      console.error('初始化通知服务失败:', error);
    }
  }

  static addNotificationResponseListener(handler: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(handler);
  }

  static addNotificationReceivedListener(handler: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(handler);
  }

  static formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? '下午' : '上午';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${period} ${displayHour}:${minutes}`;
  }

  static formatDays(days: number[]): string {
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    if (days.length === 7) {
      return '每天';
    }
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) {
      return '工作日';
    }
    if (days.length === 2 && days.includes(0) && days.includes(6)) {
      return '周末';
    }
    return days.map(day => dayNames[day] || '').filter(Boolean).join('、');
  }
}
