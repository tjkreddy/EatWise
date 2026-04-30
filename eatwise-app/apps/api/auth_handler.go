package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// ErrorResponse provides structured error information
type ErrorResponse struct {
	Error   string `json:"error"`
	Code    string `json:"code"`
	Details string `json:"details,omitempty"`
	Path    string `json:"path,omitempty"`
}

// Enhanced getUserIDFromRequest extracts user ID from JWT token with detailed error handling
func getUserIDFromRequest(r *http.Request) (string, error) {
	// Get Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", &AuthError{
			Code:       "UNAUTHORIZED",
			Message:    "missing authorization header",
			StatusCode: http.StatusUnauthorized,
		}
	}

	// Parse "Bearer <token>" format
	parts := strings.Fields(authHeader)
	if len(parts) != 2 || parts[0] != "Bearer" {
		return "", &AuthError{
			Code:       "UNAUTHORIZED",
			Message:    "invalid authorization header format",
			StatusCode: http.StatusUnauthorized,
		}
	}

	tokenString := parts[1]
	if tokenString == "" {
		return "", &AuthError{
			Code:       "UNAUTHORIZED",
			Message:    "empty token provided",
			StatusCode: http.StatusUnauthorized,
		}
	}

	// Parse JWT token with claims
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		if err == jwt.ErrSignatureInvalid {
			return "", &AuthError{
				Code:       "UNAUTHORIZED",
				Message:    "invalid token signature",
				StatusCode: http.StatusUnauthorized,
			}
		}

		// Check for expiration
		if strings.Contains(err.Error(), "token is expired") {
			return "", &AuthError{
				Code:       "UNAUTHORIZED",
				Message:    "token expired",
				StatusCode: http.StatusUnauthorized,
			}
		}

		log.Printf("ERROR: JWT parse failed: %v for token: %s...", err, tokenString[:min(20, len(tokenString))])
		return "", &AuthError{
			Code:       "UNAUTHORIZED",
			Message:    "failed to parse token",
			StatusCode: http.StatusUnauthorized,
		}
	}

	if !token.Valid {
		return "", &AuthError{
			Code:       "UNAUTHORIZED",
			Message:    "invalid or expired token",
			StatusCode: http.StatusUnauthorized,
		}
	}

	// Extract claims
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", &AuthError{
			Code:       "UNAUTHORIZED",
			Message:    "invalid token claims format",
			StatusCode: http.StatusUnauthorized,
		}
	}

	// Get user_id from claims
	userID, ok := claims["user_id"].(string)
	if !ok || userID == "" {
		log.Printf("ERROR: Missing or invalid user_id in token claims: %+v", claims)
		return "", &AuthError{
			Code:       "UNAUTHORIZED",
			Message:    "missing or invalid user_id in token",
			StatusCode: http.StatusUnauthorized,
		}
	}

	return userID, nil
}

// AuthError provides typed authentication errors for better error handling
type AuthError struct {
	Code       string
	Message    string
	StatusCode int
}

func (e *AuthError) Error() string {
	return e.Message
}

// WriteAuthError writes structured auth error response
func WriteAuthError(w http.ResponseWriter, err error, path string) {
	w.Header().Set("Content-Type", "application/json")

	if authErr, ok := err.(*AuthError); ok {
		w.WriteHeader(authErr.StatusCode)
		// Add WWW-Authenticate header for 401 responses (RFC 7235)
		if authErr.StatusCode == http.StatusUnauthorized {
			w.Header().Set("WWW-Authenticate", `Bearer realm="api", error="`+strings.ToLower(authErr.Code)+`"`)
		}
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   authErr.Message,
			Code:    authErr.Code,
			Path:    path,
		})
	} else {
		// Generic error
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error: "Internal server error",
			Code:  "INTERNAL_ERROR",
			Path:  path,
		})
	}
}

// Helper for min
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
