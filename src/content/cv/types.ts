export type MetricDirection = 'down-is-good' | 'up-is-good';

export interface Metric {
  label: string;
  from: number;
  to: number;
  unit: string;
  delta: string;
  direction: MetricDirection;
  verifiedBy?: string;
}

export interface Role {
  org: string;
  title: string;
  period: string;
  context?: string;
  bullets: string[];
}

export interface Project {
  name: string;
  period: string;
  context?: string;
  links?: { label: string; href: string }[];
  bullets: string[];
}

export interface SkillGroup {
  label: string;
  items: string[];
}

export interface Credential {
  what: string;
  who?: string;
}

export interface Cv {
  name: string;
  positionLine: string;
  location: string;
  citizenship: string;
  email: string;
  github: string;
  linkedin: string;
  profile: string;
  headlineMetrics: Metric[];
  roles: Role[];
  projects: Project[];
  skills: SkillGroup[];
  credentials: Credential[];
}
