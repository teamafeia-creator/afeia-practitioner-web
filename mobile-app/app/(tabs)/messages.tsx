/**
 * Messages Screen
 * Chat with naturopathe
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMessages } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { patientApi, formatApiError } from '@/services/api';
import { Avatar, LoadingSpinner, EmptyState } from '@/components/ui';
import { Colors, Theme, Spacing, TextStyles, BorderRadius } from '@/constants';
import type { Message, NaturopatheInfo } from '@/types';

export default function MessagesScreen() {
  const { patient } = useAuth();
  const {
    messages,
    isLoading,
    isSending,
    hasMore,
    sendMessage,
    loadMore,
    markAsRead,
    refresh,
  } = useMessages();

  const [messageText, setMessageText] = useState('');
  const [naturopatheInfo, setNaturopatheInfo] = useState<NaturopatheInfo | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchNaturopatheInfo();
  }, []);

  // Mark messages as read when viewed
  useEffect(() => {
    messages.forEach((message) => {
      if (!message.read && message.senderType === 'praticien') {
        markAsRead(message.id);
      }
    });
  }, [messages]);

  const fetchNaturopatheInfo = async () => {
    try {
      const info = await patientApi.getNaturopatheInfo();
      setNaturopatheInfo(info);
    } catch (error) {
      console.error('Error fetching naturopathe info:', error);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim()) return;

    const text = messageText.trim();
    setMessageText('');

    try {
      await sendMessage({ content: text });
    } catch (error) {
      Alert.alert('Erreur', formatApiError(error));
      setMessageText(text);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
      });
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.senderType === 'patient';
    const showDate =
      index === messages.length - 1 ||
      formatDate(item.createdAt) !== formatDate(messages[index + 1].createdAt);

    return (
      <>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
        )}
        <View style={[styles.messageContainer, isOwn && styles.messageContainerOwn]}>
          {!isOwn && (
            <Avatar
              source={naturopatheInfo?.naturopathe.avatarUrl}
              name={naturopatheInfo?.naturopathe.fullName}
              size="sm"
            />
          )}
          <View style={[styles.messageBubble, isOwn && styles.messageBubbleOwn]}>
            <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
              {item.content}
            </Text>
            <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>
              {formatTime(item.createdAt)}
              {isOwn && item.read && (
                <Text style={styles.readIndicator}> Lu</Text>
              )}
            </Text>
          </View>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {naturopatheInfo && (
          <View style={styles.headerContent}>
            <Avatar
              source={naturopatheInfo.naturopathe.avatarUrl}
              name={naturopatheInfo.naturopathe.fullName}
              size="md"
            />
            <View style={styles.headerText}>
              <Text style={styles.headerName}>
                {naturopatheInfo.naturopathe.fullName}
              </Text>
              <Text style={styles.headerSubtitle}>Votre naturopathe</Text>
            </View>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages List */}
        {isLoading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner />
          </View>
        ) : messages.length === 0 ? (
          <EmptyState
            icon="chatbubble-outline"
            title="Aucun message"
            message="Envoyez un message à votre naturopathe pour commencer la conversation."
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              hasMore ? (
                <View style={styles.loadMoreContainer}>
                  <LoadingSpinner size="small" />
                </View>
              ) : null
            }
          />
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Écrivez votre message..."
            placeholderTextColor={Colors.neutral.grayWarm}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!messageText.trim() || isSending}
          >
            <Ionicons
              name="send"
              size={20}
              color={
                messageText.trim() && !isSending
                  ? Colors.neutral.white
                  : Colors.neutral.grayWarm
              }
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.sandDark,
    backgroundColor: Colors.neutral.white,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: Spacing.md,
  },
  headerName: {
    ...TextStyles.h5,
    color: Theme.text,
  },
  headerSubtitle: {
    ...TextStyles.bodySmall,
    color: Theme.textSecondary,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dateText: {
    ...TextStyles.caption,
    color: Theme.textSecondary,
    backgroundColor: Colors.neutral.sand,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    alignItems: 'flex-end',
  },
  messageContainerOwn: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    backgroundColor: Colors.neutral.sand,
    borderRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  messageBubbleOwn: {
    backgroundColor: Colors.primary.teal,
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.xs,
    marginLeft: 0,
  },
  messageText: {
    ...TextStyles.body,
    color: Theme.text,
  },
  messageTextOwn: {
    color: Colors.neutral.white,
  },
  messageTime: {
    ...TextStyles.caption,
    color: Theme.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
  messageTimeOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  readIndicator: {
    fontWeight: '500',
  },
  loadMoreContainer: {
    paddingVertical: Spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.sandDark,
    backgroundColor: Colors.neutral.white,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.neutral.sand,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    paddingTop: Spacing.sm,
    maxHeight: 100,
    ...TextStyles.body,
    color: Theme.text,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.neutral.sand,
  },
});
