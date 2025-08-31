// TPN Advisor Types
export type TPNAdvisorType = 'NEO' | 'CHILD' | 'ADOLESCENT' | 'ADULT';

export type TPNAdvisorAlias = 'neonatal' | 'child' | 'adolescent' | 'adult' | 'infant';

export interface TPNAdvisorMapping {
  readonly NEO: 'neonatal' | 'infant';
  readonly CHILD: 'child';
  readonly ADOLESCENT: 'adolescent';
  readonly ADULT: 'adult';
}

export interface TPNAdvisorAliasMap {
  readonly infant: 'NEO';
  readonly neonatal: 'NEO';
  readonly child: 'CHILD';
  readonly adolescent: 'ADOLESCENT';
  readonly adult: 'ADULT';
  // Note: 'pediatric' would map to both CHILD and ADOLESCENT
  readonly pediatric: 'CHILD' | 'ADOLESCENT';
}

export interface TPNInstance {
  values: Record<string, any>;
  advisorType?: TPNAdvisorType;
  // Add other TPN instance properties as needed
}

export interface TPNValues {
  [key: string]: any;
}

export interface MockMeInterface {
  getValue: (key: string) => any;
  maxP: (value: number, precision?: number) => string;
  calculate?: (expression: string) => any;
}