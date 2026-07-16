export type ChipAction = 'improve' | 'concise' | 'addContext' | 'format';

export type GenerateResult = {
  text: string;
  injected?: string;
};

export function isChrome(): boolean {
  return typeof chrome !== 'undefined' && 'sidePanel' in chrome;
}
