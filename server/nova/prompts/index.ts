export { NOVA_SYSTEM_PROMPT_FR, NOVA_CLASSIFICATION_PROMPT_FR, NOVA_VERIFICATION_PROMPT_FR, NOVA_TEXT_ASSEMBLY_PROMPT_FR } from './system-fr';
export { NOVA_SYSTEM_PROMPT_EN, NOVA_CLASSIFICATION_PROMPT_EN, NOVA_VERIFICATION_PROMPT_EN, NOVA_TEXT_ASSEMBLY_PROMPT_EN } from './system-en';

import { NOVA_SYSTEM_PROMPT_FR, NOVA_CLASSIFICATION_PROMPT_FR, NOVA_VERIFICATION_PROMPT_FR, NOVA_TEXT_ASSEMBLY_PROMPT_FR } from './system-fr';
import { NOVA_SYSTEM_PROMPT_EN, NOVA_CLASSIFICATION_PROMPT_EN, NOVA_VERIFICATION_PROMPT_EN, NOVA_TEXT_ASSEMBLY_PROMPT_EN } from './system-en';

type Locale = 'fr' | 'en';

export function getSystemPrompt(locale: Locale): string {
  return locale === 'fr' ? NOVA_SYSTEM_PROMPT_FR : NOVA_SYSTEM_PROMPT_EN;
}

export function getClassificationPrompt(locale: Locale): string {
  return locale === 'fr' ? NOVA_CLASSIFICATION_PROMPT_FR : NOVA_CLASSIFICATION_PROMPT_EN;
}

export function getVerificationPrompt(locale: Locale): string {
  return locale === 'fr' ? NOVA_VERIFICATION_PROMPT_FR : NOVA_VERIFICATION_PROMPT_EN;
}

export function getTextAssemblyPrompt(locale: Locale): string {
  return locale === 'fr' ? NOVA_TEXT_ASSEMBLY_PROMPT_FR : NOVA_TEXT_ASSEMBLY_PROMPT_EN;
}
