import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// twMerge : en cas de conflit (ex. bg-surface vs bg-red-50), la dernière classe gagne
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
