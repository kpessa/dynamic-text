/**
 * Comprehensive TypeScript type definitions for Dynamic Text Editor
 * TPN (Total Parenteral Nutrition) application types
 */

// Firebase Timestamp placeholder until we have proper Firebase types
export interface FirebaseTimestamp {
  seconds: number;
  nanoseconds: number;
}

// User types
export interface User {
  uid: string;
  email?: string;
  displayName?: string;
  isAnonymous?: boolean;
}

// Population types
export type PopulationType = 'neonatal' | 'child' | 'adolescent' | 'adult';

export const POPULATION_TYPES = {
  NEO: 'neonatal' as const,
  CHILD: 'child' as const,
  ADOLESCENT: 'adolescent' as const,
  ADULT: 'adult' as const
} as const;

// Section types for dynamic text content
export interface Section {
  id: number;
  type: 'static' | 'dynamic';
  name?: string;
  content: string;
  testCases: TestCase[];
  populationType?: PopulationType;
}

export interface TestCase {
  id?: string;
  name: string;
  variables: Record<string, unknown>;
  expected?: string;
  matchType?: 'exact' | 'contains';
}

// NOTE format from imported configurations
export interface NoteItem {
  TEXT: string;
}

// TPN ingredient and reference types
export interface IngredientData {
  id?: string;
  name: string;
  category?: string;
  description?: string;
  unit?: string;
  type?: string;
  configSources?: string[];
  version?: number;
  lastModified?: FirebaseTimestamp;
  modifiedBy?: string;
  contentHash?: string;
  commitMessage?: string | null;
  createdAt?: FirebaseTimestamp;
  createdBy?: string;
  updatedAt?: FirebaseTimestamp;
  updatedBy?: string;
  isSharedMaster?: boolean;
  sharedIngredientId?: string | null;
  sharedCount?: number;
  referenceCount?: number;
  lastReferenceUpdate?: FirebaseTimestamp;
}

export interface ReferenceData {
  id?: string;
  name: string;
  healthSystem: string;
  domain: string;
  subdomain: string;
  version: string;
  populationType: PopulationType;
  ingredientId?: string;
  configId?: string;
  sections?: Section[];
  contentHash?: string;
  commitMessage?: string | null;
  validationStatus?: 'untested' | 'passed' | 'failed' | 'warning';
  validationNotes?: string;
  validatedBy?: string | null;
  validatedAt?: FirebaseTimestamp | null;
  testResults?: unknown | null;
  isShared?: boolean;
  sharedIngredientId?: string | null;
  sharedAt?: FirebaseTimestamp;
  autoDeduped?: boolean;
  isModified?: boolean;
  independentAt?: FirebaseTimestamp;
  revertedToBaseline?: FirebaseTimestamp;
  status?: string;
  versionNumber?: number;
  lastModified?: FirebaseTimestamp;
  modifiedBy?: string;
  createdAt?: FirebaseTimestamp;
  createdBy?: string;
  updatedAt?: FirebaseTimestamp;
  updatedBy?: string;
  unsharedAt?: FirebaseTimestamp;
}

// Imported configuration types
export interface ImportedIngredient {
  KEYNAME?: string;
  keyname?: string;
  Ingredient?: string;
  ingredient?: string;
  name?: string;
  DISPLAY?: string;
  display?: string;
  Description?: string;
  description?: string;
  NOTE?: NoteItem[];
  notes?: NoteItem[];
  Unit?: string;
  unit?: string;
  TYPE?: string;
  type?: string;
  UNITS?: string;
  MIN?: number;
  MAX?: number;
  DEFAULT?: number;
  CATEGORY?: string;
  index?: number;
  configId?: string;
  isBaseline?: boolean;
}

export interface ConfigData {
  INGREDIENT: ImportedIngredient[];
  healthSystem?: string;
  domain?: string;
  subdomain?: string;
  version?: string;
}

export interface ConfigMetadata {
  name?: string;
  healthSystem: string;
  domain: string;
  subdomain: string;
  version: string;
}

export interface ImportedConfig {
  id: string;
  name: string;
  healthSystem: string;
  domain: string;
  subdomain: string;
  version: string;
  ingredientCount: number;
  importedAt: FirebaseTimestamp;
  importedBy: string;
  metadata: ConfigMetadata;
  baselineId?: string;
}

// Duplicate detection types
export interface DuplicateIngredient {
  name: string;
  ingredientId: string;
  hash: string;
  existingConfigs: string[];
}

export interface VariationIngredient {
  name: string;
  ingredientId: string;
  importHash: string;
  existingHash: string;
  existingConfigs: string[];
}

