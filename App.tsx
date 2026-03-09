import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Button } from './src/components/common/Button';
import { Card } from './src/components/common/Card';
import { Input } from './src/components/common/Input';
import { authService, AuthUser, LoginCredentials, RegisterCredentials } from './src/services/AuthService';
import { CredentialStorageService } from './src/services/CredentialStorage';
import { HomeScreen } from './src/screens/HomeScreenSimple';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(true);
  const [autoLogin, setAutoLogin] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const settings = await CredentialStorageService.getLoginSettings();
      setAutoLogin(settings.autoLogin);
      setRememberPassword(settings.rememberPassword);

      const lastEmail = await CredentialStorageService.getLastEmail();
      if (lastEmail) {
        setEmail(lastEmail);
      }

      if (settings.rememberPassword) {
        const savedCredentials = await CredentialStorageService.getSavedCredentials();
        if (savedCredentials?.password) {
          setPassword(savedCredentials.password);
        }
      }

      if (settings.autoLogin) {
        const result = await Promise.race([
          authService.autoLogin(),
          new Promise<{ user: AuthUser | null; error: string | null }>(resolve =>
            setTimeout(() => resolve({ user: null, error: '自动登录超时' }), 4000)
          ),
        ]);

        if (result.user && !result.error) {
          setCurrentUser(result.user);
        }
      }
    } catch (error) {
      console.error('initialize app failed:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('提示', '请填写邮箱和密码');
      return;
    }

    setLoading(true);
    const credentials: LoginCredentials = { email, password };
    const { user, error } = await authService.login(credentials, rememberPassword);
    setLoading(false);

    if (error) {
      Alert.alert('登录失败', error);
      return;
    }

    await CredentialStorageService.saveLoginSettings({
      autoLogin,
      rememberPassword,
      saveEmail: true,
    });

    setCurrentUser(user);
  };

  const handleRegister = async () => {
    if (!email || !password || !username) {
      Alert.alert('提示', '请填写完整信息');
      return;
    }

    setLoading(true);
    const credentials: RegisterCredentials = { email, password, username };
    const { user, error } = await authService.register(credentials);
    setLoading(false);

    if (error) {
      Alert.alert('注册失败', error);
      return;
    }

    setCurrentUser(user);
  };

  const switchMode = () => {
    setIsLogin(prev => !prev);
    setPassword('');
    setUsername('');
  };

  const handleLogout = async () => {
    Alert.alert('退出登录', '是否同时清除保存的登录信息？', [
      {
        text: '保留信息',
        onPress: async () => {
          await authService.logout(false);
          setCurrentUser(null);
        },
      },
      {
        text: '清除信息',
        style: 'destructive',
        onPress: async () => {
          await authService.logout(true);
          setCurrentUser(null);
          setEmail('');
          setPassword('');
          setAutoLogin(false);
          setRememberPassword(true);
        },
      },
    ]);
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingTitle}>💕 恋爱记账本 💕</Text>
        <Text style={styles.loadingText}>正在加载...</Text>
      </View>
    );
  }

  if (currentUser) {
    return <HomeScreen user={currentUser} onLogout={handleLogout} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>💕 恋爱记账本 💕</Text>
        <Text style={styles.subtitle}>{isLogin ? '欢迎回来' : '创建账户'}</Text>

        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>{isLogin ? '登录账户' : '注册账户'}</Text>

          {!isLogin && (
            <Input
              label="用户名"
              placeholder="请输入用户名"
              value={username}
              onChangeText={setUsername}
            />
          )}

          <Input
            label="邮箱"
            placeholder="请输入邮箱"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="密码"
            placeholder="请输入密码"
            value={password}
            onChangeText={setPassword}
            isPassword
          />

          {isLogin && (
            <View style={styles.loginOptions}>
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>记住密码</Text>
                <Switch value={rememberPassword} onValueChange={setRememberPassword} />
              </View>

              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>自动登录</Text>
                <Switch value={autoLogin} onValueChange={setAutoLogin} />
              </View>
            </View>
          )}

          <Button title={isLogin ? '登录' : '注册'} onPress={isLogin ? handleLogin : handleRegister} loading={loading} />
          <Button
            title={isLogin ? '没有账号？点击注册' : '已有账号？点击登录'}
            variant="outline"
            onPress={switchMode}
            style={styles.switchButton}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFAF0',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF69B4',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 40,
  },
  formCard: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 24,
  },
  loginOptions: {
    marginVertical: 12,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  optionLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  switchButton: {
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF0F5',
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});
