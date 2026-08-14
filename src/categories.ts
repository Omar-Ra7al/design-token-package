/**
 * The token categories a config may use, mapped to the prefix their CSS
 * variables carry.
 *
 * Config keys are camelCase so they read naturally in TypeScript, while the
 * value is the CSS variable prefix. Most categories use their Tailwind v4
 * theme namespace, so the generated stylesheet lines up with Tailwind's
 * `@theme`; only the four multi-word namespaces differ from their key.
 *
 * `color` and `custom` are deliberately unprefixed, which is the convention
 * shadcn/ui popularised: `--primary`, `--background`, `--navHeight`. Colors are
 * remapped into Tailwind via `tailwind()` (`--color-primary: var(--primary)`);
 * other categories are registered in place. `custom` has no Tailwind namespace.
 *
 * @see https://tailwindcss.com/docs/theme
 */
export const TOKEN_CATEGORIES = {
  color: '',
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
  custom: '',
} as const;

/**
 * The CSS variable name a token gets, without the leading `--`.
 *
 * `fontWeight.bold` → `font-weight-bold`, while the unprefixed categories keep
 * the bare token name: `color.primary` → `primary`.
 */
export function cssVariableName(category: keyof typeof TOKEN_CATEGORIES, name: string): string {
  const prefix = TOKEN_CATEGORIES[category];

  return prefix === '' ? name : `${prefix}-${name}`;
}
