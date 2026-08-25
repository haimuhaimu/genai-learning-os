import { Home, RefreshCw, TriangleAlert } from 'lucide-react'

type Go = (page: string, options?: Record<string, string>) => void
export default function RegistryFallback({ go, partial = false }: { go: Go; partial?: boolean }) {
  return <div className='registry-fallback' role={partial ? 'status' : 'alert'}><TriangleAlert aria-hidden='true' /><h2>{partial ? '部分内容暂未显示' : '内容目录暂不可用'}</h2><p>{partial ? '系统已隔离无法验证的条目，其余内容仍可正常使用。' : '内容目录没有完成加载。旧页面与全局导航仍可继续使用。'}</p><div><button type='button' onClick={() => window.location.reload()}><RefreshCw aria-hidden='true' />刷新页面</button><button type='button' className='is-quiet' onClick={() => go('unified-map')}><Home aria-hidden='true' />返回首页</button></div></div>
}