export interface DuplicateGroup {
  hash: string;
  count: number;
  ingredients: string[];
}

export interface DuplicateReport {
  duplicatesFound: DuplicateGroup[];
  identicalIngredients: DuplicateIngredient[];
  variations: VariationIngredient[];
  totalChecked: number;
  error?: string;
  autoDedupeActions?: AutoDedupeAction[];
  autoDedupeEnabled?: boolean;
}

export interface AutoDedupeAction {
  ingredientId: string;
  name: string;
  hash: string;
  existingConfigs: string[];
  action: 'link';
  sharedIngredient?: SharedIngredient;
}

export interface ImportStats {
  totalIngredients: number;
  newIngredients: number;
  updatedIngredients: number;
  duplicatesFound: number;
  identicalIngredients: number;
  autoDeduped?: number;
}

// Shared ingredient types
export interface SharedIngredientReference {
  ingredientId: string;
  configId: string;
  healthSystem: string;
  domain: string;
  subdomain: string;
  version: string;
}

export interface SharedIngredient {
  id: string;
  masterIngredientId: string;
  contentHash: string;
  linkedReferences: SharedIngredientReference[];
  createdAt: FirebaseTimestamp;
  createdBy: string;
  updatedAt: FirebaseTimestamp;
  updatedBy: string;
  sharedAcross?: string[];
  lastModified?: FirebaseTimestamp;
}

export interface SharedIngredientInfo {
  sharedIngredientId: string;
  masterIngredientId: string;
  sharedAcross: string[];
  contentHash: string;
  createdAt: FirebaseTimestamp;
  lastModified?: FirebaseTimestamp;
}

export interface SharingCandidate {
  ingredientId: string;
  ingredientName: string;
  references: ReferenceWithId[];
  isShared: boolean;
  sharedIngredientId: string | null;
}

export interface ReferenceWithId extends ReferenceData {
  id: string;
}

// Variation detection types
export interface VariationMatch {
  ingredient: IngredientData;
  similarity: number;
  similarityPercent: number;
}

export interface VariationCluster {
  id: string;
  primary: IngredientData;
  variations: VariationMatch[];
  totalCount: number;
  mergeRecommended?: boolean;
  reason?: string;
}

export interface VariationStats {
  totalIngredients: number;
  variationClusters: number;
  highSimilarityGroups: number;
  mergeCandidates: number;
  potentialReduction: number;
}

export interface DifferenceHighlight {
  text: string;
  added?: boolean;
  removed?: boolean;
  match?: boolean;
}

export interface TextDifferences {
  text1: DifferenceHighlight[];
  text2: DifferenceHighlight[];
}

// TPN calculation types and validation
export interface TPNValues {
  [key: string]: number | string | boolean | undefined;
  DoseWeightKG?: number;
  VolumePerKG?: number;
  TotalVolume?: number;
  NonLipidVolTotal?: number;
  LipidVolTotal?: number;
  DexPercent?: number;
  OsmoValue?: number;
  InfuseOver?: number;
  LipidInfuseOver?: number;
  admixture?: string;
  IVAdminSite?: string;
  prefKNa?: string;
  ratioCLAc?: string;
  prefFatConcentration?: number;
  prefProteinConcentration?: number;
  // Macronutrients
  Protein?: number;
  Carbohydrates?: number;
  Fat?: number;
  TotalEnergy?: number;
  // Electrolytes
  Potassium?: number;
  Sodium?: number;
  Calcium?: number;
  Magnesium?: number;
  Phosphate?: number;
  Chloride?: number;
  Acetate?: number;
  // Additives
  MultiVitamin?: number;
  TraceElements?: number;
  Insulin?: number;
  Heparin?: number;
}

export interface WeightData {
  ideal: number;
  actual: number;
  obese: number;
}

export interface TPNData {
  RREC: {
    INGREDIENT_map: Record<string, unknown>;
    META: {
      PERIPHERAL_OSMOLARITY_MAXIMUM: number;
    };
  };
}

export interface ElectrolyteToSaltResult {
  SodiumChloride: number;
  SodiumAcetate: number;
  SodiumPhosphate: number;
  PotassiumChloride: number;
  PotassiumAcetate: number;
  PotassiumPhosphate: number;
  CalciumGluconate: number;
  MagnesiumSulfate: number;
  Chloride: number;
  Acetate: number;
  KorNaPhos: string;
  log: unknown[];
  Error: string;
}

// Reference range validation types
export interface ReferenceRange {
  THRESHOLD: string;
  VALUE: number;
}

export interface RangeChecker {
  constraints: number;
  Feasible_Low: ReferenceRange | null;
  Critical_Low: ReferenceRange | null;
  Normal_Low: ReferenceRange | null;
  Normal_High: ReferenceRange | null;
  Critical_High: ReferenceRange | null;
  Feasible_High: ReferenceRange | null;
}

