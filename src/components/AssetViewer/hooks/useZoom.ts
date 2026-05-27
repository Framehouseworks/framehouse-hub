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
const DOUBLE_TAP_MS = 300

export function useZoom(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [zoom, setZoom] = useState<ZoomState>(INITIAL)

  // Ref mirror — lets imperative handlers read current scale without stale closures
  const zoomRef = useRef<ZoomState>(INITIAL)

  const isDragging = useRef(false)
  const lastPointer = useRef<{ x: number; y: number } | null>(null)
  const dragMoved = useRef(false)

  // Pinch state
  const pinchStartDist = useRef<number | null>(null)
  const pinchStartScale = useRef(1)

  // Double-tap state
  const lastTapTime = useRef(0)

  const isZoomed = zoom.scale > 1

  // Single setter that keeps the ref in sync
  const applyZoom = useCallback((updater: ZoomState | ((p: ZoomState) => ZoomState)) => {
    setZoom((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      zoomRef.current = next
      return next
    })
  }, [])

  const reset = useCallback(() => applyZoom(INITIAL), [applyZoom])

  // ── Desktop: click to cycle zoom ─────────────────────────────────────────
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragMoved.current) {
        dragMoved.current = false
        return
      }
      const rect = e.currentTarget.getBoundingClientRect()
      const ox = ((e.clientX - rect.left) / rect.width) * 100
      const oy = ((e.clientY - rect.top) / rect.height) * 100
      applyZoom((prev) => {
        if (prev.scale === 1) return { ...INITIAL, scale: 2, originX: ox, originY: oy }
        if (prev.scale === 2) return { ...INITIAL, scale: 4, originX: ox, originY: oy }
        return INITIAL
      })
    },
    [applyZoom],
  )

  // ── Desktop: mouse drag to pan ────────────────────────────────────────────
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

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current || !lastPointer.current) return
      const dx = e.clientX - lastPointer.current.x
      const dy = e.clientY - lastPointer.current.y
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved.current = true
      lastPointer.current = { x: e.clientX, y: e.clientY }
      applyZoom((prev) => ({ ...prev, offsetX: prev.offsetX + dx, offsetY: prev.offsetY + dy }))
    },
    [applyZoom],
  )

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    lastPointer.current = null
  }, [])

  // ── Touch: pan + pinch-zoom + double-tap (all imperative + non-passive) ──
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Wheel zoom (desktop)
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      applyZoom((prev) => {
        const delta = e.deltaY > 0 ? -0.25 : 0.25
        const next = Math.min(8, Math.max(1, prev.scale + delta))
        return next === 1 ? INITIAL : { ...prev, scale: next }
      })
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch start — capture initial distance and scale
        e.preventDefault()
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        pinchStartDist.current = Math.hypot(dx, dy)
        pinchStartScale.current = zoomRef.current.scale
        return
      }
      if (e.touches.length === 1) {
        if (zoomRef.current.scale > 1) {
          // Pan: prevent scroll propagation when zoomed
          e.preventDefault()
          isDragging.current = true
          dragMoved.current = false
          lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }
        // Always record touch time for double-tap detection (handled in touchend)
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDist.current !== null) {
        e.preventDefault()
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        const ratio = dist / pinchStartDist.current
        const next = Math.min(8, Math.max(1, pinchStartScale.current * ratio))
        applyZoom((prev) => (next <= 1 ? INITIAL : { ...prev, scale: next }))
        return
      }
      if (e.touches.length === 1 && isDragging.current && lastPointer.current) {
        e.preventDefault()
        const dx = e.touches[0].clientX - lastPointer.current.x
        const dy = e.touches[0].clientY - lastPointer.current.y
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved.current = true
        lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        applyZoom((prev) => ({ ...prev, offsetX: prev.offsetX + dx, offsetY: prev.offsetY + dy }))
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      // Clean up pinch when second finger lifts
      if (e.touches.length < 2) pinchStartDist.current = null

      const wasPanning = isDragging.current && dragMoved.current
      isDragging.current = false
      lastPointer.current = null

      if (!wasPanning && e.changedTouches.length === 1) {
        // Tap — check for double-tap to zoom
        const now = Date.now()
        if (now - lastTapTime.current < DOUBLE_TAP_MS) {
          // Double tap: cycle zoom
          const touch = e.changedTouches[0]
          const rect = el.getBoundingClientRect()
          const ox = ((touch.clientX - rect.left) / rect.width) * 100
          const oy = ((touch.clientY - rect.top) / rect.height) * 100
          applyZoom((prev) => {
            if (prev.scale === 1) return { ...INITIAL, scale: 2, originX: ox, originY: oy }
            if (prev.scale === 2) return { ...INITIAL, scale: 4, originX: ox, originY: oy }
            return INITIAL
          })
          lastTapTime.current = 0
          // Prevent ghost click from firing onClick handler
          e.preventDefault()
        } else {
          lastTapTime.current = now
        }
      }

      dragMoved.current = false
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: false })

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [containerRef, applyZoom])

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
