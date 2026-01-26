import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
import { Card, Button } from '../ui';
import { Colors } from '../../constants/Colors';
import type { Article } from '../../types';

interface ArticlesCardProps {
  articles: Article[];
  onViewArticle: (article: Article) => void;
  onToggleFavorite: (id: string) => void;
  onViewAll: () => void;
}

export const ArticlesCard: React.FC<ArticlesCardProps> = ({
  articles,
  onViewArticle,
  onToggleFavorite,
  onViewAll,
}) => {
  if (articles.length === 0) {
    return (
      <Card title="Articles" subtitle="Recommandés pour vous">
        <Text style={styles.emptyText}>
          Aucun article recommandé pour le moment
        </Text>
      </Card>
    );
  }

  const renderArticle = ({ item }: { item: Article }) => (
    <TouchableOpacity
      style={styles.articleItem}
      onPress={() => onViewArticle(item)}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.articleImage} />
      ) : (
        <View style={[styles.articleImage, styles.articleImagePlaceholder]}>
          <Text style={styles.placeholderText}>📄</Text>
        </View>
      )}
      <View style={styles.articleContent}>
        <Text style={styles.articleCategory}>{item.category}</Text>
        <Text style={styles.articleTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.articleMeta}>
          <Text style={styles.readingTime}>{item.readingTime} min de lecture</Text>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite(item.id);
            }}
            style={styles.favoriteButton}
          >
            <Text style={styles.favoriteIcon}>
              {item.isFavorite ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Card
      title="Articles"
      subtitle="Recommandés pour vous"
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
        data={articles.slice(0, 3)}
        renderItem={renderArticle}
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
  articleItem: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  articleImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  articleImagePlaceholder: {
    backgroundColor: Colors.sable,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
  },
  articleContent: {
    flex: 1,
  },
  articleCategory: {
    fontSize: 11,
    color: Colors.teal,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.charcoal,
    lineHeight: 20,
    marginBottom: 4,
  },
  articleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readingTime: {
    fontSize: 11,
    color: Colors.grisChaud,
  },
  favoriteButton: {
    padding: 4,
  },
  favoriteIcon: {
    fontSize: 16,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.sable,
    marginVertical: 4,
  },
});

export default ArticlesCard;
