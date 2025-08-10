export interface TPNInstance {
  values: Record<string, any>;
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