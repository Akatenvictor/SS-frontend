/**
 * Client-side error logger.
 * In production, this could send errors to a remote logging service.
 * For now, it logs to the console with a structured format.
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    data?: unknown;
}

function createLogEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
        level,
        message,
        timestamp: new Date().toISOString(),
        data,
    };
}

function formatLogEntry(entry: LogEntry): string {
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
}

export function logError(message: string, error?: unknown): void {
    const entry = createLogEntry("error", message, error);
    console.error(formatLogEntry(entry), error ?? "");
}

export function logWarn(message: string, data?: unknown): void {
    const entry = createLogEntry("warn", message, data);
    console.warn(formatLogEntry(entry), data ?? "");
}

export function logInfo(message: string, data?: unknown): void {
    const entry = createLogEntry("info", message, data);
    console.info(formatLogEntry(entry), data ?? "");
}