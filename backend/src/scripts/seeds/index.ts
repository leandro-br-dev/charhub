/**
 * Seeds Index
 * Central entry point for all seed scripts
 */

import { seedLLMModelCatalog } from './llmModelCatalog';
import { seedSystemConfiguration } from './systemConfiguration';
import { seedStripePlans } from './seedStripePlans';
import { seedVisualStyles } from './seedVisualStyles';
import { seedLLMPricing } from './seedLLMPricing';

/**
 * Available seed scripts
 */
export const SEED_SCRIPTS = {
  'llm-models': {
    name: 'LLM Model Catalog',
    description: 'Populates the LLM model catalog with available models',
    function: seedLLMModelCatalog,
  },
  'system-configuration': {
    name: 'System Configuration',
    description: 'Initializes system configuration parameters',
    function: seedSystemConfiguration,
  },
  'stripe-plans': {
    name: 'Stripe Plans',
    description: 'Populates Stripe subscription plans',
    function: seedStripePlans,
  },
  'visual-styles': {
    name: 'Visual Styles',
    description: 'Populates character visual styles',
    function: seedVisualStyles,
  },
  'llm-pricing': {
    name: 'LLM Pricing',
    description: 'Populates LLM model pricing information',
    function: seedLLMPricing,
  },
} as const;

export type SeedScriptKey = keyof typeof SEED_SCRIPTS;
