import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateProgressPercentage } from '../src/services/studentLmsService.ts';

describe('Student LMS - Progress Percentage Calculation', () => {
  test('1. Returns 0% when no lessons are completed', () => {
    assert.equal(calculateProgressPercentage(0, 10), 0);
  });

  test('2. Returns 50% when half of lessons are completed', () => {
    assert.equal(calculateProgressPercentage(5, 10), 50);
  });

  test('3. Returns 100% when all lessons are completed', () => {
    assert.equal(calculateProgressPercentage(10, 10), 100);
  });

  test('4. Rounds correctly for fractional percentages', () => {
    // 1 / 3 = 33.333% -> 33%
    assert.equal(calculateProgressPercentage(1, 3), 33);
    // 2 / 3 = 66.666% -> 67%
    assert.equal(calculateProgressPercentage(2, 3), 67);
    // 1 / 6 = 16.666% -> 17%
    assert.equal(calculateProgressPercentage(1, 6), 17);
  });

  test('5. Safely handles 0 total lessons without NaN or division by zero', () => {
    assert.equal(calculateProgressPercentage(0, 0), 0);
    assert.equal(calculateProgressPercentage(5, 0), 0);
    assert.equal(calculateProgressPercentage(0, -5), 0);
  });

  test('6. Safely handles negative or invalid completed numbers', () => {
    assert.equal(calculateProgressPercentage(-1, 10), 0);
    assert.equal(calculateProgressPercentage(NaN, 10), 0);
  });

  test('7. Caps progress at 100% if completed count exceeds total lessons', () => {
    assert.equal(calculateProgressPercentage(15, 10), 100);
  });
});
