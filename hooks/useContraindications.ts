'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Substance,
  Condition,
  ContraindicationAlert,
  ContraindicationRule,
  SubstanceInteraction,
} from '@/lib/types/contraindications';

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function matchesSubstance(substance: Substance, name: string): boolean {
  const normalized = normalizeString(name);
  if (normalizeString(substance.name).includes(normalized) || normalized.includes(normalizeString(substance.name))) {
    return true;
  }
  return substance.aliases.some((alias) => {
    const normalizedAlias = normalizeString(alias);
    return normalizedAlias.includes(normalized) || normalized.includes(normalizedAlias);
  });
}

export function useContraindications(
  consultantId: string | null,
  substanceNames: string[]
) {
  const [alerts, setAlerts] = useState<ContraindicationAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [substances, setSubstances] = useState<Substance[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [rules, setRules] = useState<ContraindicationRule[]>([]);
  const [interactions, setInteractions] = useState<SubstanceInteraction[]>([]);
  const [acknowledgedRules, setAcknowledgedRules] = useState<Set<string>>(new Set());

  // Load reference data once
  useEffect(() => {
    async function loadReferenceData() {
      const [substancesRes, conditionsRes, rulesRes, interactionsRes] = await Promise.all([
        supabase.from('substances').select('*'),
        supabase.from('conditions').select('*'),
        supabase.from('contraindication_rules').select('*'),
        supabase.from('substance_interactions').select('*'),
      ]);

      if (substancesRes.data) setSubstances(substancesRes.data as Substance[]);
      if (conditionsRes.data) setConditions(conditionsRes.data as Condition[]);
      if (rulesRes.data) setRules(rulesRes.data as ContraindicationRule[]);
      if (interactionsRes.data) setInteractions(interactionsRes.data as SubstanceInteraction[]);
    }

    loadReferenceData();
  }, []);

  // Load acknowledged logs for consultant
  useEffect(() => {
    if (!consultantId) return;

    async function loadLogs() {
      const { data } = await supabase
        .from('contraindication_logs')
        .select('rule_id')
        .eq('consultant_id', consultantId)
        .eq('acknowledged', true);

      if (data) {
        setAcknowledgedRules(new Set(data.map((log) => log.rule_id).filter(Boolean) as string[]));
      }
    }

    loadLogs();
  }, [consultantId]);

  // Compute alerts whenever substances or consultant data changes
  useEffect(() => {
    if (substances.length === 0 || substanceNames.length === 0) {
      setAlerts([]);
      return;
    }

    setLoading(true);

    async function computeAlerts() {
      // 1. Match substance names to substance records
      const matchedSubstances = new Map<string, Substance>();
      for (const name of substanceNames) {
        for (const substance of substances) {
          if (matchesSubstance(substance, name)) {
            matchedSubstances.set(substance.id, substance);
          }
        }
      }

      if (matchedSubstances.size === 0) {
        setAlerts([]);
        setLoading(false);
        return;
      }

      // 2. Get consultant conditions from anamnesis
      const consultantConditionIds = new Set<string>();
      const consultantConditionNames = new Map<string, string>();

      if (consultantId) {
        const { data: anamnesis } = await supabase
          .from('consultant_anamnesis')
          .select('answers')
          .eq('consultant_id', consultantId)
          .maybeSingle();

        const { data: consultant } = await supabase
          .from('consultants')
          .select('age')
          .eq('id', consultantId)
          .single();

        if (anamnesis?.answers) {
          const answers = anamnesis.answers as Record<string, string | Record<string, string>>;
          const allAnswerText = Object.values(answers)
            .map((v) => (typeof v === 'string' ? v : Object.values(v).join(' ')))
            .join(' ')
            .toLowerCase();

          // Map consultant data to conditions
          for (const condition of conditions) {
            const condName = normalizeString(condition.name);
            if (allAnswerText.includes(condName)) {
              consultantConditionIds.add(condition.id);
              consultantConditionNames.set(condition.id, condition.name);
            }
          }

          // Check for specific keywords
          const keywordMapping: Record<string, string[]> = {
            grossesse: ['enceinte', 'grossesse'],
            allaitement: ['allaite', 'allaitement'],
            'contraceptifs oraux': ['pilule', 'contraceptif', 'contraception orale'],
            'antidepresseurs isrs': ['antidepresseur', 'isrs', 'ssri', 'sertraline', 'fluoxetine', 'paroxetine', 'citalopram', 'escitalopram'],
            anticoagulants: ['anticoagulant', 'warfarine', 'coumadine', 'acenocoumarol', 'heparine', 'xarelto', 'eliquis'],
            immunosuppresseurs: ['immunosuppresseur', 'ciclosporine', 'tacrolimus', 'methotrexate'],
            antiretroviraux: ['antiretroviral', 'vih', 'sida', 'tritherapie'],
            'hypertension arterielle': ['hypertension', 'tension elevee', 'hta'],
            diabete: ['diabete', 'diabetique', 'glycemie elevee'],
            epilepsie: ['epilepsie', 'epileptique', 'convulsion'],
            'allergie aux asteracees': ['allergie asteracee', 'asteraceae'],
            'insuffisance renale': ['insuffisance renale', 'rein', 'dialyse'],
          };

          for (const [conditionKeyword, keywords] of Object.entries(keywordMapping)) {
            if (keywords.some((kw) => allAnswerText.includes(kw))) {
              const matchedCondition = conditions.find((c) => normalizeString(c.name) === normalizeString(conditionKeyword));
              if (matchedCondition) {
                consultantConditionIds.add(matchedCondition.id);
                consultantConditionNames.set(matchedCondition.id, matchedCondition.name);
              }
            }
          }
        }

        // Check age-based conditions
        if (consultant?.age) {
          if (consultant.age < 6) {
            const childCondition = conditions.find((c) => c.name.includes('moins de 6'));
            if (childCondition) {
              consultantConditionIds.add(childCondition.id);
              consultantConditionNames.set(childCondition.id, childCondition.name);
            }
          }
          if (consultant.age < 12) {
            const childCondition = conditions.find((c) => c.name.includes('moins de 12'));
            if (childCondition) {
              consultantConditionIds.add(childCondition.id);
              consultantConditionNames.set(childCondition.id, childCondition.name);
            }
          }
        }
      }

      const newAlerts: ContraindicationAlert[] = [];

      // 3. Check substance × condition rules
      const matchedSubstanceIds = Array.from(matchedSubstances.keys());
      for (const rule of rules) {
        if (
          matchedSubstanceIds.includes(rule.substance_id) &&
          consultantConditionIds.has(rule.condition_id)
        ) {
          const substance = matchedSubstances.get(rule.substance_id);
          newAlerts.push({
            id: `rule-${rule.id}`,
            ruleId: rule.id,
            ruleType: 'condition',
            severity: rule.severity,
            substanceName: substance?.name || '',
            conditionOrSubstanceName: consultantConditionNames.get(rule.condition_id) || '',
            messageFr: rule.message_fr,
            recommendationFr: rule.recommendation_fr,
            source: rule.source,
            acknowledged: acknowledgedRules.has(rule.id),
          });
        }
      }

      // 4. Check substance × substance interactions
      for (const interaction of interactions) {
        if (
          matchedSubstanceIds.includes(interaction.substance_a_id) &&
          matchedSubstanceIds.includes(interaction.substance_b_id)
        ) {
          const substanceA = matchedSubstances.get(interaction.substance_a_id);
          const substanceB = matchedSubstances.get(interaction.substance_b_id);
          newAlerts.push({
            id: `interaction-${interaction.id}`,
            ruleId: interaction.id,
            ruleType: 'interaction',
            severity: interaction.severity,
            substanceName: substanceA?.name || '',
            conditionOrSubstanceName: substanceB?.name || '',
            messageFr: interaction.message_fr,
            recommendationFr: interaction.recommendation_fr,
            source: interaction.source,
            acknowledged: acknowledgedRules.has(interaction.id),
          });
        }
      }

      // Sort by severity
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      newAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      setAlerts(newAlerts);
      setLoading(false);
    }

    computeAlerts();
  }, [consultantId, substanceNames, substances, conditions, rules, interactions, acknowledgedRules]);

  const acknowledgeAlert = useCallback(
    async (ruleId: string) => {
      if (!consultantId) return;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const alert = alerts.find((a) => a.ruleId === ruleId);
      if (!alert) return;

      const { error } = await supabase.from('contraindication_logs').insert({
        practitioner_id: userData.user.id,
        consultant_id: consultantId,
        rule_id: ruleId,
        rule_type: alert.ruleType,
        severity: alert.severity,
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
      });

      if (!error) {
        setAcknowledgedRules((prev) => new Set([...prev, ruleId]));
        setAlerts((prev) =>
          prev.map((a) => (a.ruleId === ruleId ? { ...a, acknowledged: true } : a))
        );
      }
    },
    [consultantId, alerts]
  );

  const criticalCount = useMemo(() => alerts.filter((a) => a.severity === 'critical' && !a.acknowledged).length, [alerts]);
  const warningCount = useMemo(() => alerts.filter((a) => a.severity === 'warning' && !a.acknowledged).length, [alerts]);
  const infoCount = useMemo(() => alerts.filter((a) => a.severity === 'info' && !a.acknowledged).length, [alerts]);

  return {
    alerts,
    loading,
    acknowledgeAlert,
    criticalCount,
    warningCount,
    infoCount,
  };
}
