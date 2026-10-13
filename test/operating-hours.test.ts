import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { formatTime12h, formatOperatingHours } from '../src/utils/operatingHours.ts';

describe('Operating Hours Formatter - Home Page & Footer', () => {
  test("1. Formats '09:00' to '9:00 AM'", () => {
    assert.equal(formatTime12h('09:00'), '9:00 AM');
  });

  test("2. Formats '19:00' to '7:00 PM'", () => {
    assert.equal(formatTime12h('19:00'), '7:00 PM');
  });

  test("3. Formats '00:00' to '12:00 AM' (midnight boundary)", () => {
    assert.equal(formatTime12h('00:00'), '12:00 AM');
  });

  test("4. Formats '12:30' to '12:30 PM' (noon / half-hour boundary)", () => {
    assert.equal(formatTime12h('12:30'), '12:30 PM');
  });

  test('5. Single time falls back gracefully when given empty or invalid value', () => {
    assert.equal(formatTime12h('', '9:00 AM'), '9:00 AM');
    assert.equal(formatTime12h(null, '9:00 AM'), '9:00 AM');
    assert.equal(formatTime12h(undefined, '7:00 PM'), '7:00 PM');
    assert.equal(formatTime12h('invalid-time', '9:00 AM'), '9:00 AM');
    assert.equal(formatTime12h('25:00', '9:00 AM'), '9:00 AM');
  });

  test("6. formatOperatingHours formats standard '09:00' and '19:00' to '9:00 AM to 7:00 PM'", () => {
    const formatted = formatOperatingHours('09:00', '19:00');
    assert.equal(formatted, '9:00 AM to 7:00 PM');
  });

  test("7. formatOperatingHours falls back to default '9:00 AM to 7:00 PM' on empty or invalid inputs", () => {
    assert.equal(formatOperatingHours('', ''), '9:00 AM to 7:00 PM');
    assert.equal(formatOperatingHours(null, null), '9:00 AM to 7:00 PM');
    assert.equal(formatOperatingHours(undefined, undefined), '9:00 AM to 7:00 PM');
    assert.equal(formatOperatingHours('invalid', 'garbage'), '9:00 AM to 7:00 PM');
  });

  test('8. formatOperatingHours formats custom hours accurately', () => {
    assert.equal(formatOperatingHours('08:30', '17:00'), '8:30 AM to 5:00 PM');
    assert.equal(formatOperatingHours('00:00', '12:30'), '12:00 AM to 12:30 PM');
  });
});
