# pet

Веб-краулер с очередью Kafka и поиском по накрауленным страницам.
фронт: https://pet-search.fly.dev
точно можно искать: python, signup, documentation

![Архитектура](https://imgur.com/a/W44SlU8)

![Фронт](https://imgur.com/a/BkFMXUk)

## Стак

Kubernetes, Docker, Kafka, Redis, PostgreSQL, TypeScript, Next.js

## Архитектура

- Очередь URL в Kafka (обычный + приоритетный топик), дедупляция и rate limit в Redis.
- Поиск по словам через инвертированный индекс (`page_words`), ранжирование по `rank`.
- [Прямой доступ к DOM через useEffect и переменные вместо state](https://imgur.com/a/XtPEvkA) — удобнее писать.
- [Типизация событий для useEffect](https://imgur.com/a/L8wVTXo) — типобезопасный код под гибкость.

Тесты: `npm test`.
