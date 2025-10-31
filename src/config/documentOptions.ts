import type { DocumentOption } from '../types';

export const DOCUMENT_OPTIONS: DocumentOption[] = [
  {
    id: 'release-notes',
    label: 'Release Notes',
    description: 'Professional release notes for stakeholders',
    prompt: 'Create comprehensive release notes',
  },
  {
    id: 'training-guide',
    label: 'Training Guide',
    description: 'Step-by-step training documentation',
    prompt: 'Create a detailed training guide',
  },
  {
    id: 'email',
    label: 'Email Announcement',
    description: 'Ready-to-send email template',
    prompt: 'Create an email announcement',
  },
  {
    id: 'quick-ref',
    label: 'Quick Reference Card',
    description: 'One-page cheat sheet',
    prompt: 'Create a quick reference card',
  },
  {
    id: 'faq',
    label: 'FAQ Document',
    description: 'Frequently asked questions and answers',
    prompt: 'Create an FAQ document',
  },
  {
    id: 'manual',
    label: 'User Manual',
    description: 'Comprehensive user documentation',
    prompt: 'Create a user manual',
  },
  {
    id: 'tech-guide',
    label: 'App Support Technical Guide',
    description: 'Technical details for app support teams',
    prompt: 'Create a technical support guide',
  },
];
