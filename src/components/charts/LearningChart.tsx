import { ResponsiveContainer } from 'recharts'

export type ChartDatum = Record<string, string | number>
export type ChartSeries = { key: string; name: string; color?: string }
export type LearningChartProps = {
  data: ChartDatum[]
  kind: 'line' | 'area' | 'bar'
  xKey: string
  series: ChartSeries[]
  height?: number
  valueFormat?: 'percent' | 'tflops'
  showLegend?: boolean
}

const colors = ['#2759d7', '#6987df', '#9aafe9']
const formatValue = (format: LearningChartProps['valueFormat'], value: number) => format === 'percent' ? `${Math.round(value * 100)}%` : format === 'tflops' ? `${value.toFixed(2)} TFLOPs` : String(Math.round(value * 100) / 100)
const colorOf = (series: ChartSeries[], index: number) => series[index].color ?? colors[index % colors.length]

function Chart({ data, kind, xKey, series, valueFormat, showLegend = true, width = 640, height = 280 }: LearningChartProps & { width?: number; height?: number }) {
  const top = showLegend ? 42 : 16, left = 58, right = 18, bottom = 42
  const w = Math.max(1, width - left - right), h = Math.max(1, height - top - bottom)
  const values = data.flatMap((item) => series.map(({ key }) => Number(item[key])).filter(Number.isFinite))
  const min = Math.min(0, ...values), max = Math.max(1, ...values), span = max - min || 1
  const x = (index: number) => left + (data.length < 2 ? w / 2 : index * w / (data.length - 1))
  const y = (value: number) => top + h - (value - min) / span * h
  const points = (key: string) => data.map((item, index) => `${x(index)},${y(Number(item[key]))}`).join(' ')
  const ticks = [0, .25, .5, .75, 1]
  const barGroup = w / Math.max(data.length, 1), barWidth = Math.max(2, Math.min(34, barGroup * .72 / Math.max(series.length, 1)))
  return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role='img' aria-label={`${kind === 'bar' ? '柱状' : kind === 'area' ? '面积' : '折线'}图`}>
    {showLegend ? series.map((item, index) => <g key={item.key} transform={`translate(${left + index * 150} 18)`}><rect width='18' height='4' y='6' rx='2' fill={colorOf(series, index)} /><text x='25' y='12' fontSize='12' fill='currentColor'>{item.name}</text></g>) : null}
    {ticks.map((tick) => { const py = top + h * tick, value = max - span * tick; return <g key={tick}><line x1={left} x2={left + w} y1={py} y2={py} stroke='#d7deea' strokeDasharray='3 3' /><text x={left - 8} y={py + 4} textAnchor='end' fontSize='11' fill='currentColor'>{formatValue(valueFormat, value)}</text></g> })}
    {data.map((item, index) => <text key={index} x={x(index)} y={top + h + 24} textAnchor='middle' fontSize='11' fill='currentColor'>{String(item[xKey])}</text>)}
    {kind === 'bar' ? data.flatMap((item, dataIndex) => series.map((entry, seriesIndex) => { const value = Number(item[entry.key]), px = left + dataIndex * barGroup + (barGroup - barWidth * series.length) / 2 + seriesIndex * barWidth, py = y(value); return <rect key={`${entry.key}-${dataIndex}`} x={px} y={py} width={barWidth - 2} height={top + h - py} rx='4' fill={colorOf(series, seriesIndex)}><title>{`${item[xKey]}，${entry.name}：${formatValue(valueFormat, value)}`}</title></rect> })) : series.map((entry, index) => <g key={entry.key}>{kind === 'area' ? <polygon points={`${left},${top + h} ${points(entry.key)} ${left + w},${top + h}`} fill={colorOf(series, index)} opacity='.2' /> : null}<polyline points={points(entry.key)} fill='none' stroke={colorOf(series, index)} strokeWidth='2' strokeLinejoin='round' />{data.map((item, dataIndex) => { const value = Number(item[entry.key]); return <circle key={dataIndex} cx={x(dataIndex)} cy={y(value)} r='5' fill={colorOf(series, index)} opacity='.001'><title>{`${item[xKey]}，${entry.name}：${formatValue(valueFormat, value)}`}</title></circle> })}</g>)}
  </svg>
}

export default function LearningChart(props: LearningChartProps) {
  return <ResponsiveContainer width='100%' height={props.height ?? 280}><Chart {...props} /></ResponsiveContainer>
}
