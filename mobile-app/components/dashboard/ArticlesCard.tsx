import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Card from '../ui/Card';
import { Colors } from '../../constants/Colors';
import { api } from '../../services/api';
import { Article } from '../../types';

export default function ArticlesCard() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const data = await api.getArticles();
      setArticles(data.articles || []);
    } catch (error) {
      console.error('Erreur chargement articles:', error);
      // Mock data for demo
      setArticles([
        {
          id: '1',
          title: 'Les bienfaits du magnésium',
          category: 'Compléments',
          summary: 'Découvrez pourquoi le magnésium est essentiel pour votre santé...',
          content: '',
          date: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Améliorer son sommeil naturellement',
          category: 'Sommeil',
          summary: 'Des conseils pratiques pour retrouver un sommeil réparateur...',
          content: '',
          date: new Date().toISOString(),
        },
        {
          id: '3',
          title: 'Alimentation anti-inflammatoire',
          category: 'Nutrition',
          summary: 'Comment réduire l\'inflammation par l\'alimentation...',
          content: '',
          date: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'compléments':
        return '#4CAF50';
      case 'sommeil':
        return '#9C27B0';
      case 'nutrition':
        return '#FF9800';
      default:
        return Colors.teal;
    }
  };

  if (loading) {
    return (
      <Card>
        <Text style={styles.title}>📚 Articles santé</Text>
        <Text style={styles.loading}>Chargement...</Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={styles.title}>📚 Articles santé</Text>
      {articles.length === 0 ? (
        <Text style={styles.empty}>Aucun article disponible</Text>
      ) : (
        articles.slice(0, 3).map((article) => (
          <TouchableOpacity key={article.id} style={styles.article}>
            <View style={styles.articleContent}>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: getCategoryColor(article.category) },
                ]}
              >
                <Text style={styles.categoryText}>{article.category}</Text>
              </View>
              <Text style={styles.articleTitle} numberOfLines={2}>
                {article.title}
              </Text>
              <Text style={styles.articleSummary} numberOfLines={2}>
                {article.summary}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
      <TouchableOpacity style={styles.viewAll}>
        <Text style={styles.viewAllText}>Voir tous les articles →</Text>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.teal,
    marginBottom: 15,
  },
  loading: {
    color: Colors.grisChaud,
  },
  empty: {
    color: Colors.grisChaud,
    fontStyle: 'italic',
  },
  article: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  articleContent: {
    flex: 1,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  categoryText: {
    color: Colors.blanc,
    fontSize: 11,
    fontWeight: '600',
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.charcoal,
    marginBottom: 4,
  },
  articleSummary: {
    fontSize: 13,
    color: Colors.grisChaud,
    lineHeight: 18,
  },
  viewAll: {
    marginTop: 15,
    alignItems: 'center',
  },
  viewAllText: {
    color: Colors.teal,
    fontWeight: '500',
  },
});
