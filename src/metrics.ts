import { createServer } from "node:http"

const PREFIX = "crawler"

let pagesSaved = 0
const fetchErrorsByType: Record<string, number> = {}
let kafkaSent = 0
const PAGE_DURATION_BUCKETS = [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30]
const pageDurationBucketCounts: number[] = PAGE_DURATION_BUCKETS.map(() => 0)
let pageDurationSum = 0
let pageDurationCount = 0
let queueSize = 0
let dataVolumeBytes = 0
let workersActive = 0

function formatCounter(name: string, value: number): string {
    return `# TYPE ${PREFIX}_${name} counter\n${PREFIX}_${name} ${value}\n`
}

function formatCounterWithLabel(name: string, label: string, value: string, count: number): string {
    return `${PREFIX}_${name}{${label}="${value}"} ${count}\n`
}

function formatGauge(name: string, value: number): string {
    return `# TYPE ${PREFIX}_${name} gauge\n${PREFIX}_${name} ${value}\n`
}

function formatHistogram(name: string, buckets: number[], bucketCounts: number[], sum: number, count: number): string {
    let out = `# TYPE ${PREFIX}_${name} histogram\n`
    for (let i = 0; i < buckets.length; i++) {
        out += `${PREFIX}_${name}_bucket{le="${buckets[i]}"} ${bucketCounts[i] ?? 0}\n`
    }
    out += `${PREFIX}_${name}_bucket{le="+Inf"} ${count}\n`
    out += `${PREFIX}_${name}_sum ${sum}\n`
    out += `${PREFIX}_${name}_count ${count}\n`
    return out
}

function renderMetrics(): string {
    const parts: string[] = [
        formatCounter("pages_saved_total", pagesSaved),
        formatCounter("kafka_sent_total", kafkaSent),
        formatCounter("data_volume_bytes_total", dataVolumeBytes),
        formatGauge("queue_size", queueSize),
        formatGauge("workers_active", workersActive),
    ]
    parts.push(`# TYPE ${PREFIX}_fetch_errors_total counter\n`)
    const errorTypes = Object.keys(fetchErrorsByType).sort()
    for (const t of errorTypes) {
        parts.push(formatCounterWithLabel("fetch_errors_total", "type", t, fetchErrorsByType[t] ?? 0))
    }
    if (errorTypes.length === 0) parts.push(`${PREFIX}_fetch_errors_total{type="unknown"} 0\n`)
    parts.push(formatHistogram("page_duration_seconds", PAGE_DURATION_BUCKETS, pageDurationBucketCounts, pageDurationSum, pageDurationCount))
    return parts.join("")
}

function serveMetrics(port: number): void {
    const server = createServer(function onRequest(req, res) {
        if (req.url === "/metrics" && req.method === "GET") {
            res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" })
            res.end(renderMetrics())
            return
        }
        res.writeHead(404)
        res.end()
    })
    server.listen(port, function onListen() {
        //
    })
}

function getMetricsPort(): number | null {
    const raw = process.env["METRICS_PORT"]
    if (raw === undefined || raw === "") return null
    const n = Number.parseInt(raw, 10)
    if (!Number.isInteger(n) || n < 1 || n > 65535) return null
    return n
}

function safeErrorType(type: string): string {
    const sanitized = type.replace(/[^a-z0-9_]/gi, "_").slice(0, 64)
    return sanitized === "" ? "unknown" : sanitized
}

export const Metrics = {
    incrementPageSaved() {
        pagesSaved += 1
    },
    incrementFetchError(type = "unknown") {
        const key = safeErrorType(type)
        fetchErrorsByType[key] = (fetchErrorsByType[key] ?? 0) + 1
    },
    incrementKafkaSent() {
        kafkaSent += 1
    },
    observePageDuration(seconds: number) {
        if (!Number.isFinite(seconds) || seconds < 0) return
        pageDurationSum += seconds
        pageDurationCount += 1
        for (let i = 0; i < PAGE_DURATION_BUCKETS.length; i++) {
            if ((PAGE_DURATION_BUCKETS[i] ?? 0) >= seconds) pageDurationBucketCounts[i] = (pageDurationBucketCounts[i] ?? 0) + 1
        }
    },
    setQueueSize(n: number) {
        if (Number.isInteger(n) && n >= 0) queueSize = n
    },
    addDataVolume(bytes: number) {
        if (Number.isInteger(bytes) && bytes >= 0) dataVolumeBytes += bytes
    },
    setWorkersActive(n: number) {
        if (Number.isInteger(n) && n >= 0) workersActive = n
    },
    startServerIfConfigured() {
        const port = getMetricsPort()
        if (port === null) return
        serveMetrics(port)
    },
}