export interface ValidationResult {
  status: 'valid' | 'invalid';
  severity: 'soft' | 'firm' | 'hard' | null;
  message: string;
  threshold: number | null;
  thresholdName: string;
}

export interface ValidationEvent {
  timestamp: number;
  keyname: string;
  oldValue: number;
  enteredValue: number;
  acceptedValue: number;
  severity: string;
  threshold: number;
  message: string;
  userAction: string;
}

export interface InputValidationResult {
  acceptedValue: number;
  isValid: boolean;
  validation: ValidationResult;
}

// Ingredient configuration types
export interface IngredientConfig {
  KEYNAME: string;
  DISPLAY: string;
  UOM_DISP: string;
  PRECISION: number;
  NOTE: NoteItem[];
  REFERENCE_RANGE: ReferenceRange[];
  UNITS?: string;
  MIN?: number;
  MAX?: number;
  DEFAULT?: number;
  CATEGORY?: string;
  EDITMODE?: string;
  rangeChecker?: RangeChecker;
}

export interface IngredientDisplay {
  name: string;
  unit: string;
  precision: number;
  editMode: string;
}

// Preference types
export interface UserPreferences {
  autoDeduplicateOnImport: boolean;
  showDeduplicationPrompt: boolean;
  deduplicationThreshold: number;
  preserveImportHistory: boolean;
}

// Service response types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateSharedIngredientResponse {
  success: boolean;
  sharedId?: string;
  error?: string;
}

export interface SharedStatus {
  isShared: boolean;
  sharedIngredientId: string | null;
  sharedCount?: number;
}

export interface ComparisonResult {
  status: 'NEW' | 'DELETED' | 'CLEAN' | 'MODIFIED' | 'ERROR';
  differences: {
    baseline: Section[];
    working: Section[];
  } | null;
}

export interface MigrationResult {
  ingredientCount: number;
  referenceCount: number;
}

export interface ImportResult {
  configId: string;
  duplicateReport: DuplicateReport;
  importStats: ImportStats;
}

// Audit types
export interface AuditLogEntry {
  action: string;
  details: Record<string, unknown>;
  userId: string;
  timestamp: FirebaseTimestamp;
}

// Firebase collections
export interface Collections {
  INGREDIENTS: string;
  HEALTH_SYSTEMS: string;
  AUDIT_LOG: string;
}

// Legacy element wrapper types
export interface LegacyElementWrapper {
  selector: string;
  values: Record<string, unknown>;
  length: number;
  val(value?: unknown): unknown;
  text(value?: unknown): unknown;
  data(key: string): unknown;
  prop(key: string, value?: unknown): unknown;
  is(selector: string): boolean;
  find(selector: string): LegacyElementWrapper;
  addClass(className: string): LegacyElementWrapper;
  removeClass(className: string): LegacyElementWrapper;
  closest(selector: string): LegacyElementWrapper;
}

// TPN valid key categories
export interface TPNValidKeys {
  BASIC_PARAMETERS: readonly string[];
  ROUTE: readonly string[];
  MACRONUTRIENTS: readonly string[];
  ELECTROLYTES: readonly string[];
  SALTS: readonly string[];
  ADDITIVES: readonly string[];
  PREFERENCES: readonly string[];
  CALCULATED_VOLUMES: readonly string[];
  CLINICAL_CALCULATIONS: readonly string[];
  WEIGHT_CALCULATIONS: readonly string[];
  ORDER_COMMENTS: readonly string[];
  RADIO_BUTTONS: readonly string[];
  UI_ELEMENTS: readonly string[];
  LEGACY_ALIASES: readonly string[];
}

// Calculated value dependencies
export interface CalculatedValueDependencies {
  readonly [key: string]: readonly string[];
}

// Key extraction result
export type ExtractedKeys = string[];

// Content hashing types
export interface HashableContent {
  sections?: Section[];
  NOTE?: NoteItem[];
  notes?: NoteItem[];
  [key: string]: unknown;
}

export interface DuplicateMap {
  [hash: string]: HashableContent[];
}

// Export format types
export interface ExportableConfig {
  healthSystem: string;
  domain: string;
  subdomain: string;
  version: string;
  INGREDIENT: ExportableIngredient[];
}

export interface ExportableIngredient {
  KEYNAME: string;
  DISPLAY: string;
  TYPE: string;
  NOTE: NoteItem[];
  UNITS?: string;
  MIN?: number;
  MAX?: number;
  DEFAULT?: number;
  CATEGORY?: string;
}
