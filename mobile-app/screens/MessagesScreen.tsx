import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { api } from '../services/api';
import { Message } from '../types';

interface MessagesScreenProps {
  onBack: () => void;
}

export default function MessagesScreen({ onBack }: MessagesScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await api.getMessages();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Erreur chargement messages:', error);
      // Mock data for demo
      setMessages([
        {
          id: '1',
          senderId: 'naturo-1',
          content: 'Bonjour Sophie ! Comment vous sentez-vous depuis notre dernière consultation ?',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          read: true,
        },
        {
          id: '2',
          senderId: 'patient',
          content: 'Bonjour Dr. Martin ! Je me sens beaucoup mieux, le magnésium fait vraiment effet.',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          read: true,
        },
        {
          id: '3',
          senderId: 'naturo-1',
          content: 'Excellent ! Continuez comme ça. N\'hésitez pas si vous avez des questions.',
          timestamp: new Date().toISOString(),
          read: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      await api.sendMessage(newMessage);
      // Optimistic update
      const newMsg: Message = {
        id: Date.now().toString(),
        senderId: 'patient',
        content: newMessage,
        timestamp: new Date().toISOString(),
        read: true,
      };
      setMessages([...messages, newMsg]);
      setNewMessage('');
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Erreur envoi message:', error);
      // Still add message for demo
      const newMsg: Message = {
        id: Date.now().toString(),
        senderId: 'patient',
        content: newMessage,
        timestamp: new Date().toISOString(),
        read: true,
      };
      setMessages([...messages, newMsg]);
      setNewMessage('');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    if (days === 1) {
      return 'Hier ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isFromPatient = (senderId: string) => senderId === 'patient';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Dashboard</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>💬 Dr. Martin</Text>
          <Text style={styles.subtitle}>Votre naturopathe</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
      >
        {loading ? (
          <Text style={styles.loadingText}>Chargement des messages...</Text>
        ) : messages.length === 0 ? (
          <Text style={styles.emptyText}>
            Aucun message. Commencez la conversation !
          </Text>
        ) : (
          messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                isFromPatient(message.senderId) ? styles.patientBubble : styles.naturoBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  isFromPatient(message.senderId) && styles.patientMessageText,
                ]}
              >
                {message.content}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  isFromPatient(message.senderId) && styles.patientMessageTime,
                ]}
              >
                {formatTime(message.timestamp)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Votre message..."
          placeholderTextColor={Colors.grisChaud}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!newMessage.trim() || sending}
        >
          <Text style={styles.sendButtonText}>{sending ? '...' : '→'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sable,
  },
  header: {
    backgroundColor: Colors.blanc,
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    color: Colors.teal,
    fontSize: 16,
    marginBottom: 10,
  },
  headerInfo: {},
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.charcoal,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.grisChaud,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 10,
  },
  loadingText: {
    textAlign: 'center',
    color: Colors.grisChaud,
    marginTop: 50,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.grisChaud,
    marginTop: 50,
    fontStyle: 'italic',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  naturoBubble: {
    backgroundColor: Colors.blanc,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  patientBubble: {
    backgroundColor: Colors.teal,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: Colors.charcoal,
    lineHeight: 20,
  },
  patientMessageText: {
    color: Colors.blanc,
  },
  messageTime: {
    fontSize: 11,
    color: Colors.grisChaud,
    marginTop: 4,
  },
  patientMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    backgroundColor: Colors.blanc,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
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
    marginRight: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.grisChaud,
  },
  sendButtonText: {
    color: Colors.blanc,
    fontSize: 20,
    fontWeight: 'bold',
  },
});
