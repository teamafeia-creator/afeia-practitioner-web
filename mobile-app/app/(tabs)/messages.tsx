import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../../components/ui';
import { messagesService } from '../../services/api/messages';
import { patientService } from '../../services/api/patient';
import { Colors } from '../../constants/Colors';
import { formatRelativeTime, formatFullName, formatInitials } from '../../utils/formatters';
import type { Message, Naturopathe } from '../../types';

export default function MessagesScreen() {
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [naturopathe, setNaturopathe] = useState<Naturopathe | null>(null);
  const [newMessage, setNewMessage] = useState('');

  const loadData = useCallback(async () => {
    try {
      console.log('✅ Messages: Loading data...');

      const [messagesRes, naturoRes] = await Promise.allSettled([
        messagesService.getMessages(1, 100),
        patientService.getNaturopathe(),
      ]);

      if (messagesRes.status === 'fulfilled' && messagesRes.value.success) {
        setMessages(messagesRes.value.data?.data || []);
      }

      if (naturoRes.status === 'fulfilled' && naturoRes.value.success) {
        setNaturopathe(naturoRes.value.data || null);
      }

      // Marquer les messages comme lus
      const unreadIds = (messagesRes.status === 'fulfilled' ? messagesRes.value.data?.data : [])
        ?.filter(m => !m.isRead && m.senderType === 'naturopathe')
        .map(m => m.id) || [];

      if (unreadIds.length > 0) {
        await messagesService.markAsRead(unreadIds);
      }

      console.log('✅ Messages: Data loaded');
    } catch (error) {
      console.error('❌ Messages: Error loading data', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);
      const response = await messagesService.sendMessage(newMessage.trim());

      if (response.success && response.data) {
        setMessages(prev => [...prev, response.data!]);
        setNewMessage('');

        // Scroll vers le bas
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('❌ Messages: Error sending message', error);
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isPatient = item.senderType === 'patient';

    return (
      <View
        style={[
          styles.messageContainer,
          isPatient ? styles.messagePatient : styles.messageNaturopathe,
        ]}
      >
        {!isPatient && (
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarSmallText}>
              {formatInitials(naturopathe?.firstName, naturopathe?.lastName)}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isPatient ? styles.bubblePatient : styles.bubbleNaturopathe,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isPatient ? styles.textPatient : styles.textNaturopathe,
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isPatient ? styles.timePatient : styles.timeNaturopathe,
            ]}
          >
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner fullScreen message="Chargement..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {formatInitials(naturopathe?.firstName, naturopathe?.lastName)}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>
              {formatFullName(naturopathe?.firstName, naturopathe?.lastName)}
            </Text>
            <Text style={styles.headerRole}>Votre naturopathe</Text>
          </View>
        </View>

        {/* Messages list */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Démarrez la conversation avec votre naturopathe
              </Text>
            </View>
          }
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Écrivez votre message..."
            placeholderTextColor={Colors.grisChaud}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!newMessage.trim() || isSending}
          >
            <Text style={styles.sendButtonText}>
              {isSending ? '...' : '➤'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sable,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.blanc,
    borderBottomWidth: 1,
    borderBottomColor: Colors.sable,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.blanc,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  headerRole: {
    fontSize: 13,
    color: Colors.grisChaud,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.grisChaud,
    textAlign: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messagePatient: {
    justifyContent: 'flex-end',
  },
  messageNaturopathe: {
    justifyContent: 'flex-start',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarSmallText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.blanc,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  bubblePatient: {
    backgroundColor: Colors.teal,
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
  },
  bubbleNaturopathe: {
    backgroundColor: Colors.blanc,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  textPatient: {
    color: Colors.blanc,
  },
  textNaturopathe: {
    color: Colors.charcoal,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  timePatient: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  timeNaturopathe: {
    color: Colors.grisChaud,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: Colors.blanc,
    borderTopWidth: 1,
    borderTopColor: Colors.sable,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.sable,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.charcoal,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.grisChaud,
  },
  sendButtonText: {
    fontSize: 18,
    color: Colors.blanc,
  },
});
