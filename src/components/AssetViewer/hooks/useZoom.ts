'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface ZoomState {
  scale: number
  originX: number
  originY: number
  offsetX: number
  offsetY: number
}

const INITIAL: ZoomState = { scale: 1, originX: 50, originY: 50, offsetX: 0, offsetY: 0 }

export function useZoom(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [zoom, setZoom] = useState<ZoomState>(INITIAL)
  const isDragging = useRef(false)
  const lastPointer = useRef<{ x: number; y: number } | null>(null)
  const dragMoved = useRef(false)

  const isZoomed = zoom.scale > 1

  const reset = useCallback(() => setZoom(INITIAL), [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragMoved.current) {
      dragMoved.current = false
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const ox = ((e.clientX - rect.left) / rect.width) * 100
    const oy = ((e.clientY - rect.top) / rect.height) * 100
    setZoom((prev) => {
      if (prev.scale === 1) return { ...INITIAL, scale: 2, originX: ox, originY: oy }
      if (prev.scale === 2) return { ...INITIAL, scale: 4, originX: ox, originY: oy }
      return INITIAL
    })
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isZoomed) return
      e.preventDefault()
      isDragging.current = true
      dragMoved.current = false
      lastPointer.current = { x: e.clientX, y: e.clientY }
    },
    [isZoomed],
  )

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !lastPointer.current) return
    const dx = e.clientX - lastPointer.current.x
    const dy = e.clientY - lastPointer.current.y
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved.current = true
    lastPointer.current = { x: e.clientX, y: e.clientY }
    setZoom((prev) => ({ ...prev, offsetX: prev.offsetX + dx, offsetY: prev.offsetY + dy }))
  }, [])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    lastPointer.current = null
  }, [])

  // Non-passive wheel listener for zoom (must be registered imperatively)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      setZoom((prev) => {
        const delta = e.deltaY > 0 ? -0.25 : 0.25
        const next = Math.min(8, Math.max(1, prev.scale + delta))
        if (next === 1) return INITIAL
        return { ...prev, scale: next }
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [containerRef])

  const style: React.CSSProperties = {
    transform: isZoomed
      ? `scale(${zoom.scale}) translate(${zoom.offsetX / zoom.scale}px, ${zoom.offsetY / zoom.scale}px)`
      : 'scale(1)',
    transformOrigin: `${zoom.originX}% ${zoom.originY}%`,
    cursor: isZoomed ? (isDragging.current ? 'grabbing' : 'grab') : 'zoom-in',
    transition: isDragging.current ? 'none' : 'transform 0.2s ease',
  }

  return {
    zoom,
    isZoomed,
    reset,
    style,
    handlers: {
      onClick: handleClick,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
    },
  }
}
