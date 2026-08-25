import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

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
const formatValue = (format: LearningChartProps['valueFormat'], value: unknown) => {
  const number = Number(value)
  if (format === 'percent') return `${Math.round(number * 100)}%`
  if (format === 'tflops') return `${number.toFixed(2)} TFLOPs`
  return value as number | string
}

export default function LearningChart({ data, kind, xKey, series, height = 280, valueFormat, showLegend = true }: LearningChartProps) {
  const common = <><CartesianGrid strokeDasharray='3 3' stroke='#d7deea' /><XAxis dataKey={xKey} tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} tickFormatter={valueFormat ? (value) => String(formatValue(valueFormat, value)) : undefined} /><Tooltip formatter={valueFormat ? (value) => formatValue(valueFormat, value) : undefined} />{showLegend ? <Legend /> : null}</>
  return <ResponsiveContainer width='100%' height={height}>
    {kind === 'line' ? <LineChart data={data}>{common}{series.map((item, index) => <Line key={item.key} type='monotone' dataKey={item.key} name={item.name} stroke={item.color ?? colors[index % colors.length]} strokeWidth={2} dot={false} />)}</LineChart>
      : kind === 'area' ? <AreaChart data={data}>{common}{series.map((item, index) => <Area key={item.key} type='monotone' dataKey={item.key} name={item.name} stroke={item.color ?? colors[index % colors.length]} fill={`${item.color ?? colors[index % colors.length]}33`} />)}</AreaChart>
        : <BarChart data={data}>{common}{series.map((item, index) => <Bar key={item.key} dataKey={item.key} name={item.name} fill={item.color ?? colors[index % colors.length]} radius={[6, 6, 0, 0]} />)}</BarChart>}
  </ResponsiveContainer>
}
