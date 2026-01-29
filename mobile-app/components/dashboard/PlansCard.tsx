import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import { Colors } from '../../constants/Colors';
import { api } from '../../services/api';
import { Plan } from '../../types';

interface PlansCardProps {
  onPress?: () => void;
}

export default function PlansCard({ onPress }: PlansCardProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await api.getPlans();
      setPlans(data.plans || []);
    } catch (error) {
      console.error('Erreur chargement plans:', error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const newPlansCount = plans.filter((p) => p.status === 'shared').length;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Hier';
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <Card>
        <Text style={styles.title}>Plans de soin</Text>
        <Text style={styles.loading}>Chargement...</Text>
      </Card>
    );
  }

  return (
    <TouchableOpacity onPress={onPress}>
      <Card>
        <View style={styles.header}>
          <Text style={styles.title}>Plans de soin</Text>
          {newPlansCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{newPlansCount}</Text>
            </View>
          )}
        </View>
        {plans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.empty}>Aucun plan partage</Text>
            <Text style={styles.emptyHint}>
              Votre naturopathe partagera bientot votre plan personnalise
            </Text>
          </View>
        ) : (
          <>
            {plans.slice(0, 2).map((plan) => (
              <View
                key={plan.id}
                style={[styles.plan, plan.status === 'shared' && styles.newPlan]}
              >
                <View style={styles.planHeader}>
                  <Text style={styles.planTitle} numberOfLines={1}>
                    {plan.title}
                  </Text>
                  {plan.status === 'shared' && (
                    <View style={styles.newTag}>
                      <Text style={styles.newTagText}>Nouveau</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.date}>
                  {formatDate(plan.sharedAt || plan.createdAt)}
                </Text>
              </View>
            ))}
            <TouchableOpacity style={styles.viewAll} onPress={onPress}>
              <Text style={styles.viewAllText}>
                Voir {plans.length > 2 ? `les ${plans.length} plans` : 'mes plans'} &rarr;
              </Text>
            </TouchableOpacity>
          </>
        )}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.teal,
  },
  badge: {
    backgroundColor: Colors.teal,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: Colors.blanc,
    fontSize: 12,
    fontWeight: '600',
  },
  loading: {
    color: Colors.grisChaud,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  empty: {
    color: Colors.grisChaud,
    fontWeight: '500',
    marginBottom: 4,
  },
  emptyHint: {
    color: Colors.grisChaud,
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  plan: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  newPlan: {
    backgroundColor: '#E8F5E9',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.charcoal,
    flex: 1,
  },
  newTag: {
    backgroundColor: Colors.teal,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  newTagText: {
    color: Colors.blanc,
    fontSize: 10,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: Colors.grisChaud,
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
