import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_CRITERIA_CONFIG } from '@/data/criteria';
import { MOCK_JOBS } from '@/data/mock-jobs';
import { findWeightedSignalByKeyword } from '@/lib/job-criteria';
import { applyJobFilters } from '@/lib/job-filtering';
import { matchesCriterionPattern } from '@/lib/job-criteria';
import type { JobFilters } from '@/types/filter';

const DEFAULT_FILTERS: JobFilters = {
  query: '',
  source: [],
  modality: [],
  status: [],
  min_score: null,
  keywords: [],
  criteria: [],
  pending_analysis: false,
  show_hidden: false,
  show_criteria_hidden: false,
  sort: 'date',
  sort_dir: 'desc',
};

test('matchesCriterionPattern accepts slash-separated signal patterns', () => {
  assert.equal(matchesCriterionPattern('Looking for strong CSS skills', 'CSS / HTML'), true);
  assert.equal(matchesCriterionPattern('Looking for strong design skills', 'CSS / HTML'), false);
});

test('findWeightedSignalByKeyword matches active signal patterns and alternatives', () => {
  assert.equal(
    findWeightedSignalByKeyword('Design Systems', DEFAULT_CRITERIA_CONFIG)?.id,
    'ws-design-systems',
  );
  assert.equal(findWeightedSignalByKeyword('CSS', DEFAULT_CRITERIA_CONFIG)?.id, 'ws-css-html');
  assert.equal(
    findWeightedSignalByKeyword('CSS / HTML', DEFAULT_CRITERIA_CONFIG)?.id,
    'ws-css-html',
  );
  assert.equal(findWeightedSignalByKeyword('UI/UX', DEFAULT_CRITERIA_CONFIG), undefined);
});

test('applyJobFilters treats manual keywords literally', () => {
  const jobs = [
    {
      ...MOCK_JOBS[0],
      id: 'job-ui-ux',
      title: 'UI/UX Designer',
      description: 'Looking for UI/UX collaboration.',
      summary: 'Design role with UI focus.',
      final_score: 88,
    },
  ];

  const visibleJobs = applyJobFilters(
    jobs,
    {
      ...DEFAULT_FILTERS,
      keywords: ['UI/UX'],
    },
    DEFAULT_CRITERIA_CONFIG,
  );

  assert.deepEqual(visibleJobs.map((job) => job.id), ['job-ui-ux']);
});

test('applyJobFilters treats criteria ids as semantic filters', () => {
  const jobs = [
    {
      ...MOCK_JOBS[0],
      id: 'job-css-criteria',
      description: 'Strong CSS background and responsive UI work.',
      summary: 'Frontend-heavy role with HTML systems.',
      final_score: 91,
    },
  ];

  const visibleJobs = applyJobFilters(
    jobs,
    {
      ...DEFAULT_FILTERS,
      criteria: ['ws-css-html'],
    },
    DEFAULT_CRITERIA_CONFIG,
  );

  assert.deepEqual(visibleJobs.map((job) => job.id), ['job-css-criteria']);
});

test('applyJobFilters keeps manual keywords literal even when they resemble a criteria pattern', () => {
  const jobs = [
    {
      ...MOCK_JOBS[0],
      id: 'job-css-manual',
      description: 'Strong CSS background and responsive UI work.',
      summary: 'Frontend-heavy role with HTML systems.',
      final_score: 91,
    },
  ];

  const visibleJobs = applyJobFilters(
    jobs,
    {
      ...DEFAULT_FILTERS,
      keywords: ['CSS / HTML'],
    },
    DEFAULT_CRITERIA_CONFIG,
  );

  assert.deepEqual(visibleJobs, []);
});

test('applyJobFilters hides jobs excluded by active hard rules', () => {
  const jobs = [
    {
      ...MOCK_JOBS[0],
      id: 'job-hard-exclude',
      description: 'This is an unpaid internship with great visibility.',
      summary: 'Unpaid opportunity.',
      final_score: 92,
    },
  ];

  const visibleJobs = applyJobFilters(jobs, DEFAULT_FILTERS, DEFAULT_CRITERIA_CONFIG);

  assert.deepEqual(visibleJobs, []);
});

test('applyJobFilters does not hide jobs based on analyzed red flags alone', () => {
  const jobs = [
    {
      ...MOCK_JOBS[0],
      id: 'job-red-flag-only',
      description: 'Great product role with clear scope.',
      summary: 'Product design role.',
      red_flags: ['Salary not published'],
      final_score: 92,
    },
  ];

  const criteria = {
    ...DEFAULT_CRITERIA_CONFIG,
    hard_excludes: [
      {
        id: 'he-salary',
        pattern: 'salary',
        category: 'exclusion',
        reason: 'Salary is required for this test.',
        active: true,
      },
    ],
  };

  const visibleJobs = applyJobFilters(jobs, DEFAULT_FILTERS, criteria);

  assert.equal(visibleJobs.length, 1);
  assert.equal(visibleJobs[0]?.id, 'job-red-flag-only');
});

test('applyJobFilters can reveal criteria-hidden jobs when requested', () => {
  const jobs = [
    {
      ...MOCK_JOBS[0],
      id: 'job-hard-exclude-2',
      description: 'This is an unpaid internship with great visibility.',
      summary: 'Unpaid opportunity.',
      final_score: 92,
    },
  ];

  const visibleJobs = applyJobFilters(
    jobs,
    {
      ...DEFAULT_FILTERS,
      show_criteria_hidden: true,
    },
    DEFAULT_CRITERIA_CONFIG,
  );

  assert.equal(visibleJobs.length, 1);
  assert.equal(visibleJobs[0]?.id, 'job-hard-exclude-2');
});

test('applyJobFilters filters by status multi-select', () => {
  const jobs = [MOCK_JOBS[0], MOCK_JOBS[3]];

  const visibleJobs = applyJobFilters(
    jobs,
    {
      ...DEFAULT_FILTERS,
      status: ['saved'],
    },
    DEFAULT_CRITERIA_CONFIG,
  );

  assert.deepEqual(visibleJobs.map((job) => job.id), ['job-004']);
});
