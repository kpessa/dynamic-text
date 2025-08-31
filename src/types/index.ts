// Section types
export interface Section {
  id: string | number;
  type: 'static' | 'dynamic';
  content: string;
  testCases?: TestCase[];
}

export interface TestCase {
  id: string;
  name: string;
  variables: Record<string, any>;
  expectedOutput?: string;
  expectedStyles?: Record<string, string>;
  matchType?: 'exact' | 'contains' | 'regex';
  testResult?: TestResult;
}

export interface TestResult {
  passed: boolean;
  actualOutput: string;
  actualStyles?: Record<string, string>;
  error?: string;
  timestamp?: number;
}

// TPN types
export interface TPNValues {
  [key: string]: number | string;
}

export interface TPNInstance {
  getValue: (key: string) => number;
  populationType?: string;
  advisorType?: 'NEO' | 'CHILD' | 'ADOLESCENT' | 'ADULT';
}

// TPN Advisor Types
export type TPNAdvisorType = 'NEO' | 'CHILD' | 'ADOLESCENT' | 'ADULT';
export type TPNAdvisorAlias = 'neonatal' | 'child' | 'adolescent' | 'adult' | 'infant';

// Ingredient types
export interface Ingredient {
  id: string;
  name: string;
  category: string;
  description?: string;
  contentHash?: string;
  configSources?: string[];
  referenceCount?: number;
  createdAt?: any;
  updatedAt?: any;
  userId?: string;
  version?: number;
  sections?: Section[];
  NOTE?: string | string[];
  notes?: string | string[];
}

export interface Reference {
  id: string;
  ingredientId: string;
  configId: string;
  healthSystem: string;
  domain: string;
  subdomain: string;
  populationType: string;
  sections: Section[];
  version: number;
  createdAt?: any;
  updatedAt?: any;
  userId?: string;
}

// Config types
export interface Config {
  id: string;
  healthSystem: string;
  domain: string;
  subdomain: string;
  version: string;
  ingredientCount: number;
  createdAt?: any;
  updatedAt?: any;
  userId?: string;
}

export interface ImportedConfig {
  INGREDIENT: ImportedIngredient[];
  healthSystem?: string;
  domain?: string;
  subdomain?: string;
  version?: string;
}

export interface ImportedIngredient {
  KEYNAME?: string;
  keyname?: string;
  Ingredient?: string;
  ingredient?: string;
  name?: string;
  NOTE?: string | string[];
  notes?: string | string[];
}

// Report types
export interface DuplicateReport {
  duplicatesFound: DuplicateItem[];
  identicalIngredients: IdenticalItem[];
  variations: VariationItem[];
  totalChecked: number;
  importStats?: ImportStats;
  autoDedupeEnabled?: boolean;
  autoDedupeActions?: AutoDedupeAction[];
  error?: string;
}

export interface DuplicateItem {
  hash: string;
  count: number;
  ingredients: string[];
}

export interface IdenticalItem {
  name: string;
  ingredientId: string;
  hash: string;
  existingConfigs: string[];
}

export interface VariationItem {
  name: string;
  ingredientId: string;
  importHash: string;
  existingHash: string;
  existingConfigs: string[];
}

export interface ImportStats {
  totalImported: number;
  newIngredients: number;
  updatedIngredients: number;
  duplicatesFound: number;
  identicalIngredients: number;
}

export interface AutoDedupeAction {
  name: string;
  existingConfigs: string[];
}

// Preference types
export interface Preferences {
  autoDeduplicateOnImport: boolean;
  defaultHealthSystem?: string;
  defaultDomain?: string;
}

// Firebase user type
export interface FirebaseUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  isAnonymous?: boolean;
}