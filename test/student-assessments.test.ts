import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeAnswers } from '../api/student/assessments.ts';

const qs = [
  { id: 'q1', question_text_en: 'A', question_text_roman: 'A', options: [], correct_option_id: 'a', marks: 2 },
  { id: 'q2', question_text_en: 'B', question_text_roman: 'B', options: [], correct_option_id: 'b', marks: 1 },
];

test('grades by marks and never trusts missing answers', () => {
  const r = gradeAnswers(qs, { q1: 'a' });
  assert.equal(r.score, 2);
  assert.equal(r.maxScore, 3);
  assert.equal(r.percentage, 66.67);
  assert.equal(r.review[1].isCorrect, false);
});

test('all correct = 100%', () => {
  assert.equal(gradeAnswers(qs, { q1: 'a', q2: 'b' }).percentage, 100);
});
