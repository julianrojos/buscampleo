export type CriteriaCategory =
  | 'design-systems'
  | 'design-code'
  | 'accessibility'
  | 'modality'
  | 'maturity'
  | 'collaboration'
  | 'exclusion'
  | 'role';

export interface HardExcludeCriterion {
  readonly id: string;
  readonly pattern: string;
  readonly category: CriteriaCategory;
  readonly reason: string;
  readonly active: boolean;
}

export interface WeightedSignalCriterion {
  readonly id: string;
  readonly pattern: string;
  readonly weight: number;
  readonly category: CriteriaCategory;
  readonly explain: string;
  readonly active: boolean;
}

export type ConditionalSeverity = 'block' | 'penalize';

export interface ConditionalRuleCriterion {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly severity: ConditionalSeverity;
  readonly explain: string;
  readonly active: boolean;
}

export interface TargetRoleCriterion {
  readonly id: string;
  readonly label: string;
  readonly active: boolean;
}

export interface CriteriaConfig {
  readonly hard_excludes: readonly HardExcludeCriterion[];
  readonly weighted_signals: readonly WeightedSignalCriterion[];
  readonly conditional_rules: readonly ConditionalRuleCriterion[];
  readonly target_roles: readonly TargetRoleCriterion[];
}
