import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { siteConfig, PHYSICAL_PACKAGE_CONFIG } from '../src/config/site.ts';
import { OFFICIAL_FAQS } from '../src/config/faq.ts';

describe('Prompt 8 — Physical Academy Package Fees & Business Rules', () => {
  test('1. Physical package configuration values match approved business requirements', () => {
    assert.equal(siteConfig.physicalPackage.durationMonths, 6, 'Duration must be 6 months');
    assert.equal(siteConfig.physicalPackage.courseCount, 10, 'Package covers 10 courses together');
    assert.equal(siteConfig.physicalPackage.monthlyFee, 5040, 'Monthly lab charges must be Rs. 5,040');
    assert.equal(siteConfig.physicalPackage.totalPackage, 30240, 'Total package fee must be Rs. 30,240');
    assert.equal(siteConfig.physicalPackage.admissionFee, 0, 'Admission fee must be Rs. 0 (Free)');
    assert.equal(siteConfig.physicalPackage.noHiddenCharges, true, 'noHiddenCharges must be true');
    assert.equal(siteConfig.physicalPackage.schedule, 'Monday - Friday', 'Classes run Monday to Friday');
    assert.equal(siteConfig.physicalPackage.laptopProvided, false, 'No free personal laptop provided');
  });

  test('2. Total fee calculation integrity (Rs. 5,040 * 6 = Rs. 30,240)', () => {
    const calculatedTotal = siteConfig.physicalPackage.monthlyFee * siteConfig.physicalPackage.durationMonths;
    assert.equal(calculatedTotal, siteConfig.physicalPackage.totalPackage, 'Total fee must exactly equal monthlyFee * durationMonths');
    assert.equal(calculatedTotal, 30240, 'Calculated total must be Rs. 30,240');
  });

  test('3. PHYSICAL_PACKAGE_CONFIG export is identical to siteConfig.physicalPackage', () => {
    assert.deepEqual(PHYSICAL_PACKAGE_CONFIG, siteConfig.physicalPackage, 'PHYSICAL_PACKAGE_CONFIG must match siteConfig.physicalPackage');
  });

  test('4. Online course pricing remains separate and unchanged at Rs. 5,000 per course', () => {
    assert.equal(siteConfig.onlineCourses.defaultPrice, 5000, 'Online courses must remain Rs. 5,000 per course');
    assert.notEqual(
      siteConfig.onlineCourses.defaultPrice,
      siteConfig.physicalPackage.monthlyFee,
      'Online course fee (Rs. 5,000) and physical monthly lab charges (Rs. 5,040) must be distinguished'
    );
  });

  test('5. Official FAQ reflects approved physical package fee structure', () => {
    const feeFaq = OFFICIAL_FAQS.find((faq) => faq.id === 'faq-physical-package-fee');
    assert.ok(feeFaq, 'Physical package fee FAQ must exist');

    // Check English answer
    assert.match(feeFaq.answer, /5,040/, 'English FAQ answer must state Rs. 5,040 monthly lab charges');
    assert.match(feeFaq.answer, /30,240/, 'English FAQ answer must state Rs. 30,240 total for six months');
    assert.match(feeFaq.answer, /6 months/i, 'English FAQ answer must state 6 months duration');
    assert.match(feeFaq.answer, /10 courses/i, 'English FAQ answer must state 10 courses');
    assert.match(feeFaq.answer, /no admission fee/i, 'English FAQ answer must confirm no admission fee');
    assert.match(feeFaq.answer, /no hidden charges/i, 'English FAQ answer must confirm no hidden charges');
    assert.match(feeFaq.answer, /Monday - Friday/i, 'English FAQ answer must state Monday - Friday schedule');

    // Check Roman Urdu answer
    assert.match(feeFaq.answerRomanUrdu, /5,040/, 'Roman Urdu FAQ answer must state Rs. 5,040');
    assert.match(feeFaq.answerRomanUrdu, /30,240/, 'Roman Urdu FAQ answer must state Rs. 30,240');
    assert.match(feeFaq.answerRomanUrdu, /6 mah/i, 'Roman Urdu FAQ answer must state 6 mah');
    assert.match(feeFaq.answerRomanUrdu, /10 courses/i, 'Roman Urdu FAQ answer must state 10 courses');
  });

  test('6. Laptop facility FAQ clarifies computer lab workstations without claiming free laptops', () => {
    const laptopFaq = OFFICIAL_FAQS.find((faq) => faq.id === 'faq-laptop-facility');
    assert.ok(laptopFaq, 'Laptop facility FAQ must exist');
    assert.match(laptopFaq.answer, /computer lab facilities/i, 'Must clarify campus computer lab workstations');
    assert.doesNotMatch(laptopFaq.answer, /free laptop provided/i, 'Must not claim free laptops are given to keep');
  });

  test('7. Batch schedule matches Monday through Friday operational calendar', () => {
    assert.equal(siteConfig.workingDays, 'Monday - Friday');
    assert.equal(siteConfig.offDays, 'Saturday - Sunday');
    assert.equal(siteConfig.batches.length, 4, 'Must have 4 batches (2 girls, 2 boys)');
  });
});
