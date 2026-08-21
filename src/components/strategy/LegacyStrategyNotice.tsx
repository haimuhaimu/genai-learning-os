import { ArrowRight, Info } from 'lucide-react'

type Go = (page: string, options?: Record<string, string>) => void
export default function LegacyStrategyNotice({ go }: { go: Go }) {
  return <aside className='legacy-strategy-notice'><Info aria-hidden='true' /><p>这是旧版参考内容；想完成策略练习，请进入策略案例中心。</p><button type='button' onClick={() => go('strategy-cases')}>进入策略案例中心<ArrowRight aria-hidden='true' /></button></aside>
}
