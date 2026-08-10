import type { ThemeDefinition, TokensApi } from '../types';

export function TokenSheet<TThemes extends Record<string, ThemeDefinition>>({
  tokens,
}: {
  tokens: TokensApi<TThemes>;
}) {
  return <style dangerouslySetInnerHTML={{ __html: tokens.css() }} />;
}
