import { type EventMap1 } from './events1'
import { type EventMap2 } from './events2'

export type EventMap = {
  "chat-input:focus": undefined
  "chat-input:clear": undefined 
  "search": { query: string } 
  "search-button:toggle-available": boolean
} & EventMap1 & EventMap2 // разбивка на файлы для гита

export type EventId = keyof EventMap
