import { EventEmitter } from 'events'

export interface ProcessingEvent {
  mediaId: string | number
  ingestionStatus: string
  processingStep: string
  timestamp: string
  errorMessage?: string
}

type Listener = (data: ProcessingEvent) => void

class ProcessingEventBus extends EventEmitter {
  emitStatusChange(data: ProcessingEvent) {
    this.emit(`status:${data.mediaId}`, data)
    this.emit('status:*', data)
  }

  subscribe(mediaIds: (string | number)[], listener: Listener): () => void {
    const handlers: Array<{ event: string; fn: Listener }> = []

    for (const id of mediaIds) {
      const event = `status:${id}`
      this.on(event, listener)
      handlers.push({ event, fn: listener })
    }

    return () => {
      for (const { event, fn } of handlers) {
        this.removeListener(event, fn)
      }
    }
  }
}

// Survive HMR by caching on globalThis
const globalKey = Symbol.for('framehouse.processingEvents')
const g = globalThis as unknown as Record<symbol, ProcessingEventBus>

if (!g[globalKey]) {
  g[globalKey] = new ProcessingEventBus()
  g[globalKey].setMaxListeners(100)
}

export const processingEvents: ProcessingEventBus = g[globalKey]
