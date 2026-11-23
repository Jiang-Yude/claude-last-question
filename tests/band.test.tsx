import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'last-question',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: 80, scroll: { offset: 0, bodyRows: 1 }, view: {} },
} as const

const ASK = { wait: false, origin: { kind: 'composer' } } as const

function usageAt(percent?: number) {
  return { value: { startedAt: 0, context: { window: 200000, percent }, rateLimits: [] } }
}

test('上一題那一列：時間用數字，已使用用灰底圓餅加顏色', async ($, on) => {
  on('clock.now', () => ({ value: 1_000_000 }))
  on('clock.every', () => ({ value: undefined }))
  on('session.usage', () => usageAt(27))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('session.measure', (_, e) => ({ changed: e.changed }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.prompt.submit({ text: '這個上一題提示列能不能加上已使用多少？', ...ASK })

  for (const surface of ['desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /上一題/ }))?.text).toBe('上一題（剛剛・')
    const pie = await ui.find({ type: 'Svg' })
    expect(pie?.props.alt).toBe('上下文已使用 27%')
    expect(String(pie?.props.source)).toContain('#16A34A')
    expect(String(pie?.props.source)).toContain('#9CA3AF')
    expect(await ui.find({ type: 'Text', text: /%/ })).toBeUndefined()
    await ui.unmount()
  }

  // 終端機畫不了 SVG，改用字元圓餅
  const term = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await term.find({ type: 'Text', text: '◔' }))?.props.color).toBe('#16A34A')
  await term.unmount()

  // 每輪結束引擎量一次，顏色跟著變：20 以內淺綠、50 以內深綠、未滿 70 黃、70 以上紅
  const cases: [number, string][] = [[20, '#86EFAC'], [21, '#16A34A'], [50, '#16A34A'], [51, '#FACC15'], [69, '#FACC15'], [70, '#EF4444']]
  for (const [percent, color] of cases) {
    await $.session.measure({ context: { window: 200000, percent }, rateLimits: [], changed: ['context'] })
    const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
    expect(String((await ui.find({ type: 'Svg' }))?.props.source)).toContain(color)
    await ui.unmount()
  }
})

test('還沒量到用量時只顯示時間', async ($, on) => {
  on('clock.now', () => ({ value: 5000 }))
  on('clock.every', () => ({ value: undefined }))
  on('session.usage', () => usageAt(undefined))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.prompt.submit({ text: '第一題', ...ASK })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /上一題/ }))?.text).toBe('上一題（剛剛）：')
  expect(await ui.find({ type: 'Svg' })).toBeUndefined()
  await ui.unmount()
})
