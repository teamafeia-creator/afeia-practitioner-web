import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Card, Button } from '../ui';
import { Colors } from '../../constants/Colors';
import type { Conseil, ConseilCategory } from '../../types';

interface ConseilsCardProps {
  conseils: Conseil[];
  onMarkAsRead: (id: string) => void;
  onViewAll: () => void;
}

const CATEGORY_ICONS: Record<ConseilCategory, string> = {
  alimentation: '🥗',
  hygiene_vie: '🧘',
  exercices: '🏃',
  bien_etre: '✨',
  plantes: '🌿',
};

const CATEGORY_LABELS: Record<ConseilCategory, string> = {
  alimentation: 'Alimentation',
  hygiene_vie: 'Hygiène de vie',
  exercices: 'Exercices',
  bien_etre: 'Bien-être',
  plantes: 'Plantes',
};

export const ConseilsCard: React.FC<ConseilsCardProps> = ({
  conseils,
  onMarkAsRead,
  onViewAll,
}) => {
  if (conseils.length === 0) {
    return (
      <Card title="Conseils" subtitle="Recommandations personnalisées">
        <Text style={styles.emptyText}>
          Aucun conseil pour le moment
        </Text>
      </Card>
    );
  }

  const renderConseil = ({ item }: { item: Conseil }) => (
    <TouchableOpacity
      style={[styles.conseilItem, !item.isRead && styles.conseilUnread]}
      onPress={() => onMarkAsRead(item.id)}
    >
      <View style={styles.conseilIcon}>
        <Text style={styles.iconText}>
          {CATEGORY_ICONS[item.category] || '📋'}
        </Text>
      </View>
      <View style={styles.conseilContent}>
        <View style={styles.conseilHeader}>
          <Text style={styles.conseilCategory}>
            {CATEGORY_LABELS[item.category] || item.category}
          </Text>
          {!item.isRead && <View style={styles.unreadBadge} />}
        </View>
        <Text style={styles.conseilTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.conseilExcerpt} numberOfLines={2}>
          {item.excerpt}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Card
      title="Conseils"
      subtitle={`${conseils.filter(c => !c.isRead).length} nouveaux`}
      headerRight={
        <Button
          title="Voir tout"
          onPress={onViewAll}
          variant="ghost"
          size="small"
        />
      }
    >
      <FlatList
        data={conseils.slice(0, 3)}
        renderItem={renderConseil}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  emptyText: {
    fontSize: 14,
    color: Colors.grisChaud,
    textAlign: 'center',
    paddingVertical: 16,
  },
  conseilItem: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  conseilUnread: {
    backgroundColor: Colors.sable,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  conseilIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.sable,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  conseilContent: {
    flex: 1,
  },
  conseilHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  conseilCategory: {
    fontSize: 12,
    color: Colors.teal,
    fontWeight: '500',
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dore,
    marginLeft: 8,
  },
  conseilTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.charcoal,
    marginBottom: 2,
  },
  conseilExcerpt: {
    fontSize: 13,
    color: Colors.grisChaud,
    lineHeight: 18,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.sable,
    marginVertical: 4,
  },
});

export default ConseilsCard;
