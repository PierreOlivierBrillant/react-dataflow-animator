import { fr, type Messages } from './fr';
import { en } from './en';

export type Locale = 'fr' | 'en';
export type { Messages };

export const translations: Record<Locale, Messages> = { fr, en };
