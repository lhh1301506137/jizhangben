import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BorderRadius, Colors, FontSizes, Spacing } from '../../constants/Colors';
import { Message, MessageService } from '../../services/MessageService';
import { getCommunicationOfflineMessage, isLikelyNetworkError } from '../../utils/errorMessages';

interface MessageBoardProps {
  visible: boolean;
  date?: string;
  onClose: () => void;
}

const EMOJI_OPTIONS = ['💕', '😊', '😘', '😍', '🎁', '🌟', '☀️', '🌙', '🎈', '🏆'];

export const MessageBoard: React.FC<MessageBoardProps> = ({ visible, date, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      loadMessages();
    }
  }, [visible, date]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      await MessageService.checkAndReceivePendingMessages();

      const messageList = date
        ? await MessageService.getMessagesByDate(date)
        : await MessageService.getRecentMessages(100);

      setMessages(messageList);
      await MessageService.markMessageAsRead('all');

      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      });
    } catch (error) {
      console.error('load messages failed:', error);
      Alert.alert('错误', '加载留言失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    const content = newMessage.trim();
    if (!content) {
      Alert.alert('提示', '请输入留言内容');
      return;
    }

    try {
      const messageDate = date || new Date().toISOString().split('T')[0];
      const sent = await MessageService.sendMessage(messageDate, content, selectedEmoji || undefined);

      setMessages(prev => [...prev, sent].sort((a, b) => a.timestamp - b.timestamp));
      setNewMessage('');
      setSelectedEmoji('');

      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      });
    } catch (error) {
      console.error('send message failed:', error);
      Alert.alert(
        '发送失败',
        isLikelyNetworkError(error) ? getCommunicationOfflineMessage('发送') : '请重试'
      );
    }
  };

  const formatTime = (timestamp: number): string => {
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const d = new Date(dateString);
    const today = new Date().toISOString().split('T')[0];
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = y.toISOString().split('T')[0];

    if (dateString === today) {
      return '今天';
    }
    if (dateString === yesterday) {
      return '昨天';
    }
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>‹ 返回</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{date ? `${formatDate(date)}的留言` : '留言板'}</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesContent}
          >
            {loading ? (
              <Text style={styles.loadingText}>加载中...</Text>
            ) : messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>💌</Text>
                <Text style={styles.emptyTitle}>还没有留言</Text>
                <Text style={styles.emptySubtitle}>开始你们的第一条留言吧</Text>
              </View>
            ) : (
              messages.map(message => (
                <View
                  key={message.id}
                  style={[styles.messageContainer, message.isFromMe ? styles.myMessage : styles.partnerMessage]}
                >
                  {!message.isFromMe && <Text style={styles.authorName}>{message.authorName}</Text>}
                  <View
                    style={[
                      styles.messageBubble,
                      message.isFromMe ? styles.myMessageBubble : styles.partnerMessageBubble,
                    ]}
                  >
                    {message.emoji && <Text style={styles.messageEmoji}>{message.emoji}</Text>}
                    <Text
                      style={[styles.messageText, message.isFromMe ? styles.myMessageText : styles.partnerMessageText]}
                    >
                      {message.content}
                    </Text>
                    <Text
                      style={[styles.messageTime, message.isFromMe ? styles.myMessageTime : styles.partnerMessageTime]}
                    >
                      {formatTime(message.timestamp)}
                    </Text>
                  </View>
                  {message.isFromMe && <Text style={styles.myAuthorName}>{message.authorName}</Text>}
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <TouchableOpacity style={styles.emojiButton} onPress={() => setShowEmojiPicker(true)}>
                <Text style={styles.emojiButtonText}>{selectedEmoji || '😊'}</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.messageInput}
                placeholder="输入留言..."
                placeholderTextColor={Colors.textSecondary}
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxLength={200}
              />
              <TouchableOpacity
                style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={!newMessage.trim()}
              >
                <Text style={styles.sendButtonText}>发送</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.inputCounter}>{newMessage.length}/200</Text>
          </View>

          <Modal visible={showEmojiPicker} transparent animationType="fade">
            <View style={styles.emojiPickerOverlay}>
              <View style={styles.emojiPickerContainer}>
                <Text style={styles.emojiPickerTitle}>选择表情</Text>
                <View style={styles.emojiGrid}>
                  {EMOJI_OPTIONS.map((emoji, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.emojiOption, selectedEmoji === emoji && styles.selectedEmojiOption]}
                      onPress={() => {
                        setSelectedEmoji(emoji);
                        setShowEmojiPicker(false);
                      }}
                    >
                      <Text style={styles.emojiOptionText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.emojiPickerCancel} onPress={() => setShowEmojiPicker(false)}>
                  <Text style={styles.emojiPickerCancelText}>取消</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    marginTop: 50,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  closeButtonText: {
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    width: 60,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  messagesContent: {
    paddingVertical: Spacing.md,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: Spacing.md,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  partnerMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  myMessageBubble: {
    backgroundColor: Colors.primary,
  },
  partnerMessageBubble: {
    backgroundColor: Colors.background,
  },
  messageEmoji: {
    fontSize: 16,
    marginBottom: 4,
  },
  messageText: {
    fontSize: FontSizes.md,
    lineHeight: 20,
  },
  myMessageText: {
    color: Colors.surface,
  },
  partnerMessageText: {
    color: Colors.text,
  },
  messageTime: {
    fontSize: FontSizes.xs,
    marginTop: 4,
  },
  myMessageTime: {
    color: Colors.surface,
    opacity: 0.8,
  },
  partnerMessageTime: {
    color: Colors.textSecondary,
  },
  authorName: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
    marginLeft: 8,
  },
  myAuthorName: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 4,
    marginRight: 8,
    textAlign: 'right',
  },
  inputContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.xs,
  },
  emojiButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
  },
  emojiButtonText: {
    fontSize: 20,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
    maxHeight: 80,
    marginRight: Spacing.sm,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },
  sendButtonText: {
    fontSize: FontSizes.md,
    color: Colors.surface,
    fontWeight: '600',
  },
  inputCounter: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  emojiPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiPickerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '80%',
  },
  emojiPickerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  emojiOption: {
    width: '18%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  selectedEmojiOption: {
    backgroundColor: Colors.primaryLight,
  },
  emojiOptionText: {
    fontSize: 24,
  },
  emojiPickerCancel: {
    backgroundColor: Colors.border,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  emojiPickerCancelText: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
});
