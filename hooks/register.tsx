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

// 已使用幾% 的圓圈顏色：20 以內淺綠、50 以內深綠、未滿 70 黃、70 以上紅
function usedColor(pct: number): string {
  if (pct <= 20) return '#86EFAC'
  if (pct <= 50) return '#16A34A'
  if (pct < 70) return '#FACC15'
  return '#EF4444'
}

// 灰底圓餅：整圈灰色，已使用的比例從 12 點鐘方向順時針填上顏色
function pieSvg(pct: number, color: string, label: string): string {
  const r = 7
  const p = Math.min(100, Math.max(0, pct))
  const bg = `<circle cx="${r}" cy="${r}" r="${r}" fill="#9CA3AF" fill-opacity="0.45"/>`
  let fg = ''
  if (p >= 100) {
    fg = `<circle cx="${r}" cy="${r}" r="${r}" fill="${color}"/>`
  } else if (p > 0) {
    const a = (p / 100) * 2 * Math.PI
    const x = (r + r * Math.sin(a)).toFixed(2)
    const y = (r - r * Math.cos(a)).toFixed(2)
    fg = `<path d="M${r} ${r} L${r} 0 A${r} ${r} 0 ${p > 50 ? 1 : 0} 1 ${x} ${y} Z" fill="${color}"/>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${2 * r}" height="${2 * r}" viewBox="0 0 ${2 * r} ${2 * r}"><title>${label}</title>${bg}${fg}</svg>`
}

// 終端機畫不了 SVG，用字元圓餅代替
function pieGlyph(pct: number): string {
  if (pct < 12.5) return '○'
  if (pct < 37.5) return '◔'
  if (pct < 62.5) return '◑'
  if (pct < 87.5) return '◕'
  return '●'
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
    const ui = $.ui.resolve(e)
    const { Box, Button, Text } = ui
    const time = ago(Math.max(tick, q.at) - q.at)

    let usage = null
    if (pct !== null) {
      const color = usedColor(pct)
      const alt = `上下文已使用 ${pct}%`
      // 前面的時間已經是數字，這裡只畫圓圈，用顏色區分；滑鼠移上去看得到幾%
      usage =
        e.surface !== 'terminal' && 'Svg' in ui ? (
          <ui.Svg source={pieSvg(pct, color, alt)} alt={alt} width={14} height={14} isInteractive />
        ) : (
          <Text color={color}>{pieGlyph(pct)}</Text>
        )
    }

    return (
      <Box>
        <Text dimColor>上一題（{time}{pct === null ? '）：' : '・'}</Text>
        {usage}
        {pct === null ? null : <Text dimColor>）：</Text>}
        <Text>{q.text} </Text>
        <Button key="hide" label="收起" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })
}
