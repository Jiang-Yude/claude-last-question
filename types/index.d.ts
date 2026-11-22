export type LastQuestion = { text: string; at: number }

declare module 'claude-code' {
  interface PluginState {
    'last-question': { last: LastQuestion | null; now: number; isHidden: boolean; used: number | null }
  }
}
