import type { PhantomUiAttributes } from '@aejkatappaja/phantom-ui'

// phantom-ui is a self-upgrading custom element; allow React's hydration escape
// hatch on it so the splash doesn't trip a hydration mismatch (backlog B4).
type PhantomUiProps = PhantomUiAttributes & { suppressHydrationWarning?: boolean }

declare module 'react/jsx-runtime' {
  export namespace JSX {
    interface IntrinsicElements {
      'phantom-ui': PhantomUiProps
    }
  }
}
