import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Home, RefreshCw, TriangleAlert } from 'lucide-react'

type Props = { children: ReactNode; page: string; onHome: () => void }
type State = { error: Error | null }

export default class PageLoadErrorBoundary extends Component<Props, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error): State { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error(`[page-loader] ${this.props.page}`, error, info.componentStack)
  }
  componentDidUpdate(previous: Props) {
    if (previous.page !== this.props.page && this.state.error) this.setState({ error: null })
  }
  render() {
    if (!this.state.error) return this.props.children
    return <section className='lo-page-error' role='alert'><TriangleAlert aria-hidden='true' /><h1>页面暂时无法打开</h1><p>页面资源加载失败。你可以重试，或返回首页继续浏览。</p><div><button type='button' onClick={() => window.location.reload()}><RefreshCw aria-hidden='true' />重新加载</button><button type='button' className='is-quiet' onClick={this.props.onHome}><Home aria-hidden='true' />返回首页</button></div></section>
  }
}
