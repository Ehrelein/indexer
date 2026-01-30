# Kubernetes

Манифесты эквивалентны `docker compose.yml`: Kafka (KRaft), Redis, Postgres, scraper, nginx.

Один образ scraper — один контейнер, один режим: читает URL из Kafka (основной топик и приоритетный), качает страницы, сохраняет в БД, найденные ссылки с того же домена пишет в приоритетный топик, остальные — в основной. Воркер всегда сначала обрабатывает сообщения из приоритетного топика. Опционально `SEED_URL`: при старте пода этот URL один раз кладётся в основной топик.

## Порядок

1. Собрать образ scraper: из корня проекта  
   `docker build -t pet-scraper:latest .`
2. Применить манифесты:  
   `kubectl apply -k k8s/`
3. Дождаться готовности Postgres, Kafka, Redis; после этого scraper поднимется (init: `prisma migrate deploy`).

## Namespace

Всё в namespace `scraper`. DNS внутри кластера: `postgres`, `redis`, `kafka`, `nginx` (без суффикса, т.к. тот же namespace).

## Переменные

- **Scraper:** ConfigMap `scraper` — `KAFKA_BROKERS`, `REDIS_URL`, `RATE_LIMIT_PER_SECOND`, `METRICS_PORT`, `CRAWL_TOPIC` (по умолчанию `crawl-urls`), `CRAWL_TOPIC_PRIORITY` (по умолчанию `crawl-urls-priority`), `CRAWL_MAX_DEPTH` (макс. глубина обхода по ссылкам с того же домена, по умолчанию 3). Secret `scraper` — `DATABASE_URL`.
- **SEED_URL** (опционально) — при старте пода этот URL один раз отправляется в топик Kafka. Можно задать в ConfigMap или в env пода. Реплики Deployment — воркеры: все читают из Kafka, качают, пишут новые URL в Kafka.

## Как конфиг из ConfigMap попадает в код

**1. ConfigMap (`scraper-configmap.yaml`)**  
В манифесте задаётся имя `scraper` и пары ключ–значение в `data`:

```yaml
data:
    KAFKA_BROKERS: 'kafka:9092'
    REDIS_URL: 'redis://redis:6379'
    RATE_LIMIT_PER_SECOND: '2'
    METRICS_PORT: '9090'
```

**2. Deployment (`scraper.yaml`)**  
Все пары из ConfigMap `scraper` становятся **переменными окружения** у каждого пода: у каждого контейнера scraper в каждом из 6 подов одни и те же `KAFKA_BROKERS`, `REDIS_URL`, `RATE_LIMIT_PER_SECOND`, `METRICS_PORT`. Это делается через `envFrom`:

```yaml
containers:
    - name: scraper
      envFrom:
          - configMapRef:
                name: scraper # имя ConfigMap
          - secretRef:
                name: scraper # Secret — отдельно
```

Kubernetes при старте контейнера подставляет каждую пару из ConfigMap в окружение процесса: `KAFKA_BROKERS=kafka:9092`, `REDIS_URL=redis://redis:6379` и т.д.

**3. Код приложения**  
В Node.js переменные окружения доступны через `process.env`. В этом проекте их читают функции в `src/index.ts`, `src/kafka.ts` и др.:

- `process.env["KAFKA_BROKERS"]` → `getKafkaBrokers()` в `index.ts`
- `process.env["REDIS_URL"]` → `getRedisUrl()` в `index.ts`
- `process.env["RATE_LIMIT_PER_SECOND"]` → `getRateLimitPerSecond()` в `index.ts`
- `process.env["SEED_URL"]` (опционально) → `getSeedUrl()` в `index.ts`
- `process.env["CRAWL_TOPIC"]`, `process.env["CRAWL_TOPIC_PRIORITY"]`, `process.env["CRAWL_MAX_DEPTH"]` → `CrawlKafka.topic()`, `CrawlKafka.topicPriority()`, `CrawlKafka.maxDepth()` в `kafka.ts`

Локально те же переменные задаются через `.env` (загружается через `dotenv/config`). В кластере вместо файла используются ConfigMap и Secret — в рантайме для кода это просто `process.env`, источник не важен.

## Реплики и ресурсы

Стоит **фиксированное** число подов: `replicas: 6`. HPA не включён — лимит по репликам и rate limit задаёшь вручную.

- Один под: `requests` 512Mi / 100m CPU, `limits` 8Gi / 2 CPU.

### Как посчитать макс. запросов в секунду

**Формула:**  
`запросов/с всего = RATE_LIMIT_PER_SECOND × replicas`

Примеры:

- 6 реплик × 2 req/s = **12** запросов/с (дефолт в k8s).
- 2 реплики × 5 req/s = **10** запросов/с (ровно 10 на машину).
- Нужно больше — поднять `RATE_LIMIT_PER_SECOND` или `replicas`.

**Прикидка по каналу (узкое место — сеть):**  
Если канал, например, 100 Mbit/s вниз, а средняя страница ~500 KB:  
`100 Mbit/s ≈ 12.5 MB/s` → `12.5 / 0.5 ≈ 25` страниц/с.  
То есть грубо: **макс. запросов/с ≈ (скорость канала в MB/s) / (средний размер страницы в MB)**.  
Для 1 Gbit/s и 500 KB: ~250 req/s; для 50 Mbit/s и 500 KB: ~12 req/s.

**Что крутить:**

1. `RATE_LIMIT_PER_SECOND` в ConfigMap scraper (или в env пода) — лимит на один воркер.
2. `replicas` в `scraper.yaml` — число воркеров.  
   Подбирай пару так, чтобы `RATE_LIMIT_PER_SECOND × replicas` не превышало разумный предел по каналу и по вежливости к целевым сайтам.

## Nginx

Сейчас том для `/usr/share/nginx/html` — `emptyDir` (пусто). Чтобы отдавать фронт: свой образ с статикой, ConfigMap или PVC с файлами.
