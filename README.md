# pet
 [  ]
Веб-краулер с очередью Kafka и поиском по накрауленным страницам. [  ]
фронт: https://pet-search.fly.dev [  ]
точно можно искать: python, signup, documentation [  ]

![Архитектура](https://i.imgur.com/OdPv9sp.png)

![Фронт](https://i.imgur.com/JY3cym6.png)

## Стак

Kubernetes, Docker, Kafka, Redis, PostgreSQL, TypeScript, Next.js

## Архитектура

- Очередь URL в Kafka (обычный + приоритетный топик), дедупляция и rate limit в Redis.
- Поиск по словам через инвертированный индекс (`page_words`), ранжирование по `rank`.
- Прямой доступ к DOM через useEffect и переменные вместо state ![Прямой доступ к DOM через useEffect и переменные вместо state](https://i.imgur.com/CIUWzg7.png)
- Типизация событий для useEffect ![Типизация событий для useEffect](https://i.imgur.com/x7Xryla.png)

Тесты: `npm test`.
