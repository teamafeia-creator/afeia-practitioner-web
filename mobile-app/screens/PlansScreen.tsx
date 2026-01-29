import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { api } from '../services/api';
import { Plan } from '../types';

interface PlansScreenProps {
  onBack: () => void;
}

export default function PlansScreen({ onBack }: PlansScreenProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showModal, setShowModal] = useState(false);

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
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPlans();
  };

  const handlePlanPress = async (plan: Plan) => {
    setSelectedPlan(plan);
    setShowModal(true);

    // Mark as viewed
    try {
      await api.markPlanViewed(plan.id);
    } catch (error) {
      console.error('Erreur marquage plan:', error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const renderPlanContent = (content: any) => {
    if (!content) return null;

    if (typeof content === 'string') {
      return <Text style={styles.contentText}>{content}</Text>;
    }

    // Handle structured content
    const sections = [];

    if (content.title) {
      sections.push(
        <Text key="title" style={styles.planTitle}>{content.title}</Text>
      );
    }

    if (content.description) {
      sections.push(
        <Text key="desc" style={styles.planDescription}>{content.description}</Text>
      );
    }

    if (content.objectives && Array.isArray(content.objectives)) {
      sections.push(
        <View key="objectives" style={styles.section}>
          <Text style={styles.sectionTitle}>Objectifs</Text>
          {content.objectives.map((obj: string, idx: number) => (
            <View key={idx} style={styles.listItem}>
              <Text style={styles.bullet}>-</Text>
              <Text style={styles.listText}>{obj}</Text>
            </View>
          ))}
        </View>
      );
    }

    if (content.recommendations && Array.isArray(content.recommendations)) {
      sections.push(
        <View key="recommendations" style={styles.section}>
          <Text style={styles.sectionTitle}>Recommandations</Text>
          {content.recommendations.map((rec: any, idx: number) => (
            <View key={idx} style={styles.recommendationCard}>
              {typeof rec === 'string' ? (
                <Text style={styles.recommendationText}>{rec}</Text>
              ) : (
                <>
                  {rec.category && (
                    <Text style={styles.recommendationCategory}>{rec.category}</Text>
                  )}
                  <Text style={styles.recommendationText}>
                    {rec.title || rec.name || rec.text || JSON.stringify(rec)}
                  </Text>
                  {rec.details && (
                    <Text style={styles.recommendationDetails}>{rec.details}</Text>
                  )}
                </>
              )}
            </View>
          ))}
        </View>
      );
    }

    if (content.supplements && Array.isArray(content.supplements)) {
      sections.push(
        <View key="supplements" style={styles.section}>
          <Text style={styles.sectionTitle}>Complements alimentaires</Text>
          {content.supplements.map((supp: any, idx: number) => (
            <View key={idx} style={styles.supplementCard}>
              <Text style={styles.supplementName}>
                {typeof supp === 'string' ? supp : supp.name}
              </Text>
              {supp.dosage && (
                <Text style={styles.supplementDosage}>Posologie: {supp.dosage}</Text>
              )}
              {supp.instructions && (
                <Text style={styles.supplementInstructions}>{supp.instructions}</Text>
              )}
            </View>
          ))}
        </View>
      );
    }

    if (content.notes) {
      sections.push(
        <View key="notes" style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{content.notes}</Text>
        </View>
      );
    }

    // If no structured content found, show raw JSON nicely formatted
    if (sections.length === 0) {
      return (
        <Text style={styles.contentText}>
          {JSON.stringify(content, null, 2)}
        </Text>
      );
    }

    return <View>{sections}</View>;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backButton}>&lt;- Dashboard</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Mes Plans de Soin</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.teal} />
          <Text style={styles.loadingText}>Chargement des plans...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>&lt;- Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mes Plans de Soin</Text>
        <Text style={styles.subtitle}>
          {plans.length} plan{plans.length > 1 ? 's' : ''} disponible{plans.length > 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {plans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Aucun plan pour le moment</Text>
            <Text style={styles.emptyText}>
              Votre naturopathe n'a pas encore partage de plan de soin avec vous.
            </Text>
          </View>
        ) : (
          plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={styles.planCard}
              onPress={() => handlePlanPress(plan)}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planCardTitle}>{plan.title}</Text>
                {plan.status === 'shared' && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>Nouveau</Text>
                  </View>
                )}
              </View>
              {plan.description && (
                <Text style={styles.planCardDescription} numberOfLines={2}>
                  {plan.description}
                </Text>
              )}
              <View style={styles.planMeta}>
                {plan.practitioner && (
                  <Text style={styles.planPractitioner}>
                    Par {plan.practitioner.name}
                  </Text>
                )}
                <Text style={styles.planDate}>
                  {formatDate(plan.sharedAt || plan.createdAt)}
                </Text>
              </View>
              <Text style={styles.viewMore}>Voir le plan &rarr;</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Plan Detail Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Plan de soin</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedPlan && (
              <>
                <View style={styles.modalMeta}>
                  {selectedPlan.practitioner && (
                    <Text style={styles.modalPractitioner}>
                      Cree par {selectedPlan.practitioner.name}
                    </Text>
                  )}
                  <Text style={styles.modalDate}>
                    {formatDate(selectedPlan.sharedAt || selectedPlan.createdAt)}
                  </Text>
                </View>

                {renderPlanContent(selectedPlan.content)}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.charcoal,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.grisChaud,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: Colors.grisChaud,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.charcoal,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.grisChaud,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  planCard: {
    backgroundColor: Colors.blanc,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  planCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.charcoal,
    flex: 1,
  },
  newBadge: {
    backgroundColor: Colors.teal,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  newBadgeText: {
    color: Colors.blanc,
    fontSize: 12,
    fontWeight: '600',
  },
  planCardDescription: {
    fontSize: 14,
    color: Colors.grisChaud,
    marginBottom: 12,
    lineHeight: 20,
  },
  planMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planPractitioner: {
    fontSize: 13,
    color: Colors.teal,
  },
  planDate: {
    fontSize: 12,
    color: Colors.grisChaud,
  },
  viewMore: {
    color: Colors.teal,
    fontWeight: '500',
    fontSize: 14,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.blanc,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: Colors.teal,
    fontSize: 16,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalMeta: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalPractitioner: {
    fontSize: 16,
    color: Colors.teal,
    fontWeight: '500',
    marginBottom: 4,
  },
  modalDate: {
    fontSize: 14,
    color: Colors.grisChaud,
  },
  // Content styles
  planTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.charcoal,
    marginBottom: 12,
  },
  planDescription: {
    fontSize: 16,
    color: Colors.grisChaud,
    lineHeight: 24,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.teal,
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    color: Colors.teal,
    marginRight: 8,
    fontSize: 16,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    color: Colors.charcoal,
    lineHeight: 22,
  },
  recommendationCard: {
    backgroundColor: Colors.sable,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recommendationCategory: {
    fontSize: 12,
    color: Colors.teal,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  recommendationText: {
    fontSize: 15,
    color: Colors.charcoal,
    lineHeight: 22,
  },
  recommendationDetails: {
    fontSize: 13,
    color: Colors.grisChaud,
    marginTop: 8,
    fontStyle: 'italic',
  },
  supplementCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.teal,
  },
  supplementName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.charcoal,
    marginBottom: 4,
  },
  supplementDosage: {
    fontSize: 14,
    color: Colors.teal,
    fontWeight: '500',
  },
  supplementInstructions: {
    fontSize: 13,
    color: Colors.grisChaud,
    marginTop: 8,
    fontStyle: 'italic',
  },
  notesText: {
    fontSize: 15,
    color: Colors.charcoal,
    lineHeight: 24,
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.dore,
  },
  contentText: {
    fontSize: 15,
    color: Colors.charcoal,
    lineHeight: 24,
  },
});
