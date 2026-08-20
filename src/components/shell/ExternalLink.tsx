import type { AnchorHTMLAttributes, ReactNode } from 'react'

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'target' | 'rel' | 'aria-label'> & {
  accessibleName: string
  children: ReactNode
}

export default function ExternalLink({ accessibleName, children, ...props }: Props) {
  return (
    <a {...props} target='_blank' rel='noopener noreferrer' aria-label={`${accessibleName}（打开新窗口）`}>
      {children}
    </a>
  )
}
