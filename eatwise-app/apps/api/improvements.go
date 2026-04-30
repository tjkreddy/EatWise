package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"github.com/golang-jwt/jwt/v5"
)

// IMPROVEMENTS FOR TASK 1: Fix auth routes and JWT parsing (fix 401s)

// Enhanced JWT parsing with detailed error messages
func getUserIDFromRequestFixed(r *http.Request) (string, error) {
	auth := r.Header.Get("Authorization")
	if auth == "" {
		log.Printf("Auth error: missing authorization header")
		return "", fmt.Errorf("missing authorization header")
	}

	parts := strings.Split(auth, " ")
	if len(parts) != 2 {
		log.Printf("Auth error: invalid auth header format, got %d parts", len(parts))
		return "", fmt.Errorf("invalid authorization header format: expected 'Bearer <token>'")
	}

	if parts[0] != "Bearer" {
		log.Printf("Auth error: invalid scheme '%s', expected 'Bearer'", parts[0])
		return "", fmt.Errorf("invalid authorization scheme: expected 'Bearer', got '%s'", parts[0])
	}

	tokenStr := parts[1]
	if tokenStr == "" {
		log.Printf("Auth error: empty token string")
		return "", fmt.Errorf("empty token provided")
	}

	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			log.Printf("Auth error: unexpected signing method: %v", token.Header["alg"])
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		// Verify JWT secret is configured
		if len(jwtSecret) == 0 {
			log.Printf("Auth error: JWT secret not configured")
			return nil, fmt.Errorf("JWT secret not configured server-side")
		}

		return jwtSecret, nil
	})

	if err != nil {
		log.Printf("Auth error: JWT parse failed: %v", err)
		return "", fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		log.Printf("Auth error: token is invalid or expired")
		return "", fmt.Errorf("invalid or expired token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		log.Printf("Auth error: invalid token claims type: %T", token.Claims)
		return "", fmt.Errorf("invalid token claims type")
	}

	uid, ok := claims["user_id"].(string)
	if !ok || uid == "" {
		log.Printf("Auth error: missing or invalid user_id in claims: %v", claims["user_id"])
		return "", fmt.Errorf("missing or invalid user_id in token")
	}

	return uid, nil
}

// Enhanced auth error handler with better 401 responses
func authErrorHandler(w http.ResponseWriter, err error) {
	logMsg := fmt.Sprintf("Auth failed: %v", err)
	log.Printf(logMsg)
	respondError(w, http.StatusUnauthorized, err.Error(), "UNAUTHORIZED")
}

// IMPROVEMENTS FOR TASK 2: Stabilize household endpoints

// Improved household member listing with better error handling
func listHouseholdMembersImproved(householdID string) ([]HouseholdMember, error) {
	if householdID == "" {
		return nil, fmt.Errorf("household_id cannot be empty")
	}

	// Verify household exists first
	var householdExists bool
	err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM households WHERE id = $1)`, householdID).Scan(&householdExists)
	if err != nil {
		log.Printf("Error checking household existence: %v", err)
		return nil, fmt.Errorf("failed to verify household: %w", err)
	}

	if !householdExists {
		return nil, fmt.Errorf("household not found")
	}

	rows, err := db.Query(`
		SELECT u.id, u.email, u.full_name, hm.role
		FROM household_members hm
		JOIN users u ON u.id = hm.user_id
		WHERE hm.household_id = $1
		ORDER BY hm.joined_at ASC
	`, householdID)
	if err != nil {
		log.Printf("Error querying household members: %v", err)
		return nil, fmt.Errorf("failed to query members: %w", err)
	}
	defer rows.Close()

	members := []HouseholdMember{}
	for rows.Next() {
		var m HouseholdMember
		var fullName sql.NullString
		if err := rows.Scan(&m.UserID, &m.Email, &fullName, &m.Role); err != nil {
			log.Printf("Error scanning member row: %v", err)
			return nil, fmt.Errorf("failed to parse member data: %w", err)
		}
		if fullName.Valid {
			m.FullName = &fullName.String
		}
		members = append(members, m)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating member rows: %v", err)
		return nil, fmt.Errorf("failed to iterate members: %w", err)
	}

	return members, nil
}

// Improved household member join with validation
func joinHouseholdImproved(userID, inviteCode string) (*Household, error) {
	if userID == "" || inviteCode == "" {
		return nil, fmt.Errorf("user_id and invite_code required")
	}

	inviteCode = strings.ToUpper(strings.TrimSpace(inviteCode))

	// Check if user is already in a household
	var existingHousehold string
	err := db.QueryRow(
		`SELECT household_id FROM household_members WHERE user_id = $1 LIMIT 1`,
		userID,
	).Scan(&existingHousehold)

	if err == nil {
		log.Printf("User %s already in household %s", userID, existingHousehold)
		return nil, fmt.Errorf("user already in a household")
	}

	if err != sql.ErrNoRows {
		log.Printf("Error checking existing membership: %v", err)
		return nil, fmt.Errorf("failed to check membership: %w", err)
	}

	// Find household by invite code
	var household Household
	err = db.QueryRow(
		`SELECT id, name, invite_code, created_by, created_at FROM households WHERE UPPER(invite_code) = UPPER($1)`,
		inviteCode,
	).Scan(&household.ID, &household.Name, &household.InviteCode, &household.CreatedBy, &household.CreatedAt)

	if err == sql.ErrNoRows {
		log.Printf("Invalid invite code: %s", inviteCode)
		return nil, fmt.Errorf("invalid invite code")
	}

	if err != nil {
		log.Printf("Error looking up household: %v", err)
		return nil, fmt.Errorf("failed to find household: %w", err)
	}

	// Add user to household
	_, err = db.Exec(
		`INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'member')`,
		household.ID, userID,
	)

	if err != nil {
		log.Printf("Error adding member to household: %v", err)
		return nil, fmt.Errorf("failed to join household: %w", err)
	}

	log.Printf("User %s successfully joined household %s", userID, household.ID)
	return &household, nil
}

// IMPROVEMENTS FOR TASK 3: Better error logging and 500 handling

// Enhanced error response with request context
func respondErrorWithContext(w http.ResponseWriter, status int, message string, code string, r *http.Request) {
	logLevel := "WARN"
	if status >= 500 {
		logLevel = "ERROR"
	}

	log.Printf("[%s] %s %s - %d %s: %s", logLevel, r.Method, r.URL.Path, status, code, message)

	respondJSON(w, status, map[string]interface{}{
		"error": message,
		"code":  code,
		"path":  r.URL.Path,
	})
}

// Database operation with error logging
func queryUserWithLogging(email string) (*User, error) {
	var user User
	err := db.QueryRow(`
		SELECT id, email, password_hash, full_name, created_at
		FROM users
		WHERE email = $1
	`, email).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FullName, &user.CreatedAt)

	if err == sql.ErrNoRows {
		log.Printf("User lookup: no user found for email=%s", email)
		return nil, fmt.Errorf("user not found")
	}

	if err != nil {
		log.Printf("ERROR: User lookup failed for email=%s: %v", email, err)
		return nil, fmt.Errorf("database error: %w", err)
	}

	return &user, nil
}

// Recover middleware for catching panics and 500 errors
func recoverMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("ERROR: PANIC recovered - %s %s: %v", r.Method, r.URL.Path, err)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				respondJSON(w, http.StatusInternalServerError, map[string]string{
					"error": "Internal server error",
					"code":  "INTERNAL_ERROR",
				})
			}
		}()
		next.ServeHTTP(w, r)
	})
}
