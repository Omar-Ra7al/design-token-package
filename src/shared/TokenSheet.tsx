import type { TokenCssSource } from '../types';

export function TokenSheet({ tokens }: { tokens: TokenCssSource }) {
  return <style dangerouslySetInnerHTML={{ __html: tokens.stylesheet() }} />;
}
