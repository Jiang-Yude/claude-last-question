import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { LastQuestion } from '../types'

const last = atom({ plugin: 'last-question', key: 'last' } as const, null as LastQuestion | null)
const now = atom({ plugin: 'last-question', key: 'now' } as const, 0)
const isHidden = atom({ plugin: 'last-question', key: 'isHidden' } as const, false)
const used = atom({ plugin: 'last-question', key: 'used' } as const, null as number | null)

const MAX = 80

function oneLine(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  const chars = Array.from(flat)
  return chars.length > MAX ? chars.slice(0, MAX).join('') + '…' : flat
}

function ago(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return '剛剛'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} 分鐘前`
  const h = Math.floor(m / 60)
  return `${h} 小時 ${m % 60} 分前`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      const t = await $.clock.now()
      await update($, now, () => t)
    } catch {
      // 拿不到時間就等下一次計時
    }
    $.clock.every(60_000, () => {
      $.clock.now().then(t => update($, now, () => t)).catch(() => {})
    })
    try {
      const { context } = await $.session.usage()
      if (context.percent !== undefined) await update($, used, () => context.percent ?? null)
    } catch {
      // 讀不到用量就先不顯示
    }
    return next(e)
  })

  // 每輪結束引擎量一次上下文，跟右邊「背景資訊・已使用」同一個數字
  on('session.measure', async ($, e, next) => {
    const pct = e.context?.percent
    if (pct !== undefined) await update($, used, () => pct)
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (!e.command && !e.isMeta && e.text.trim() !== '') {
      try {
        const at = await $.clock.now()
        await update($, last, () => ({ text: oneLine(e.text), at }))
        await update($, now, () => at)
        await update($, isHidden, () => false)
      } catch {
        // 記錄失敗不擋送出
      }
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const q = await read($, last)
    if (e.props.hasSurvey || q === null || (await read($, isHidden))) {
      return next(e)
    }
    const tick = await read($, now)
    const pct = await read($, used)
    const usedText = pct === null ? '' : `・已使用 ${pct}%`
    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text dimColor>上一題（{ago(Math.max(tick, q.at) - q.at)}{usedText}）：</Text>
        <Text>{q.text} </Text>
        <Button key="hide" label="收起" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })
}
