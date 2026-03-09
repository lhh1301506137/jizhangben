import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { Colors, FontSizes, Spacing } from '../constants/Colors';
import { Card } from '../components/common/Card';
import { MoodCalendar } from '../components/calendar/MoodCalendar';
import { MoodAnalyticsScreen } from './MoodAnalyticsScreen';
import { NotificationSettings } from '../components/settings/NotificationSettings';
import { CoupleSetup } from '../components/couple/CoupleSetup';
import { MessageBoard } from '../components/couple/MessageBoard';
import { PlanManager } from '../components/couple/PlanManager';
import { DisconnectConfirm } from '../components/couple/DisconnectConfirm';
import { AccountingScreen } from './AccountingScreen';
import { CoupleAccountingScreen } from './CoupleAccountingScreen';
import { AuthUser } from '../services/AuthService';
import { CoupleAccountingService } from '../services/CoupleAccountingService';
import { NotificationService } from '../services/NotificationService';
import { CoupleService, CoupleInfo } from '../services/CoupleService';
import { MessageService } from '../services/MessageService';
import { PlanService } from '../services/PlanService';
import { AccountingService } from '../services/AccountingService';
import { CoupleTransactionType } from '../types/CoupleAccounting';

interface HomeScreenProps {
  user: AuthUser;
  onLogout: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ user, onLogout }) => {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'analytics'>('home');
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showCoupleSetup, setShowCoupleSetup] = useState(false);
  const [showMessageBoard, setShowMessageBoard] = useState(false);
  const [showPlanManager, setShowPlanManager] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showAccountingScreen, setShowAccountingScreen] = useState(false);
  const [showCoupleAccountingScreen, setShowCoupleAccountingScreen] = useState(false);
  const [coupleInfo, setCoupleInfo] = useState<CoupleInfo | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadPlanCount, setUnreadPlanCount] = useState(0);
  const [unreadAccountingCount, setUnreadAccountingCount] = useState(0);
  const [coupleAccountId, setCoupleAccountId] = useState<string | null>(null);
  const [accountingStats, setAccountingStats] = useState<any>(null);
  const [coupleAccountingStats, setCoupleAccountingStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [userSwitchKey, setUserSwitchKey] = useState(0); // 鐢ㄤ簬寮哄埗閲嶆柊娓叉煋缁勪欢

  useEffect(() => {
    initializeServices();
    loadCoupleInfo();
  }, []);

  useEffect(() => {
    if (!coupleInfo?.isConnected) {
      return;
    }

    const timer = setInterval(() => {
      refreshCoupleCounters();
    }, 5000);

    return () => clearInterval(timer);
  }, [coupleInfo?.id, showMessageBoard]);

  const initializeServices = async () => {
    NotificationService.initialize().catch(error => {
      console.warn('notification init skipped:', error);
    });
    await CoupleAccountingService.initialize();
  };

  const loadCoupleInfo = async () => {
    const info = await CoupleService.getCoupleInfo();
    setCoupleInfo(info);

    const tasks: Promise<any>[] = [loadAccountingStats()];

    if (info?.isConnected) {
      tasks.push(
        (async () => {
          await MessageService.checkAndReceivePendingMessages();
          const unreadCount = await MessageService.getUnreadCount();
          setUnreadMessageCount(unreadCount);
        })()
      );

      tasks.push(
        (async () => {
          const unreadPlans = await PlanService.getUnreadCount();
          setUnreadPlanCount(unreadPlans);
        })()
      );

      tasks.push(loadCoupleAccountingStats(info));

      // 示例计划不阻塞首屏加载
      PlanService.createSamplePlans().catch(error => {
        console.warn('create sample plans skipped:', error);
      });
    } else {
      setUnreadMessageCount(0);
      setUnreadPlanCount(0);
      setUnreadAccountingCount(0);
      setCoupleAccountingStats(null);
      setCoupleAccountId(null);
    }

    await Promise.allSettled(tasks);
  };

  const refreshCoupleCounters = async () => {
    if (!coupleInfo?.isConnected) {
      return;
    }

    try {
      const [unreadCount, unreadPlans] = await Promise.all([
        MessageService.getUnreadCount(),
        PlanService.getUnreadCount(),
      ]);
      setUnreadMessageCount(unreadCount);
      setUnreadPlanCount(unreadPlans);

      if (coupleInfo?.id) {
        const account = await CoupleAccountingService.getCoupleAccount(coupleInfo.id);
        if (account) {
          const unreadAccounting = await CoupleAccountingService.getUnreadCount(account.id);
          setUnreadAccountingCount(unreadAccounting);
          const latestStats = await CoupleAccountingService.getAccountStats(account.id);
          setCoupleAccountingStats(latestStats);
        }
      }
    } catch (error) {
      console.error('refresh couple counters failed:', error);
    }
  };

  const loadAccountingStats = async () => {
    try {
      await AccountingService.initializeCategories();
      const stats = await AccountingService.getStatistics();
      setAccountingStats(stats);
      if (stats.recordCount === 0) {
        await AccountingService.createSampleData();
        const newStats = await AccountingService.getStatistics();
        setAccountingStats(newStats);
      }

      // 妫€鏌ュ苟鍒涘缓蹇冩儏娴嬭瘯鏁版嵁
      const { MoodStorage } = await import('../services/MoodStorage');
      const moodRecords = await MoodStorage.getAllMoodRecords();
      if (moodRecords.length === 0) {
        await MoodStorage.createTestMoodData();
        console.log('Mood test data initialized');
      }
    } catch (error) {
      console.error('加载记账统计失败:', error);
    }
  };

  const loadCoupleAccountingStats = async (infoOverride?: CoupleInfo | null) => {
    try {
      const currentCoupleInfo = infoOverride ?? coupleInfo;
      if (currentCoupleInfo?.isConnected) {
        const account = await CoupleAccountingService.getCoupleAccount(currentCoupleInfo.id);
        if (account) {
          setCoupleAccountId(account.id);
          const stats = await CoupleAccountingService.getAccountStats(account.id);
          setCoupleAccountingStats(stats);
          const unreadAccounting = await CoupleAccountingService.getUnreadCount(account.id);
          setUnreadAccountingCount(unreadAccounting);
        } else {
          // 如果没有共同账户，创建一个
          const newAccount = await CoupleAccountingService.createCoupleAccount(currentCoupleInfo.id);
          setCoupleAccountId(newAccount.id);
          const stats = await CoupleAccountingService.getAccountStats(newAccount.id);
          setCoupleAccountingStats(stats);
          setUnreadAccountingCount(0);
        }
      } else {
        setCoupleAccountingStats(null);
        setCoupleAccountId(null);
        setUnreadAccountingCount(0);
      }
    } catch (error) {
      console.error('加载共同记账统计失败:', error);
      setCoupleAccountingStats(null);
    }
  };

  const handleMoodSelect = (date: string, mood: string) => {
    console.log('选择心情:', date, mood);
  };

  const handleAnalyticsPress = () => {
    setCurrentScreen('analytics');
  };

  const handleCoupleSetupComplete = () => {
    setShowCoupleSetup(false);
    loadCoupleInfo();
  };

  const handleTestCouple = async () => {
    try {
      await CoupleService.createTestCouple();
      Alert.alert('配对成功', '已创建测试配对，现在可以使用共同记账功能');
      await loadCoupleInfo();
    } catch (error) {
      console.error('创建测试配对失败:', error);
      Alert.alert('提示', error instanceof Error ? error.message : '请使用邀请码完成配对');
    }
  };

  // 重置并创建新的测试配对
  const handleResetAndCreateTestPairing = async () => {
    Alert.alert(
      '重置测试配对',
      '这将清空当前配对数据并创建新的测试配对，确认继续吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认重置',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              // 鍏堟柇寮€褰撳墠杩炴帴骞跺垹闄ゆ墍鏈夋暟鎹?              await CoupleService.disconnect('delete_all');

              // 娓呯┖鍏卞悓璁拌处鏁版嵁
              await CoupleAccountingService.clearAllData();

              // 娓呯┖涓汉璁拌处鏁版嵁
              await AccountingService.clearAllData();

              // 娓呯┖蹇冩儏鏁版嵁
              const { MoodStorage } = await import('../services/MoodStorage');
              await MoodStorage.clearAllMoodRecords();

              // 娓呯┖鐣欒█鏁版嵁
              const { MessageService } = await import('../services/MessageService');
              await MessageService.clearAllMessages();

              // 閲嶆柊鍒涘缓涓汉璁拌处鏁版嵁锛堟牴鎹綋鍓嶇敤鎴凤級
              await AccountingService.createSampleData();
              await AccountingService.createExtendedTestData();

              // 閲嶆柊鍒涘缓蹇冩儏鏁版嵁锛堟牴鎹綋鍓嶇敤鎴凤級
              await MoodStorage.createTestMoodData();

              // 閲嶆柊鍔犺浇涓汉璁拌处缁熻
              await loadAccountingStats();

              // 閲嶆柊鍒涘缓娴嬭瘯閰嶅
              const coupleInfo = await CoupleService.createTestCouple();
              setCoupleInfo(coupleInfo);

              // 妯℃嫙浼欎即鏁版嵁
              await CoupleService.simulatePartnerData();

              // 鍒涘缓娴嬭瘯鐨勫叡鍚岃璐︽暟鎹?              await createTestAccountingData(coupleInfo);

              Alert.alert('重置成功', `已重新创建与 ${coupleInfo.partnerName} 的测试配对，个人记账数据也已重建`);
            } catch (error) {
              console.error('重置测试配对失败:', error);
              Alert.alert('重置失败', error instanceof Error ? error.message : '未知错误');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // 閲嶇疆涓汉璁拌处鏁版嵁
  const handleResetPersonalAccounting = async () => {
    Alert.alert(
      '重置个人记账数据',
      '这将清空当前用户的个人记账数据并重新创建，确认继续吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认重置',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              // 娓呯┖涓汉璁拌处鏁版嵁
              await AccountingService.clearAllData();

              // 娓呯┖蹇冩儏鏁版嵁
              const { MoodStorage } = await import('../services/MoodStorage');
              await MoodStorage.clearAllMoodRecords();

              // 娓呯┖鐣欒█鏁版嵁
              const { MessageService } = await import('../services/MessageService');
              await MessageService.clearAllMessages();

              // 閲嶆柊鍒涘缓涓汉璁拌处鏁版嵁锛堟牴鎹綋鍓嶇敤鎴凤級
              await AccountingService.createSampleData();
              await AccountingService.createExtendedTestData();

              // 閲嶆柊鍒涘缓蹇冩儏鏁版嵁锛堟牴鎹綋鍓嶇敤鎴凤級
              await MoodStorage.createTestMoodData();

              // 閲嶆柊鍔犺浇涓汉璁拌处缁熻
              await loadAccountingStats();

              Alert.alert('重置成功', '个人记账数据已重新创建');
            } catch (error) {
              console.error('閲嶇疆涓汉璁拌处鏁版嵁澶辫触:', error);
              Alert.alert('重置失败', error instanceof Error ? error.message : '未知错误');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // 创建测试的共同记账数据
  const createTestAccountingData = async (coupleInfo: CoupleInfo) => {
    try {
      // 鍒涘缓鍏卞悓璐︽埛
      const account = await CoupleAccountingService.createCoupleAccount(coupleInfo.id);

      // 添加一些测试交易记录
      const testTransactions = [
        {
          type: CoupleTransactionType.DEPOSIT,
          amount: 1000,
          description: '初始资金',
          category: '转入'
        },
        {
          type: CoupleTransactionType.WITHDRAW,
          amount: 200,
          description: '约会晚餐',
          category: '餐饮'
        },
        {
          type: CoupleTransactionType.WITHDRAW,
          amount: 150,
          description: '电影票',
          category: '娱乐'
        }
      ];

      for (const transaction of testTransactions) {
        await CoupleAccountingService.createTransactionRequest(
          account.id,
          transaction.type,
          transaction.amount,
          transaction.description,
          transaction.category
        );
      }

      console.log('测试记账数据创建完成');
    } catch (error) {
      console.error('创建测试记账数据失败:', error);
    }
  };

  if (currentScreen === 'analytics') {
    return (
      <MoodAnalyticsScreen
        onBack={() => setCurrentScreen('home')}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 娆㈣繋鍗＄墖 */}
        <Card style={styles.welcomeCard}>
          <View style={styles.welcomeHeader}>
            <Text style={styles.welcomeText}>你好，{user.username}！</Text>
            <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
              <Text style={styles.logoutButtonText}>登出</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.welcomeSubtext}>今天心情如何？</Text>
        </Card>

        {/* 璁拌处鍔熻兘鍗＄墖 */}
        <Card style={styles.statsCard}>
          <TouchableOpacity
            style={styles.statsHeader}
            onPress={() => setShowAccountingScreen(true)}
          >
            <Text style={styles.statsTitle}>个人记账</Text>
            <Text style={styles.detailButtonText}>查看详情 {'>'}</Text>
          </TouchableOpacity>
          
          {accountingStats && (
            <View style={styles.statsContent}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>¥{accountingStats.totalIncome.toLocaleString()}</Text>
                <Text style={styles.statLabel}>总收入</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>¥{accountingStats.totalExpense.toLocaleString()}</Text>
                <Text style={styles.statLabel}>总支出</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{accountingStats.recordCount}</Text>
                <Text style={styles.statLabel}>记录数</Text>
              </View>
            </View>
          )}

          {/* 閲嶇疆涓汉璁拌处鏁版嵁鎸夐挳 */}
          <TouchableOpacity
            style={styles.resetPersonalButton}
            onPress={handleResetPersonalAccounting}
          >
            <Text style={styles.resetPersonalButtonText}>重置个人记账数据</Text>
          </TouchableOpacity>

        </Card>

        {/* 鍏卞悓璁拌处鍔熻兘鍗＄墖 */}
        {coupleInfo?.isConnected && (
          <Card style={styles.statsCard}>
            <TouchableOpacity
              style={styles.statsHeader}
              onPress={async () => {
                if (coupleAccountId) {
                  await CoupleAccountingService.markAccountAsRead(coupleAccountId);
                  setUnreadAccountingCount(0);
                }
                setShowCoupleAccountingScreen(true);
              }}
            >
              <Text style={styles.statsTitle}>共同记账</Text>
              <View style={styles.detailBadgeWrap}>
                <Text style={styles.detailButtonText}>查看详情 {'>'}</Text>
                {unreadAccountingCount > 0 && (
                  <View style={styles.detailUnreadBadge}>
                    <Text style={styles.detailUnreadBadgeText}>
                      {unreadAccountingCount > 99 ? '99+' : unreadAccountingCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {coupleAccountingStats && (
              <View style={styles.statsContent}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>¥{coupleAccountingStats.totalBalance.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>共同余额</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>¥{coupleAccountingStats.myContribution.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>我的贡献</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{coupleAccountingStats.pendingApprovals}</Text>
                  <Text style={styles.statLabel}>待审批</Text>
                </View>
              </View>
            )}
          </Card>
        )}

        {/* 蹇冩儏鏃ュ巻 */}
        <MoodCalendar
          key={`mood-calendar-${userSwitchKey}`}
          onMoodSelect={handleMoodSelect}
          onAnalyticsPress={handleAnalyticsPress}
        />

        {/* 鎯呬荆鐘舵€佸崱鐗?*/}
        <Card style={styles.coupleCard}>
          <View style={styles.coupleHeader}>
            <Text style={styles.coupleTitle}>💕 情侣状态</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => setShowNotificationSettings(true)}
              >
                <Text style={styles.settingsButtonText}>⚙</Text>
              </TouchableOpacity>
              {coupleInfo?.isConnected && (
                <TouchableOpacity
                  style={styles.disconnectButton}
                  onPress={() => {
                    console.log('鐐瑰嚮瑙ｉ櫎閰嶅鎸夐挳');
                    setShowDisconnectConfirm(true);
                  }}
                >
                  <Text style={styles.disconnectButtonText}>💔</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {coupleInfo?.isConnected ? (
            <View style={styles.coupleConnected}>
              <Text style={styles.coupleConnectedText}>
                已与 {coupleInfo.partnerName} 连接
              </Text>
              <Text style={styles.coupleConnectedSubtext}>
                邀请码: {coupleInfo.inviteCode}
              </Text>
              
              <View style={styles.coupleButtonsContainer}>
                                <TouchableOpacity
                  style={[styles.coupleButton, styles.messageBoardButton]}
                  onPress={() => setShowMessageBoard(true)}
                >
                  <Text style={styles.coupleButtonText}>留言板</Text>
                  {unreadMessageCount > 0 && (
                    <View style={styles.unreadBadgeBubble}>
                      <Text style={styles.unreadBadgeText}>
                        {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.coupleButton, styles.planManagerButton]}
                  onPress={async () => {
                    await PlanService.markPlansAsRead();
                    setUnreadPlanCount(0);
                    setShowPlanManager(true);
                  }}
                >
                  <Text style={styles.coupleButtonText}>共同计划</Text>
                  {unreadPlanCount > 0 && (
                    <View style={styles.planUnreadBadge}>
                      <Text style={styles.planUnreadBadgeText}>
                        {unreadPlanCount > 99 ? '99+' : unreadPlanCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.coupleButton, styles.disconnectButtonLarge]}
                  onPress={() => {
                    console.log('click disconnect button');
                    Alert.alert(
                      '解除配对',
                      '确定要解除配对吗？\n\n请选择数据处理方式：',
                      [
                        { text: '取消', style: 'cancel' },
                        {
                          text: '保留所有数据',
                          onPress: async () => {
                            try {
                              const success = await CoupleService.disconnect('keep_all');
                              if (success) {
                                setCoupleInfo(null);
                                setUnreadMessageCount(0);
                                setUnreadPlanCount(0);
                                setUnreadAccountingCount(0);
                                Alert.alert('解除成功', '已解除配对，并保留所有数据');
                              }
                            } catch (error) {
                              Alert.alert('解除失败', '请重试');
                            }
                          }
                        },
                        {
                          text: '仅保留我的数据',
                          onPress: async () => {
                            try {
                              const success = await CoupleService.disconnect('keep_mine_only');
                              if (success) {
                                setCoupleInfo(null);
                                setUnreadMessageCount(0);
                                setUnreadPlanCount(0);
                                setUnreadAccountingCount(0);
                                Alert.alert('解除成功', '已解除配对，仅保留你的数据');
                              }
                            } catch (error) {
                              Alert.alert('解除失败', '请重试');
                            }
                          }
                        },
                        {
                          text: '删除所有数据',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              const success = await CoupleService.disconnect('delete_all');
                              if (success) {
                                setCoupleInfo(null);
                                setUnreadMessageCount(0);
                                setUnreadPlanCount(0);
                                setUnreadAccountingCount(0);
                                Alert.alert('解除成功', '已解除配对，并删除所有数据');
                              }
                            } catch (error) {
                              Alert.alert('解除失败', '请重试');
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={styles.disconnectButtonLargeText}>
                    💔 解除配对
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleResetAndCreateTestPairing}
                >
                  <Text style={styles.resetButtonText}>重置测试配对</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.setupButtonContainer}>
              <TouchableOpacity
                style={styles.coupleSetupButton}
                onPress={() => setShowCoupleSetup(true)}
              >
                <Text style={styles.coupleSetupText}>开始情侣配对</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.testCoupleButton}
                onPress={handleTestCouple}
              >
                <Text style={styles.testCoupleText}>快速测试配对</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      </ScrollView>

      {/* 閫氱煡璁剧疆妯℃€佹 */}
      <NotificationSettings
        visible={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />

      {/* 鎯呬荆閰嶅妯℃€佹 */}
      <CoupleSetup
        visible={showCoupleSetup}
        onComplete={handleCoupleSetupComplete}
        onCancel={() => setShowCoupleSetup(false)}
      />

      {/* 鐣欒█鏉挎ā鎬佹 */}
      <MessageBoard
        visible={showMessageBoard}
        onClose={() => {
          setShowMessageBoard(false);
          loadCoupleInfo();
        }}
      />

      {/* 璁″垝绠＄悊妯℃€佹 */}
      <PlanManager
        visible={showPlanManager}
        onClose={() => {
          setShowPlanManager(false);
          loadCoupleInfo();
        }}
      />

      {/* 瑙ｉ櫎閰嶅纭妯℃€佹 */}
      {showDisconnectConfirm && (
        <DisconnectConfirm
          visible={showDisconnectConfirm}
          partnerName={coupleInfo?.partnerName || '伙伴'}
          onConfirm={() => {
            console.log('瑙ｉ櫎閰嶅纭');
            setShowDisconnectConfirm(false);
            setCoupleInfo(null);
            setUnreadMessageCount(0);
            setUnreadPlanCount(0);
            setUnreadAccountingCount(0);
            Alert.alert('解除成功', '已成功解除情侣配对');
          }}
          onCancel={() => {
            console.log('鍙栨秷瑙ｉ櫎閰嶅');
            setShowDisconnectConfirm(false);
          }}
        />
      )}

      {/* 璁拌处鍔熻兘妯℃€佹 */}
      <Modal
        visible={showAccountingScreen}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.accountingModalContainer}>
          <View style={styles.accountingModalHeader}>
            <TouchableOpacity
              style={styles.accountingCloseButton}
              onPress={() => {
                setShowAccountingScreen(false);
                loadAccountingStats();
              }}
            >
              <Text style={styles.accountingCloseText}>‹ 返回</Text>
            </TouchableOpacity>
            <Text style={styles.accountingModalTitle}>个人记账</Text>
            <View style={styles.accountingPlaceholder} />
          </View>
          <AccountingScreen />
        </View>
      </Modal>

      {/* 鍏卞悓璁拌处鍔熻兘妯℃€佹 */}
      <Modal
        visible={showCoupleAccountingScreen}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <CoupleAccountingScreen
          onBack={() => {
            setShowCoupleAccountingScreen(false);
            loadCoupleAccountingStats();
          }}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  welcomeCard: {
    marginBottom: Spacing.md,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  welcomeText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  logoutButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
  },
  logoutButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  welcomeSubtext: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  statsCard: {
    marginBottom: Spacing.md,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statsTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  detailButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  detailBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailUnreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  detailUnreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  coupleCard: {
    marginBottom: Spacing.md,
  },
  coupleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  coupleTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsButton: {
    padding: Spacing.xs,
    marginRight: Spacing.xs,
  },
  settingsButtonText: {
    fontSize: FontSizes.lg,
  },
  disconnectButton: {
    padding: Spacing.xs,
  },
  disconnectButtonText: {
    fontSize: FontSizes.lg,
  },
  coupleConnected: {
    alignItems: 'center',
  },
  coupleConnectedText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  coupleConnectedSubtext: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  coupleButtonsContainer: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  coupleButton: {
    borderRadius: 8,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minWidth: 220,
  },
  messageBoardButton: {
    backgroundColor: Colors.primary,
  },
  planManagerButton: {
    backgroundColor: '#4CAF50',
  },
  coupleButtonText: {
    fontSize: FontSizes.md,
    color: Colors.surface,
    fontWeight: '600',
  },
  unreadBadgeBubble: {
    position: 'absolute',
    right: 10,
    top: '50%',
    marginTop: -10,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
  planUnreadBadge: {
    position: 'absolute',
    right: 10,
    top: '50%',
    marginTop: -10,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  planUnreadBadgeText: {
    color: '#FFFFFF',
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
  coupleSetupButton: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  coupleSetupText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '600',
  },
  setupButtonContainer: {
    gap: Spacing.sm,
  },
  testCoupleButton: {
    backgroundColor: Colors.success,
    borderRadius: 8,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  testCoupleText: {
    fontSize: FontSizes.sm,
    color: Colors.surface,
    fontWeight: '600',
  },
  accountingModalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  accountingModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  accountingCloseButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  accountingCloseText: {
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontWeight: '600',
  },
  accountingModalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  accountingPlaceholder: {
    width: 60,
  },
  disconnectButtonLarge: {
    backgroundColor: '#FFE5E5',
    borderColor: '#FF6B6B',
    borderWidth: 1,
  },
  disconnectButtonLargeText: {
    fontSize: FontSizes.sm,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  resetButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.surface,
    fontWeight: '600',
  },
  resetPersonalButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  resetPersonalButtonText: {
    fontSize: FontSizes.xs,
    color: Colors.surface,
    fontWeight: '600',
  },
  quickSwitchButton: {
    backgroundColor: '#9C27B0',
    borderRadius: 8,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  quickSwitchButtonText: {
    fontSize: FontSizes.xs,
    color: Colors.surface,
    fontWeight: '600',
  },
});


