import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, RagBadge } from './Badge'

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>Hello</Badge>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})

describe('RagBadge', () => {
  it('shows the status text', () => {
    render(<RagBadge status="GREEN" />)
    expect(screen.getByText('GREEN')).toBeInTheDocument()
  })
  it('falls back to TBD when empty', () => {
    render(<RagBadge status="" />)
    expect(screen.getByText('TBD')).toBeInTheDocument()
  })
})
