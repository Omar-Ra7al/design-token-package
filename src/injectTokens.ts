import type { TokensApi, ThemeDefinition } from './types';

const STYLE_ATTRIBUTE = 'data-design-tokens';

type TokenSystem = Pick<TokensApi<Record<string, ThemeDefinition>>, 'css'>;

/**
 * Injects the generated token CSS into the document `<head>`.
 *
 * This function is safe to call in server-side environments.
 * When `document` is unavailable, it does nothing.
 *
 * Calling it multiple times updates the existing token stylesheet
 * instead of creating duplicate `<style>` elements.
 *
 * @param tokens - A token system created with `defineTokens()`.
 *
 * @returns A cleanup function that removes the injected stylesheet.
 */
export function injectTokens(tokens: TokenSystem): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  let style = document.head.querySelector<HTMLStyleElement>(`style[${STYLE_ATTRIBUTE}]`);

  if (!style) {
    style = document.createElement('style');
    style.setAttribute(STYLE_ATTRIBUTE, '');
    document.head.appendChild(style);
  }

  style.textContent = tokens.css();

  return () => {
    style?.remove();
  };
}
