package main

import (
	"fmt"
	"log"
	"net/http"
	"time"
)

// ErrorLogger provides structured logging for API errors
type ErrorLogger struct {
	requestID string
	method    string
	path      string
	userID    string
}

// NewErrorLogger creates a new error logger for a request
func NewErrorLogger(r *http.Request, userID string) *ErrorLogger {
	return &ErrorLogger{
		requestID: fmt.Sprintf("%d", time.Now().UnixNano()),
		method:    r.Method,
		path:      r.RequestURI,
		userID:    userID,
	}
}

// LogClientError logs 4xx errors (client mistakes)
func (el *ErrorLogger) LogClientError(statusCode int, err error, message string) {
	log.Printf("CLIENT_ERROR [%s] %s %s user=%s status=%d err=%v msg=%s",
		el.requestID, el.method, el.path, el.userID, statusCode, err, message)
}

// LogServerError logs 5xx errors (server issues)
func (el *ErrorLogger) LogServerError(statusCode int, err error, context string) {
	log.Printf("SERVER_ERROR [%s] %s %s user=%s status=%d err=%v context=%s",
		el.requestID, el.method, el.path, el.userID, statusCode, err, context)
}

// LogValidationError logs validation errors with details
func (el *ErrorLogger) LogValidationError(fieldName string, value interface{}, reason string) {
	log.Printf("VALIDATION_ERROR [%s] %s %s user=%s field=%s value=%v reason=%s",
		el.requestID, el.method, el.path, el.userID, fieldName, value, reason)
}

// LogDBError logs database errors with context
func (el *ErrorLogger) LogDBError(operation string, err error, context string) {
	log.Printf("DB_ERROR [%s] %s %s user=%s operation=%s err=%v context=%s",
		el.requestID, el.method, el.path, el.userID, operation, err, context)
}

// LogAuthenticationError logs authentication failures
func (el *ErrorLogger) LogAuthenticationError(reason string) {
	log.Printf("AUTH_ERROR [%s] %s %s user=%s reason=%s",
		el.requestID, el.method, el.path, el.userID, reason)
}

// LogAuthorizationError logs authorization failures
func (el *ErrorLogger) LogAuthorizationError(resource string, reason string) {
	log.Printf("AUTHZ_ERROR [%s] %s %s user=%s resource=%s reason=%s",
		el.requestID, el.method, el.path, el.userID, resource, reason)
}

// LogPanicRecovery logs panic recovery
func (el *ErrorLogger) LogPanicRecovery(panicValue interface{}, stackTrace string) {
	log.Printf("PANIC_RECOVERY [%s] %s %s user=%s panic=%v stacktrace=%s",
		el.requestID, el.method, el.path, el.userID, panicValue, stackTrace)
}

// Global error counters for monitoring
var (
	errorCounts = map[int]int{
		400: 0, // Bad Request
		401: 0, // Unauthorized
		403: 0, // Forbidden
		404: 0, // Not Found
		409: 0, // Conflict
		500: 0, // Internal Server Error
		502: 0, // Bad Gateway
		503: 0, // Service Unavailable
	}
)

// IncrementErrorCount increments the error counter for monitoring
func IncrementErrorCount(statusCode int) {
	if count, ok := errorCounts[statusCode]; ok {
		errorCounts[statusCode] = count + 1
		if statusCode >= 500 {
			log.Printf("METRIC: 5xx_error_count=%d status=%d", errorCounts[statusCode], statusCode)
		}
	}
}

// DistinguishError differentiates between client and server errors
// Returns (isClientError bool, category string)
func DistinguishError(statusCode int) (bool, string) {
	switch {
	case statusCode >= 400 && statusCode < 500:
		return true, fmt.Sprintf("Client Error (%d)", statusCode)
	case statusCode >= 500:
		return false, fmt.Sprintf("Server Error (%d)", statusCode)
	default:
		return false, "Unknown Error"
	}
}

// FormatErrorLog formats error log entries with context
func FormatErrorLog(statusCode int, userID string, requestPath string, operation string, err error) string {
	isClient, category := DistinguishError(statusCode)
	errorType := "CLIENT"
	if !isClient {
		errorType = "SERVER"
	}

	return fmt.Sprintf(
		"[%s] %s %s | User: %s | Operation: %s | Error: %v",
		errorType, category, requestPath, userID, operation, err,
	)
}
