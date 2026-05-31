import assert from 'node:assert/strict';
import test from 'node:test';

import { getJobMatchByJobId, listJobMatches, upsertJobMatch } from '@/data/job-match-repository';

test('job match repository stores and retrieves matches in fallback mode', async () => {
  const originalMatches = await listJobMatches();

  const updatedMatches = await upsertJobMatch({
    id: 'match-test',
    owner_id: 'local-user',
    job_id: 'job-test',
    profile_id: 'profile-test',
    analysis_status: 'done',
    overall_score: 84,
    semantic_score: 82,
    profile_match_score: 79,
    summary: 'Test match',
    strengths: ['Design Systems'],
    gaps: ['Salary'],
    recommendations: ['Update portfolio'],
    detected_keywords: ['design systems'],
    detected_skills: ['CSS'],
    model: 'test',
    raw_response: { source: 'test' },
    created_at: '2026-05-30T00:00:00.000Z',
    updated_at: '2026-05-30T00:00:00.000Z',
  });

  const loaded = await getJobMatchByJobId('job-test');

  assert.equal(loaded?.summary, 'Test match');
  assert.equal(loaded?.overall_score, 84);
  assert.equal(updatedMatches.length, originalMatches.length + 1);
});
