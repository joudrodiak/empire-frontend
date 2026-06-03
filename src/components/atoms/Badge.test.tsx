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
  it('lowercases and shows the status', () => {
    render(<RagBadge status="GREEN" />)
    expect(screen.getByText('green')).toBeInTheDocument()
  })
  it('falls back to pending when empty', () => {
    render(<RagBadge status="" />)
    expect(screen.getByText('pending')).toBeInTheDocument()
  })
})
