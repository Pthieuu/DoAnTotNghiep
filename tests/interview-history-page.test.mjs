import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as jsxRuntime from 'react/jsx-runtime';
import { load, userId } from './helpers/weakness-practice-fixtures.mjs';
import { nodes, content } from './helpers/component-harness.mjs';
import { historyScore, loadInterviewHistory } from '../src/lib/interview-history.ts';

test('interview history page redirects unauthenticated visitor to /login', async () => {
  let redirected = null;
  const { default: Page } = load('src/app/interview-history/page.tsx', {
    'react/jsx-runtime': jsxRuntime,
    'next/link': { __esModule: true, default: () => null },
    'next/navigation': { redirect: url => { redirected = url; throw new Error('REDIRECT'); } },
    '@/lib/auth': { getUser: async () => null },
    '@/lib/supabase/server': { createClient: async () => ({}) },
    '@/lib/interview-history': {
      loadInterviewHistory: async () => ({ sessions: [], counts: { all: 0, completed: 0, in_progress: 0, cancelled: 0 }, totalCount: 0, filteredCount: 0, page: 1, pageSize: 10, pageCount: 1, filter: 'all', error: null }),
      historyScore: () => 'Not assessed',
    },
    '@/components/dashboard-shell': { __esModule: true, default: () => null },
    '@/components/icon': { __esModule: true, default: () => null },
  }, { URLSearchParams });

  await assert.rejects(async () => {
    await Page({ searchParams: Promise.resolve({}) });
  }, /REDIRECT/);
  assert.equal(redirected, '/login');
});

test('interview history page renders table, provisional scores and pagination for authenticated user', async () => {
  const sessions = [
    {
      id: 'session-1',
      title: 'Backend Engineer',
      company: 'Rakuten',
      level: 'N2',
      score: null,
      status: 'completed',
      completed_at: '2026-11-15T10:00:00Z',
      created_at: '2026-11-15T09:30:00Z',
      summary_json: { provisional: true, totalScore: 65 },
    },
    {
      id: 'session-2',
      title: 'Frontend Engineer',
      company: 'LINE Yahoo',
      level: 'N3',
      score: 80,
      status: 'in_progress',
      completed_at: null,
      created_at: '2026-11-14T10:00:00Z',
      summary_json: null,
    },
    {
      id: 'session-3',
      title: 'Fullstack Engineer',
      company: null,
      level: null,
      score: null,
      status: 'cancelled',
      completed_at: null,
      created_at: '2026-11-13T10:00:00Z',
      summary_json: null,
    },
  ];

  const mockData = {
    sessions,
    totalCount: 15,
    filteredCount: 15,
    page: 2,
    pageSize: 3,
    pageCount: 5,
    filter: 'all',
    counts: { all: 15, completed: 8, in_progress: 4, cancelled: 3 },
    error: null,
  };

  const DashboardShellMock = ({ children, activePage }) =>
    jsxRuntime.jsx('div', { 'data-testid': 'shell', 'data-active-page': activePage, children });

  const { default: Page } = load('src/app/interview-history/page.tsx', {
    'react/jsx-runtime': jsxRuntime,
    'next/link': {
      __esModule: true,
      default: props => jsxRuntime.jsx('a', { href: props.href, children: props.children }),
    },
    'next/navigation': { redirect: () => { throw new Error('Unexpected redirect'); } },
    '@/lib/auth': { getUser: async () => ({ id: userId, name: 'Test User' }) },
    '@/lib/supabase/server': { createClient: async () => ({}) },
    '@/lib/interview-history': {
      loadInterviewHistory: async () => mockData,
      historyScore,
    },
    '@/components/dashboard-shell': {
      __esModule: true,
      default: DashboardShellMock,
    },
    '@/components/icon': { __esModule: true, default: () => null },
  }, { URLSearchParams });

  const tree = await Page({ searchParams: Promise.resolve({ page: '2', filter: 'all' }) });
  assert.equal(tree.props.activePage, 'Interview History');

  const rendered = content(tree);
  assert.ok(rendered.includes('Interview History & AI Reports'));
  assert.ok(rendered.includes('Backend Engineer'));
  assert.ok(rendered.includes('Rakuten'));
  assert.ok(rendered.includes('65/100 (provisional)'));
  assert.ok(rendered.includes('LINE Yahoo'));
  assert.ok(rendered.includes('Page 2 of 5'));

  const trNodes = nodes(tree, node => node.type === 'tr');
  assert.equal(trNodes.length, 4); // 1 thead + 3 tbody

  const links = nodes(tree, node => typeof node.props?.href === 'string').map(n => n.props.href);
  assert.ok(links.some(h => h === '/summary?sessionId=session-1'));
  assert.ok(links.some(h => h === '/interview-room?sessionId=session-2'));
  assert.ok(links.some(h => h === '/interview-history?page=1'));
  assert.ok(links.some(h => h === '/interview-history?page=3'));
});

test('interview history loading component renders accessible skeleton and role=status', () => {
  const DashboardShellMock = ({ children, activePage }) =>
    jsxRuntime.jsx('div', { 'data-testid': 'shell', activePage, children });

  const { default: InterviewHistoryLoading } = load('src/app/interview-history/loading.tsx', {
    'react/jsx-runtime': jsxRuntime,
    '@/components/dashboard-shell': {
      __esModule: true,
      default: DashboardShellMock,
    },
  });

  const tree = InterviewHistoryLoading();
  assert.equal(tree.props.activePage, 'Interview History');

  const statusNodes = nodes(tree, node => node.props?.role === 'status');
  assert.equal(statusNodes.length, 1);
  assert.equal(statusNodes[0].props['aria-busy'], 'true');

  const rendered = content(tree);
  assert.ok(rendered.includes('Loading interview history...'));
  assert.ok(rendered.includes('Interview History'));
});

test('historyScore accurately formats scores, provisional calculations, and missing data', () => {
  assert.equal(historyScore({ score: 85, summary_json: null }), '85/100');
  assert.equal(historyScore({ score: 0, summary_json: null }), '0/100');
  assert.equal(historyScore({ score: null, summary_json: null }), 'Not assessed');
  assert.equal(historyScore({ score: null, summary_json: { provisional: true, totalScore: 72 } }), '72/100 (provisional)');
  assert.equal(historyScore({ score: 85, summary_json: { provisional: true, totalScore: 72 } }), '72/100 (provisional)');
  assert.equal(historyScore({ score: null, summary_json: { provisional: true, totalScore: null } }), 'Not assessed');
});
