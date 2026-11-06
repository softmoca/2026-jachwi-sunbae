export type DetailTab = 'details' | 'checklist';

export const parseDetailTab = (value: string | null): DetailTab | null =>
  value === 'details' || value === 'checklist' ? value : null;
