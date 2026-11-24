import { describe, it, expect } from 'vitest';
import { runAdversarialStressSuite } from '../adversarialSuite';

describe('Adversarial Red-Team Forensic Stress Test Suite', () => {
  it('executes 20 adversarial penetration tests and achieves >= 95% pass rate', async () => {
    const result = await runAdversarialStressSuite();

    expect(result.totalTests).toBe(20);
    expect(result.passedTests).toBeGreaterThanOrEqual(19);
    expect(result.overallScore).toBeGreaterThanOrEqual(95);
    expect(result.executionTimeMs).toBeLessThan(4000); // Fast budget
  });
});
