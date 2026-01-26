import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Button } from '../ui';
import { Colors } from '../../constants/Colors';
import { formatRelativeTime, formatInitials } from '../../utils/formatters';
import type { Conversation, Naturopathe } from '../../types';

interface MessagesCardProps {
  conversation: Conversation | null;
  naturopathe: Naturopathe | null;
  unreadCount: number;
  onOpenConversation: () => void;
}

export const MessagesCard: React.FC<MessagesCardProps> = ({
  conversation,
  naturopathe,
  unreadCount,
  onOpenConversation,
}) => {
  const hasUnread = unreadCount > 0;

  return (
    <Card
      title="Messages"
      subtitle={hasUnread ? `${unreadCount} nouveau${unreadCount > 1 ? 'x' : ''}` : 'Conversation'}
      onPress={onOpenConversation}
    >
      <View style={styles.container}>
        {/* Avatar et info naturopathe */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {formatInitials(naturopathe?.firstName, naturopathe?.lastName)}
            </Text>
          </View>
          {hasUnread && <View style={styles.unreadBadge} />}
        </View>

        {/* Contenu du message */}
        <View style={styles.content}>
          <Text style={styles.naturopatheName}>
            {naturopathe?.firstName} {naturopathe?.lastName}
          </Text>
          {conversation?.lastMessage ? (
            <>
              <Text
                style={[
                  styles.messagePreview,
                  !conversation.lastMessage.isRead && styles.messageUnread,
                ]}
                numberOfLines={2}
              >
                {conversation.lastMessage.senderType === 'patient' && 'Vous: '}
                {conversation.lastMessage.content}
              </Text>
              <Text style={styles.messageTime}>
                {formatRelativeTime(conversation.lastMessage.createdAt)}
              </Text>
            </>
          ) : (
            <Text style={styles.noMessage}>
              Démarrez une conversation avec votre naturopathe
            </Text>
          )}
        </View>
      </View>

      <Button
        title="Ouvrir la conversation"
        onPress={onOpenConversation}
        variant="outline"
        fullWidth
        size="small"
        style={styles.openButton}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.blanc,
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.dore,
    borderWidth: 2,
    borderColor: Colors.blanc,
  },
  content: {
    flex: 1,
  },
  naturopatheName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.charcoal,
    marginBottom: 4,
  },
  messagePreview: {
    fontSize: 14,
    color: Colors.grisChaud,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageUnread: {
    color: Colors.charcoal,
    fontWeight: '500',
  },
  messageTime: {
    fontSize: 12,
    color: Colors.grisChaud,
  },
  noMessage: {
    fontSize: 14,
    color: Colors.grisChaud,
    fontStyle: 'italic',
  },
  openButton: {
    marginTop: 8,
  },
});

export default MessagesCard;
