import { describe, it, expect } from 'vitest';

describe('Test Setup Verification', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to globals', () => {
    expect(expect).toBeDefined();
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
  });

  it('should have happy-dom environment', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });
});