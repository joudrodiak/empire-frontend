'use client'
import React, { useState } from 'react'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  inputClassName?: string
}

export function PasswordInput({ inputClassName, className, ...props }: Props) {
  const [visible, setVisible] = useState(false)
  return (
    <div className={className || 'relative'}>
      <input
        placeholder="••••••••"
        {...props}
        type={visible ? 'text' : 'password'}
        className={`${inputClassName || ''} pr-10`}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        title={visible ? 'Hide password' : 'Show password'}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-empire-text-dim transition-colors hover:bg-empire-elevated/60 hover:text-empire-text"
      >
        <EmpireIcon name={visible ? 'lock' : 'eye'} size={15} />
      </button>
    </div>
  )
}
