import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'last-question',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: 80, scroll: { offset: 0, bodyRows: 1 }, view: {} },
} as const

test('上一題那一列顯示時間與已使用 %', async ($, on) => {
  let t = 1_000_000
  on('clock.now', () => ({ value: t }))
  on('clock.every', () => ({ value: undefined }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200000, tokens: 54000, percent: 27 }, rateLimits: [] } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('session.measure', (_, e) => ({ changed: e.changed }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.prompt.submit({ text: '這個上一題提示列能不能加上已使用多少？', wait: false, origin: { kind: 'composer' } })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /上一題/ }))?.text).toBe('上一題（剛剛・已使用 27%）：')
    await ui.unmount()
  }

  // 每輪結束引擎量一次，數字跟著變
  await $.session.measure({ context: { window: 200000, tokens: 66000, percent: 33 }, rateLimits: [], changed: ['context'] })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /上一題/ }))?.text).toBe('上一題（剛剛・已使用 33%）：')
  await ui.unmount()
})

test('還沒量到用量時只顯示時間', async ($, on) => {
  on('clock.now', () => ({ value: 5000 }))
  on('clock.every', () => ({ value: undefined }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200000 }, rateLimits: [] } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.prompt.submit({ text: '第一題', wait: false, origin: { kind: 'composer' } })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /上一題/ }))?.text).toBe('上一題（剛剛）：')
  await ui.unmount()
})
