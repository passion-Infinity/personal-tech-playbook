import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Personal Tech Playbook',
    loadComponent: () => import('./pages/playbook-list').then((m) => m.PlaybookList),
  },
  {
    path: 'playbooks/:id',
    loadComponent: () => import('./pages/playbook-reader').then((m) => m.PlaybookReader),
  },
  {
    path: 'keywords',
    title: 'Search Hooks · Playbook',
    loadComponent: () => import('./pages/keyword-directory').then((m) => m.KeywordDirectory),
  },
  {
    path: 'roadmap',
    title: 'Roadmap · Playbook',
    loadComponent: () => import('./pages/roadmap').then((m) => m.Roadmap),
  },
  {
    path: 'practice',
    title: 'Luyện tập · Playbook',
    loadComponent: () => import('./pages/practice').then((m) => m.Practice),
  },
  {
    path: 'practice/drill',
    title: 'Drill · Playbook',
    loadComponent: () => import('./pages/drill').then((m) => m.Drill),
  },
  {
    path: 'practice/challenges',
    title: 'Design Challenge · Playbook',
    loadComponent: () => import('./pages/challenges').then((m) => m.Challenges),
  },
  {
    path: 'practice/challenge/:id',
    title: 'Design Challenge · Playbook',
    loadComponent: () => import('./pages/challenge').then((m) => m.Challenge),
  },
  {
    path: 'flashcards',
    title: 'Flashcards · Playbook',
    loadComponent: () => import('./pages/flashcards').then((m) => m.Flashcards),
  },
  {
    path: '**',
    title: 'Not found · Playbook',
    loadComponent: () => import('./pages/not-found').then((m) => m.NotFound),
  },
];
