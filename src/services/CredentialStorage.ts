import AsyncStorage from '@react-native-async-storage/async-storage';

// 存储键名
const STORAGE_KEYS = {
  SAVED_CREDENTIALS: '@saved_credentials',
  AUTO_LOGIN_ENABLED: '@auto_login_enabled',
  REMEMBER_PASSWORD: '@remember_password',
};

// 保存的登录凭据接口
export interface SavedCredentials {
  email: string;
  password: string;
  username?: string;
  lastLoginTime: string;
}

// 登录设置接口
export interface LoginSettings {
  autoLogin: boolean;
  rememberPassword: boolean;
  saveEmail: boolean;
}

class CredentialStorageService {
  // 默认设置
  private static DEFAULT_SETTINGS: LoginSettings = {
    autoLogin: false,
    rememberPassword: true,
    saveEmail: true,
  };

  // 保存登录凭据
  static async saveCredentials(
    email: string, 
    password: string, 
    username?: string,
    rememberPassword: boolean = true
  ): Promise<void> {
    try {
      if (!rememberPassword) {
        // 如果不记住密码，只保存邮箱
        const partialCredentials = {
          email,
          password: '',
          username: username || '',
          lastLoginTime: new Date().toISOString(),
        };
        await AsyncStorage.setItem(STORAGE_KEYS.SAVED_CREDENTIALS, JSON.stringify(partialCredentials));
        return;
      }

      const credentials: SavedCredentials = {
        email,
        password,
        username: username || '',
        lastLoginTime: new Date().toISOString(),
      };

      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_CREDENTIALS, JSON.stringify(credentials));
      console.log('登录凭据已保存');
    } catch (error) {
      console.error('保存登录凭据失败:', error);
    }
  }

  // 获取保存的登录凭据
  static async getSavedCredentials(): Promise<SavedCredentials | null> {
    try {
      const credentialsStr = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_CREDENTIALS);
      if (!credentialsStr) {
        return null;
      }

      const credentials: SavedCredentials = JSON.parse(credentialsStr);
      return credentials;
    } catch (error) {
      console.error('获取保存的登录凭据失败:', error);
      return null;
    }
  }

  // 清除保存的登录凭据
  static async clearSavedCredentials(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SAVED_CREDENTIALS);
      console.log('已清除保存的登录凭据');
    } catch (error) {
      console.error('清除登录凭据失败:', error);
    }
  }

  // 保存登录设置
  static async saveLoginSettings(settings: LoginSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTO_LOGIN_ENABLED, JSON.stringify(settings.autoLogin));
      await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_PASSWORD, JSON.stringify(settings.rememberPassword));
      console.log('登录设置已保存:', settings);
    } catch (error) {
      console.error('保存登录设置失败:', error);
    }
  }

  // 获取登录设置
  static async getLoginSettings(): Promise<LoginSettings> {
    try {
      const autoLoginStr = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_LOGIN_ENABLED);
      const rememberPasswordStr = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_PASSWORD);

      const autoLogin = autoLoginStr ? JSON.parse(autoLoginStr) : this.DEFAULT_SETTINGS.autoLogin;
      const rememberPassword = rememberPasswordStr ? JSON.parse(rememberPasswordStr) : this.DEFAULT_SETTINGS.rememberPassword;

      return {
        autoLogin,
        rememberPassword,
        saveEmail: true, // 总是保存邮箱
      };
    } catch (error) {
      console.error('获取登录设置失败:', error);
      return this.DEFAULT_SETTINGS;
    }
  }

  // 检查是否应该自动登录
  static async shouldAutoLogin(): Promise<boolean> {
    try {
      const settings = await this.getLoginSettings();
      const credentials = await this.getSavedCredentials();
      
      return settings.autoLogin && 
             credentials !== null && 
             credentials.email !== '' && 
             credentials.password !== '';
    } catch (error) {
      console.error('检查自动登录状态失败:', error);
      return false;
    }
  }

  // 更新最后登录时间
  static async updateLastLoginTime(): Promise<void> {
    try {
      const credentials = await this.getSavedCredentials();
      if (credentials) {
        credentials.lastLoginTime = new Date().toISOString();
        await AsyncStorage.setItem(STORAGE_KEYS.SAVED_CREDENTIALS, JSON.stringify(credentials));
      }
    } catch (error) {
      console.error('更新最后登录时间失败:', error);
    }
  }

  // 检查凭据是否过期（可选功能，比如30天后过期）
  static async isCredentialsExpired(expiryDays: number = 30): Promise<boolean> {
    try {
      const credentials = await this.getSavedCredentials();
      if (!credentials || !credentials.lastLoginTime) {
        return true;
      }

      const lastLoginTime = new Date(credentials.lastLoginTime);
      const now = new Date();
      const diffDays = (now.getTime() - lastLoginTime.getTime()) / (1000 * 60 * 60 * 24);

      return diffDays > expiryDays;
    } catch (error) {
      console.error('检查凭据过期状态失败:', error);
      return true;
    }
  }

  // 获取上次登录的邮箱（用于预填充）
  static async getLastEmail(): Promise<string> {
    try {
      const credentials = await this.getSavedCredentials();
      return credentials?.email || '';
    } catch (error) {
      console.error('获取上次登录邮箱失败:', error);
      return '';
    }
  }

  // 检查是否记住密码
  static async isPasswordRemembered(): Promise<boolean> {
    try {
      const settings = await this.getLoginSettings();
      const credentials = await this.getSavedCredentials();
      
      return settings.rememberPassword && 
             credentials !== null && 
             credentials.password !== '';
    } catch (error) {
      console.error('检查密码记住状态失败:', error);
      return false;
    }
  }
}

export { CredentialStorageService };
