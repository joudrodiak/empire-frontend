import { Suspense } from 'react'
import DepartmentClient from './DepartmentClient'

const DEPARTMENT_SLUGS = [
  'engineering',
  'creative',
  'marketing',
  'partnerships',
  'client-success',
  'executive',
  'operations',
  'advisory',
  'finance',
  'hr',
  'legal',
]

export const dynamicParams = false

export function generateStaticParams() {
  return DEPARTMENT_SLUGS.map(id => ({ id }))
}

export default function DepartmentPage() {
  return (
    <Suspense fallback={null}>
      <DepartmentClient />
    </Suspense>
  )
}
