export type EventMap = {
  "chat-input:focus": undefined
  "chat-input:clear": undefined
  "search": { query: string }
  "search-button:toggle-available": boolean
}

export type EventId = keyof EventMap
