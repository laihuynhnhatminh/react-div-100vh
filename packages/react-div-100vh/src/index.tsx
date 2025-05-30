import React, { forwardRef, useState, useEffect, useCallback, HTMLAttributes } from 'react'

interface DynamicViewportOptions {
  /** Disable development warnings */
  suppressWarnings?: boolean
  /** Callback when viewport height changes */
  onHeightChange?: (height: number | null) => void
  /** Fallback height when measurement is not available */
  fallbackHeight?: string
}

interface DynamicViewportDivProps extends HTMLAttributes<HTMLDivElement> {
  options?: DynamicViewportOptions
}

let hasWarned = false

/**
 * A div that automatically adjusts to the real viewport height on mobile devices.
 * 
 * Solves the mobile browser viewport height issue where browser chrome (address bar, etc.)
 * dynamically slides in and out, causing `100vh` to not represent the actual visible area.
 * 
 * @example
 * ```tsx
 * <DynamicViewportDiv>
 *   <YourFullScreenContent />
 * </DynamicViewportDiv>
 * ```
 */
const DynamicViewportDiv = forwardRef<HTMLDivElement, DynamicViewportDivProps>(
  ({ style, options = {}, ...props }, ref) => {
    const { 
      suppressWarnings = false, 
      onHeightChange, 
      fallbackHeight = '100vh' 
    } = options
    
    const height = useDynamicViewportHeight({ onHeightChange })

    // Development warning for style conflicts
    if (process.env.NODE_ENV === 'development' && !hasWarned && !suppressWarnings && style?.height) {
      hasWarned = true
      console.warn(
        '[DynamicViewportDiv] The height property in style will be overridden. ' +
        'Use options.suppressWarnings=true to disable this warning.'
      )
    }

    const computedStyle = {
      ...style,
      height: height ? `${height}px` : fallbackHeight
    }

    return <div ref={ref} style={computedStyle} {...props} />
  }
)

DynamicViewportDiv.displayName = 'DynamicViewportDiv'

/**
 * Hook that returns the real viewport height, accounting for mobile browser chrome.
 * 
 * @param options - Configuration options
 * @returns The current viewport height in pixels, or null during SSR/initial render
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const viewportHeight = useDynamicViewportHeight()
 *   return <div style={{ height: viewportHeight ? `${viewportHeight}px` : '100vh' }} />
 * }
 * ```
 */
export function useDynamicViewportHeight(options: Pick<DynamicViewportOptions, 'onHeightChange'> = {}) {
  const { onHeightChange } = options
  const [height, setHeight] = useState<number | null>(() => measureViewportHeight())
  const isClientRendered = useIsClientRendered()

  const updateHeight = useCallback(() => {
    const newHeight = measureViewportHeight()
    setHeight(prevHeight => {
      if (prevHeight !== newHeight) {
        onHeightChange?.(newHeight)
        return newHeight
      }
      return prevHeight
    })
  }, [onHeightChange])

  useEffect(() => {
    if (!isClientRendered) return

    // Set initial height on client
    updateHeight()

    // Listen for resize events
    window.addEventListener('resize', updateHeight, { passive: true })
    
    // Also listen for orientationchange for mobile devices
    window.addEventListener('orientationchange', updateHeight, { passive: true })

    return () => {
      window.removeEventListener('resize', updateHeight)
      window.removeEventListener('orientationchange', updateHeight)
    }
  }, [isClientRendered, updateHeight])

  // Return null during SSR and initial client render for hydration safety
  return isClientRendered ? height : null
}

/**
 * Measures the current viewport height.
 * 
 * @returns The viewport height in pixels, or null if not in browser environment
 */
export function measureViewportHeight(): number | null {
  if (!isBrowserEnvironment()) return null
  
  // Use visualViewport API if available (better for mobile)
  if (window.visualViewport) {
    return window.visualViewport.height
  }
  
  // Fallback to window.innerHeight
  return window.innerHeight
}

/**
 * Hook that tracks whether we're in a client-side render.
 * Essential for SSR hydration safety.
 */
function useIsClientRendered(): boolean {
  const [isClientRendered, setIsClientRendered] = useState(false)

  useEffect(() => {
    setIsClientRendered(true)
  }, [])

  return isClientRendered
}

/**
 * Checks if we're in a browser environment.
 */
function isBrowserEnvironment(): boolean {
  return (
    typeof window !== 'undefined' && 
    typeof document !== 'undefined' &&
    typeof window.innerHeight === 'number'
  )
}

// Legacy exports for backwards compatibility
export const Div100vh = DynamicViewportDiv
export const use100vh = useDynamicViewportHeight
export const measureHeight = measureViewportHeight

export default DynamicViewportDiv