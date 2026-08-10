/**
 * The token categories a config may use, mapped to their Tailwind v4 theme
 * namespace.
 *
 * Config keys are camelCase so they read naturally in TypeScript, while the
 * value is the CSS variable prefix, which keeps the generated stylesheet
 * compatible with Tailwind's `@theme`. Only the four multi-word namespaces
 * differ from their key.
 *
 * @see https://tailwindcss.com/docs/theme
 */
export const TOKEN_CATEGORIES = {
  color: 'color',
  font: 'font',
  text: 'text',
  fontWeight: 'font-weight',
  tracking: 'tracking',
  leading: 'leading',
  tabSize: 'tab-size',
  breakpoint: 'breakpoint',
  container: 'container',
  spacing: 'spacing',
  radius: 'radius',
  shadow: 'shadow',
  insetShadow: 'inset-shadow',
  dropShadow: 'drop-shadow',
  blur: 'blur',
  perspective: 'perspective',
  zoom: 'zoom',
  aspect: 'aspect',
  ease: 'ease',
  animate: 'animate',
} as const;
