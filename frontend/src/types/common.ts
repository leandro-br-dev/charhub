/**
 * Common types shared across the application
 */

/**
 * Visibility levels for user-generated content
 * - PRIVATE: Only owner can access
 * - UNLISTED: Anyone with the link can access
 * - PUBLIC: Everyone can see and search
 */
export enum Visibility {
  PRIVATE = 'PRIVATE',
  UNLISTED = 'UNLISTED',
  PUBLIC = 'PUBLIC',
}

/**
 * Visibility label translations
 */
export const VISIBILITY_LABELS: Record<Visibility, string> = {
  [Visibility.PRIVATE]: 'Privado',
  [Visibility.UNLISTED]: 'Não listado',
  [Visibility.PUBLIC]: 'Público',
};

/**
 * Visibility description translations
 */
export const VISIBILITY_DESCRIPTIONS: Record<Visibility, string> = {
  [Visibility.PRIVATE]: 'Apenas você pode ver',
  [Visibility.UNLISTED]: 'Qualquer pessoa com o link pode ver',
  [Visibility.PUBLIC]: 'Todos podem ver e encontrar nas buscas',
};
