import type { EventMap, EventId } from "@/lib/events"

type EventCallback<T extends EventId> = (data: EventMap[T]) => void

type Listener = {
    id: symbol
    callback: EventCallback<EventId>
}

export namespace EventBus {
    const listeners = new Map<EventId, Set<Listener>>()
    let listenerIdCounter = 0

    function createListenerId() {
        listenerIdCounter++
        return Symbol(`listener-${listenerIdCounter}`)
    }

    export function subscribe<T extends EventId>(
        eventId: T,
        callback: EventCallback<T>
    ) {
        if (!listeners.has(eventId)) {
            listeners.set(eventId, new Set())
        }

        const listener: Listener = {
            id: createListenerId(),
            callback: callback as EventCallback<EventId>
        }

        const set = listeners.get(eventId)
        if (set === undefined) return function unsubscribe() { }

        set.add(listener)

        return function unsubscribe() {
            const currentSet = listeners.get(eventId)
            if (currentSet === undefined) return
            currentSet.delete(listener)
            if (currentSet.size === 0) {
                listeners.delete(eventId)
            }
        }
    }

    export function emit<T extends EventId>(
        eventId: T,
        data: EventMap[T]
    ) {
        const set = listeners.get(eventId)
        if (set === undefined) return
        if (set.size === 0) return

        set.forEach(function call(listener) {
            listener.callback(data)
        })
    }

    export function clear(eventId?: EventId) {
        if (eventId === undefined) {
            listeners.clear()
            return
        }
        listeners.delete(eventId)
    }

    export function getListenerCount(eventId: EventId) {
        const set = listeners.get(eventId)
        if (set === undefined) return 0
        return set.size
    }

    export function hasListeners(eventId: EventId) {
        return getListenerCount(eventId) > 0
    }
}

