import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as jsxRuntime from 'react/jsx-runtime';
import { load, sourceId, userId } from './helpers/weakness-practice-fixtures.mjs';
import { nodes, content } from './helpers/component-harness.mjs';

test('practice page redirects unauthenticated visitor to /login', async () => {
  let redirected = null;
  const { default: Page } = load('src/app/practice/page.tsx', {
    'react/jsx-runtime': jsxRuntime,
    'next/navigation': { redirect: url => { redirected = url; throw new Error('REDIRECT'); } },
    '@/lib/auth': { getUser: async () => null },
    '@/lib/supabase/server': { createClient: async () => ({}) },
    '@/lib/dashboard-practice': { loadDashboardPractice: async () => ({ session: null, targets: [] }) },
    '@/components/dashboard-shell': { __esModule: true, default: () => null },
    '@/components/dashboard-practice': { __esModule: true, default: () => null },
  });

  await assert.rejects(async () => {
    await Page();
  }, /REDIRECT/);
  assert.equal(redirected, '/login');
});

test('practice page renders dedicated practice view for authenticated user', async () => {
  const practiceData = {
    session: { id: sourceId, title: 'Engineer' },
    targets: [{ criterionId: 'C01', name: 'Trải nghiệm thực tế', suggestion: 'Gợi ý', sources: [{ level: 1 }] }],
    practiceAvailable: true,
    error: null,
  };

  const DashboardPracticeMock = () => jsxRuntime.jsx('div', { 'data-testid': 'dashboard-practice' });
  const DashboardShellMock = ({ children }) => jsxRuntime.jsx('div', { 'data-testid': 'shell', children });

  const { default: Page } = load('src/app/practice/page.tsx', {
    'react/jsx-runtime': jsxRuntime,
    'next/navigation': { redirect: () => { throw new Error('Unexpected redirect'); } },
    '@/lib/auth': { getUser: async () => ({ id: userId, name: 'User' }) },
    '@/lib/supabase/server': { createClient: async () => ({}) },
    '@/lib/dashboard-practice': { loadDashboardPractice: async () => practiceData },
    '@/components/dashboard-shell': {
      __esModule: true,
      default: DashboardShellMock,
    },
    '@/components/dashboard-practice': {
      __esModule: true,
      default: DashboardPracticeMock,
    },
  });

  const tree = await Page();
  assert.equal(tree.props.activePage, 'Practice Weaknesses');
  assert.ok(content(tree).includes('Practice Weaknesses'));

  const practiceNodes = nodes(tree, node => node.type === DashboardPracticeMock);
  assert.equal(practiceNodes.length, 1);
  assert.deepEqual(practiceNodes[0].props.data, practiceData);
});

test('weakness-practice route redirects to /practice', () => {
  let redirected = null;
  const { default: RedirectPage } = load('src/app/weakness-practice/page.tsx', {
    'next/navigation': { redirect: url => { redirected = url; } },
  });

  RedirectPage();
  assert.equal(redirected, '/practice');
});

test('practice loading component renders accessible loading shell and status', () => {
  const DashboardShellMock = ({ children, activePage }) => jsxRuntime.jsx('div', {
    'data-testid': 'shell',
    'data-active-page': activePage,
    children,
  });

  const { default: PracticeLoading } = load('src/app/practice/loading.tsx', {
    'react/jsx-runtime': jsxRuntime,
    '@/components/dashboard-shell': {
      __esModule: true,
      default: DashboardShellMock,
    },
  });

  const tree = PracticeLoading();
  assert.equal(tree.props.activePage, 'Practice Weaknesses');
  const rendered = content(tree);
  assert.ok(rendered.includes('Loading practice recommendations...'));
  assert.ok(rendered.includes('Practice Weaknesses'));

  const statusNodes = nodes(tree, node => node.props?.role === 'status');
  assert.equal(statusNodes.length, 1);
  assert.equal(statusNodes[0].props['aria-busy'], 'true');
});
