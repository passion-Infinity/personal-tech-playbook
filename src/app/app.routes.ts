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
    path: '**',
    title: 'Not found · Playbook',
    loadComponent: () => import('./pages/not-found').then((m) => m.NotFound),
  },
];
