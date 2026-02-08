import { DEFAULT_TEMPLATES } from '@/lib/invoicing/templates';

describe('DEFAULT_TEMPLATES', () => {
  it('should have 3 default templates', () => {
    expect(DEFAULT_TEMPLATES).toHaveLength(3);
  });

  it('should have unique IDs', () => {
    const ids = DEFAULT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have sequential order values', () => {
    const ordres = DEFAULT_TEMPLATES.map((t) => t.ordre);
    expect(ordres).toEqual([1, 2, 3]);
  });

  it('should all be active by default', () => {
    DEFAULT_TEMPLATES.forEach((template) => {
      expect(template.is_active).toBe(true);
    });
  });

  it('should have positive default amounts', () => {
    DEFAULT_TEMPLATES.forEach((template) => {
      expect(template.montant_defaut).toBeGreaterThan(0);
    });
  });

  it('should have consult_premiere as first template at 80 EUR', () => {
    const first = DEFAULT_TEMPLATES[0];
    expect(first.id).toBe('consult_premiere');
    expect(first.montant_defaut).toBe(80);
  });

  it('should have consult_suivi at 60 EUR', () => {
    const suivi = DEFAULT_TEMPLATES.find((t) => t.id === 'consult_suivi');
    expect(suivi).toBeDefined();
    expect(suivi!.montant_defaut).toBe(60);
  });

  it('should have atelier at 25 EUR', () => {
    const atelier = DEFAULT_TEMPLATES.find((t) => t.id === 'atelier');
    expect(atelier).toBeDefined();
    expect(atelier!.montant_defaut).toBe(25);
  });

  it('should have default durations in minutes', () => {
    DEFAULT_TEMPLATES.forEach((template) => {
      expect(template.duree_defaut).toBeDefined();
      expect(template.duree_defaut).toBeGreaterThan(0);
    });
  });
});
