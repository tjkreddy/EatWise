package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
	"strconv"
	"strings"
)

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FullName     string    `json:"full_name,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type SignupRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name,omitempty"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type PantryItem struct {
	ID             int       `json:"id"`
	HouseholdID    string    `json:"household_id"`
	UserID         string    `json:"user_id"`
	Name           string    `json:"name"`
	Quantity       int       `json:"quantity"`
	Unit           string    `json:"unit,omitempty"`
	Category       string    `json:"category,omitempty"`
	ExpirationDate string    `json:"expiration_date,omitempty"`
	Notes          string    `json:"notes,omitempty"`
	CreatedAt      time.Time `json:"created_at,omitempty"`
	UpdatedAt      time.Time `json:"updated_at,omitempty"`
}

type ShoppingItem struct {
	ID          int       `json:"id"`
	HouseholdID string    `json:"household_id"`
	UserID      string    `json:"user_id"`
	Name        string    `json:"name"`
	Quantity    int       `json:"quantity"`
	Unit        string    `json:"unit,omitempty"`
	Category    string    `json:"category,omitempty"`
	Purchased   bool      `json:"purchased"`
	PurchasedAt *time.Time `json:"purchased_at,omitempty"`
	CreatedAt   time.Time `json:"created_at,omitempty"`
}

type Household struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	InviteCode string    `json:"invite_code"`
	CreatedBy  string    `json:"created_by"`
	CreatedAt  time.Time `json:"created_at"`
}

type HouseholdMember struct {
	UserID   string  `json:"user_id"`
	Email    string  `json:"email"`
	FullName *string `json:"full_name,omitempty"`
	Role     string  `json:"role"`
}

type HouseholdResponse struct {
	Household Household          `json:"household"`
	Members   []HouseholdMember `json:"members"`
}

type CreateHouseholdRequest struct {
	Name string `json:"name"`
}

type JoinHouseholdRequest struct {
	InviteCode string `json:"invite_code"`
}

type HouseholdMeResponse struct {
	Household Household         `json:"household"`
	Members   []HouseholdMember `json:"members"`
}

type HouseholdSummaryResponse struct {
	HouseholdID        string `json:"household_id"`
	HouseholdName      string `json:"household_name"`
	CurrentUserRole    string `json:"current_user_role"`
	MembersCount       int    `json:"members_count"`
	PantryItemsCount   int    `json:"pantry_items_count"`
	ShoppingItemsCount int    `json:"shopping_items_count"`
	PurchasedCount     int    `json:"purchased_count"`
	PendingCount       int    `json:"pending_count"`
}

var db *sql.DB
var jwtSecret []byte

func initDB() error {
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return errors.New("DATABASE_URL not set")
	}

	var err error
	db, err = sql.Open("postgres", dbURL)
	if err != nil {
		return err
	}

	return db.Ping()
}

func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}

func checkPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func generateJWT(userID string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	})

	return token.SignedString(jwtSecret)
}

func signupHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		http.Error(w, "Email and password required", http.StatusBadRequest)
		return
	}

	if len(req.Password) < 6 {
		http.Error(w, "Password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	hash, err := hashPassword(req.Password)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	log.Printf("Signup: Email=%s, Password length=%d, Hash length=%d", req.Email, len(req.Password), len(hash))

	userID := uuid.New().String()
	query := `INSERT INTO users (id, email, password_hash, full_name) VALUES ($1, $2, $3, $4)`
	_, err = db.Exec(query, userID, req.Email, hash, req.FullName)
	if err != nil {
		if err.Error() == "pq: duplicate key value violates unique constraint \"users_email_key\"" {
			http.Error(w, "Email already exists", http.StatusConflict)
			return
		}
		log.Printf("Signup error: %v", err)
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	token, err := generateJWT(userID)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	user := User{
		ID:        userID,
		Email:     req.Email,
		FullName:  req.FullName,
		CreatedAt: time.Now(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AuthResponse{Token: token, User: user})
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var user User
	query := `SELECT id, email, password_hash, full_name, created_at FROM users WHERE email = $1`
	err := db.QueryRow(query, req.Email).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FullName, &user.CreatedAt)
	if err != nil {
		log.Printf("Login: User not found for email=%s, error=%v", req.Email, err)
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	log.Printf("Login: Email=%s, Password length=%d, Hash length=%d, User ID=%s", req.Email, len(req.Password), len(user.PasswordHash), user.ID)

	if !checkPassword(req.Password, user.PasswordHash) {
		log.Printf("Login: Password check failed for email=%s", req.Email)
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	token, err := generateJWT(user.ID)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	user.PasswordHash = ""
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AuthResponse{Token: token, User: user})
}

func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func respondJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func respondError(w http.ResponseWriter, status int, message string, code string) {
	respondJSON(w, status, map[string]string{
		"error": message,
		"code":  code,
	})
}

func getUserIDFromRequest(r *http.Request) (string, error) {
	auth := r.Header.Get("Authorization")
	if auth == "" {
		return "", errors.New("authorization header missing")
	}
	parts := strings.Split(auth, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return "", errors.New("invalid authorization header format")
	}
	tokenStr := parts[1]
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return "", errors.New("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", errors.New("invalid token claims")
	}
	uid, ok := claims["user_id"].(string)
	if !ok || uid == "" {
		return "", errors.New("user_id not found in token")
	}
	return uid, nil
}

func getUserHouseholdID(userID string) (string, error) {
	var householdID string
	err := db.QueryRow(`SELECT household_id FROM household_members WHERE user_id = $1`, userID).Scan(&householdID)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", errors.New("user not in any household")
		}
		return "", err
	}
	return householdID, nil
}

func checkHouseholdMembership(userID, householdID string) error {
	var exists bool
	err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM household_members WHERE user_id = $1 AND household_id = $2)`, userID, householdID).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return errors.New("user not member of household")
	}
	return nil
}

func checkHouseholdOwner(userID, householdID string) error {
	var role string
	err := db.QueryRow(`SELECT role FROM household_members WHERE user_id = $1 AND household_id = $2`, userID, householdID).Scan(&role)
	if err != nil {
		return err
	}
	if role != "owner" {
		return errors.New("user is not owner of household")
	}
	return nil
}

func parseIDFromPath(prefix string, r *http.Request) (int, error) {
	// expect path like /api/pantry/items/{id}
	p := strings.TrimPrefix(r.URL.Path, prefix)
	p = strings.Trim(p, "/")
	if p == "" {
		return 0, errors.New("missing id in path")
	}
	id, err := strconv.Atoi(p)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func generateInviteCode(length int) (string, error) {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, length)
	for i := range b {
		n, err := rand.Int(rand.Reader, bigInt(int64(len(chars))))
		if err != nil {
			return "", err
		}
		b[i] = chars[n.Int64()]
	}
	return string(b), nil
}

func bigInt(v int64) *big.Int {
	return new(big.Int).SetInt64(v)
}

func generateUniqueInviteCode() (string, error) {
	for i := 0; i < 10; i++ {
		code, err := generateInviteCode(6)
		if err != nil {
			return "", err
		}
		var exists bool
		err = db.QueryRow(`SELECT EXISTS(SELECT 1 FROM households WHERE invite_code = $1)`, code).Scan(&exists)
		if err != nil {
			return "", err
		}
		if !exists {
			return code, nil
		}
	}
	return "", errors.New("failed to generate unique invite code")
}

func listMembersByHouseholdID(householdID string) ([]HouseholdMember, error) {
	rows, err := db.Query(`
		SELECT u.id, u.email, u.full_name, hm.role
		FROM household_members hm
		JOIN users u ON u.id = hm.user_id
		WHERE hm.household_id = $1
		ORDER BY hm.joined_at ASC
	`, householdID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	members := []HouseholdMember{}
	for rows.Next() {
		var m HouseholdMember
		var fullName sql.NullString
		if err := rows.Scan(&m.UserID, &m.Email, &fullName, &m.Role); err != nil {
			return nil, err
		}
		if fullName.Valid {
			m.FullName = &fullName.String
		}
		members = append(members, m)
	}
	return members, nil
}

func isUserHouseholdMember(userID, householdID string) (bool, error) {
	var exists bool
	err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM household_members WHERE user_id = $1 AND household_id = $2)`, userID, householdID).Scan(&exists)
	return exists, err
}

func parseHouseholdIDForMembers(path string) (string, error) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 4 || parts[0] != "api" || parts[1] != "households" || parts[3] != "members" {
		return "", errors.New("invalid household members path")
	}
	if _, err := uuid.Parse(parts[2]); err != nil {
		return "", errors.New("invalid household id")
	}
	return parts[2], nil
}

// POST /api/households
func createHouseholdHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
		return
	}

	userID, err := getUserIDFromRequest(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized: "+err.Error(), "UNAUTHORIZED")
		return
	}

	if _, err := getUserHouseholdID(userID); err == nil {
		respondError(w, http.StatusConflict, "User already in a household", "CONFLICT")
		return
	}

	var req CreateHouseholdRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body", "INVALID_REQUEST")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		respondError(w, http.StatusBadRequest, "Household name is required", "VALIDATION_ERROR")
		return
	}

	inviteCode, err := generateUniqueInviteCode()
	if err != nil {
		log.Printf("createHouseholdHandler invite code error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to generate invite code", "INTERNAL_ERROR")
		return
	}

	tx, err := db.Begin()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to start transaction", "INTERNAL_ERROR")
		return
	}
	defer tx.Rollback()

	householdID := uuid.New().String()
	var createdAt time.Time
	err = tx.QueryRow(`
		INSERT INTO households (id, name, invite_code, created_by)
		VALUES ($1, $2, $3, $4)
		RETURNING created_at
	`, householdID, req.Name, inviteCode, userID).Scan(&createdAt)
	if err != nil {
		log.Printf("createHouseholdHandler household insert error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to create household", "INTERNAL_ERROR")
		return
	}

	_, err = tx.Exec(`
		INSERT INTO household_members (id, household_id, user_id, role)
		VALUES ($1, $2, $3, 'owner')
	`, uuid.New().String(), householdID, userID)
	if err != nil {
		log.Printf("createHouseholdHandler membership insert error: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to create household membership", "INTERNAL_ERROR")
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to commit transaction", "INTERNAL_ERROR")
		return
	}

	respondJSON(w, http.StatusCreated, Household{
		ID:         householdID,
		Name:       req.Name,
		InviteCode: inviteCode,
		CreatedBy:  userID,
		CreatedAt:  createdAt,
	})
}

// DELETE /api/households
func deleteMyHouseholdHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

		userID, err := getUserIDFromRequest(r)
		if err != nil {
			http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
			return
		}

		householdID, err := getUserHouseholdID(userID)
		if err != nil {
			http.Error(w, "User not in household", http.StatusNotFound)
			return
		}

		err = checkHouseholdOwner(userID, householdID)
		if err != nil {
			http.Error(w, "Forbidden: only owner can delete household", http.StatusForbidden)
			return
		}

		result, err := db.Exec(`DELETE FROM households WHERE id = $1`, householdID)
		if err != nil {
			log.Printf("deleteMyHouseholdHandler delete error: %v", err)
			http.Error(w, "Failed to delete household", http.StatusInternalServerError)
			return
		}

		rowsAffected, err := result.RowsAffected()
		if err != nil || rowsAffected == 0 {
			http.Error(w, "Household not found", http.StatusNotFound)
			return
		}

		respondJSON(w, http.StatusOK, map[string]string{"message": "household deleted"})
	}

// POST /api/households or DELETE /api/households
func householdsRootHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		createHouseholdHandler(w, r)
		return
	}
	if r.Method == http.MethodDelete {
		deleteMyHouseholdHandler(w, r)
		return
	}
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

// POST /api/households/join
func joinHouseholdHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
		return
	}

	userID, err := getUserIDFromRequest(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized: "+err.Error(), "UNAUTHORIZED")
		return
	}

	if _, err := getUserHouseholdID(userID); err == nil {
		respondError(w, http.StatusConflict, "User already in a household", "CONFLICT")
		return
	}

	var req JoinHouseholdRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body", "INVALID_REQUEST")
		return
	}

	inviteCode := strings.ToUpper(strings.TrimSpace(req.InviteCode))
	if inviteCode == "" {
		respondError(w, http.StatusBadRequest, "invite_code is required", "VALIDATION_ERROR")
		return
	}

	tx, err := db.Begin()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to start transaction", "INTERNAL_ERROR")
		return
	}
	defer tx.Rollback()

	var householdID string
	err = tx.QueryRow(`SELECT id FROM households WHERE invite_code = $1`, inviteCode).Scan(&householdID)
	if err == sql.ErrNoRows {
		respondError(w, http.StatusNotFound, "Invalid invite code", "NOT_FOUND")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to find household", "INTERNAL_ERROR")
		return
	}

	var exists bool
	err = tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM household_members WHERE household_id = $1 AND user_id = $2)`, householdID, userID).Scan(&exists)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to verify membership", "INTERNAL_ERROR")
		return
	}
	if exists {
		respondError(w, http.StatusConflict, "User is already a member of this household", "CONFLICT")
		return
	}

	_, err = tx.Exec(`
		INSERT INTO household_members (id, household_id, user_id, role)
		VALUES ($1, $2, $3, 'member')
	`, uuid.New().String(), householdID, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to join household", "INTERNAL_ERROR")
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to commit transaction", "INTERNAL_ERROR")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{
		"message":      "joined",
		"household_id": householdID,
	})
}

// GET /api/households/me
func getMyHouseholdHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
		return
	}

	userID, err := getUserIDFromRequest(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized: "+err.Error(), "UNAUTHORIZED")
		return
	}

	var h Household
	err = db.QueryRow(`
		SELECT h.id, h.name, h.invite_code, h.created_by, h.created_at
		FROM household_members hm
		JOIN households h ON h.id = hm.household_id
		WHERE hm.user_id = $1
		ORDER BY hm.joined_at ASC
		LIMIT 1
	`, userID).Scan(&h.ID, &h.Name, &h.InviteCode, &h.CreatedBy, &h.CreatedAt)
	if err == sql.ErrNoRows {
		respondError(w, http.StatusNotFound, "No household found for user", "NOT_FOUND")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch household", "INTERNAL_ERROR")
		return
	}

	members, err := listMembersByHouseholdID(h.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch household members", "INTERNAL_ERROR")
		return
	}

	respondJSON(w, http.StatusOK, HouseholdMeResponse{
		Household: h,
		Members:   members,
	})
}

// GET /api/households/:id/members
func listHouseholdMembersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
		return
	}

	userID, err := getUserIDFromRequest(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized: "+err.Error(), "UNAUTHORIZED")
		return
	}

	householdID, err := parseHouseholdIDForMembers(r.URL.Path)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid household members path", "INVALID_REQUEST")
		return
	}

	allowed, err := isUserHouseholdMember(userID, householdID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to verify membership", "INTERNAL_ERROR")
		return
	}
	if !allowed {
		respondError(w, http.StatusForbidden, "You are not a member of this household", "FORBIDDEN")
		return
	}

	members, err := listMembersByHouseholdID(householdID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch household members", "INTERNAL_ERROR")
		return
	}

	respondJSON(w, http.StatusOK, members)
}

// GET /api/households/me/summary
func getHouseholdSummaryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
		return
	}

	userID, err := getUserIDFromRequest(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized: "+err.Error(), "UNAUTHORIZED")
		return
	}

	householdID, err := getUserHouseholdID(userID)
	if err != nil {
		respondError(w, http.StatusNotFound, "No household found for user", "NOT_FOUND")
		return
	}

	var summary HouseholdSummaryResponse
	if err := db.QueryRow(`SELECT name FROM households WHERE id = $1`, householdID).Scan(&summary.HouseholdName); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch household", "INTERNAL_ERROR")
		return
	}
	summary.HouseholdID = householdID

	if err := db.QueryRow(`SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2`, householdID, userID).Scan(&summary.CurrentUserRole); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch household role", "INTERNAL_ERROR")
		return
	}

	if err := db.QueryRow(`SELECT COUNT(*) FROM household_members WHERE household_id = $1`, householdID).Scan(&summary.MembersCount); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to count household members", "INTERNAL_ERROR")
		return
	}

	if err := db.QueryRow(`SELECT COUNT(*) FROM pantry_items WHERE household_id = $1`, householdID).Scan(&summary.PantryItemsCount); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to count pantry items", "INTERNAL_ERROR")
		return
	}

	if err := db.QueryRow(`SELECT COUNT(*) FROM shopping_list WHERE household_id = $1`, householdID).Scan(&summary.ShoppingItemsCount); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to count shopping items", "INTERNAL_ERROR")
		return
	}

	if err := db.QueryRow(`SELECT COUNT(*) FROM shopping_list WHERE household_id = $1 AND purchased = true`, householdID).Scan(&summary.PurchasedCount); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to count purchased items", "INTERNAL_ERROR")
		return
	}
	summary.PendingCount = summary.ShoppingItemsCount - summary.PurchasedCount

	respondJSON(w, http.StatusOK, summary)
}

// GET /api/pantry/items
func fetchPantryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID, err := getUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
		return
	}
	householdID, err := getUserHouseholdID(userID)
	if err != nil {
		http.Error(w, "User not in household: "+err.Error(), http.StatusForbidden)
		return
	}
	rows, err := db.Query(`SELECT id, household_id, user_id, name, quantity, unit, category, expiration_date, notes, created_at, updated_at FROM pantry_items WHERE household_id = $1 ORDER BY id`, householdID)
	if err != nil {
		log.Printf("fetchPantryHandler query error: %v", err)
		http.Error(w, "Failed to fetch items", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	items := []PantryItem{}
	for rows.Next() {
		var it PantryItem
		var exp sql.NullTime
		if err := rows.Scan(&it.ID, &it.HouseholdID, &it.UserID, &it.Name, &it.Quantity, &it.Unit, &it.Category, &exp, &it.Notes, &it.CreatedAt, &it.UpdatedAt); err != nil {
			log.Printf("fetchPantryHandler scan error: %v", err)
			continue
		}
		if exp.Valid {
			it.ExpirationDate = exp.Time.Format("2006-01-02")
		}
		items = append(items, it)
	}
	respondJSON(w, http.StatusOK, items)
}

// POST /api/pantry/items
func addPantryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID, err := getUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
		return
	}
	householdID, err := getUserHouseholdID(userID)
	if err != nil {
		http.Error(w, "User not in household: "+err.Error(), http.StatusForbidden)
		return
	}
	var req struct {
		Name     string `json:"name"`
		Quantity int    `json:"quantity"`
		Unit     string `json:"unit,omitempty"`
		Category string `json:"category,omitempty"`
		ExpDate  string `json:"expiration_date,omitempty"`
		Notes    string `json:"notes,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}
	if req.Quantity < 0 {
		http.Error(w, "Quantity must be non-negative", http.StatusBadRequest)
		return
	}
	var exp sql.NullTime
	if req.ExpDate != "" {
		t, err := time.Parse("2006-01-02", req.ExpDate)
		if err != nil {
			http.Error(w, "Invalid expiration_date format (use YYYY-MM-DD)", http.StatusBadRequest)
			return
		}
		exp = sql.NullTime{Time: t, Valid: true}
	}
	query := `INSERT INTO pantry_items (household_id, user_id, name, quantity, unit, category, expiration_date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, created_at, updated_at`
	var id int
	var createdAt, updatedAt time.Time
	err = db.QueryRow(query, householdID, userID, req.Name, req.Quantity, req.Unit, req.Category, exp, req.Notes).Scan(&id, &createdAt, &updatedAt)
	if err != nil {
		log.Printf("addPantryHandler insert error: %v", err)
		http.Error(w, "Failed to add item", http.StatusInternalServerError)
		return
	}
	item := PantryItem{
		ID:          id,
		HouseholdID: householdID,
		UserID:      userID,
		Name:        req.Name,
		Quantity:    req.Quantity,
		Unit:        req.Unit,
		Category:    req.Category,
		Notes:       req.Notes,
		CreatedAt:   createdAt,
		UpdatedAt:   updatedAt,
	}
	if exp.Valid {
		item.ExpirationDate = exp.Time.Format("2006-01-02")
	}
	respondJSON(w, http.StatusCreated, item)
}

// DELETE /api/pantry/items/{id}
func deletePantryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID, err := getUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
		return
	}
	householdID, err := getUserHouseholdID(userID)
	if err != nil {
		http.Error(w, "User not in household: "+err.Error(), http.StatusForbidden)
		return
	}
	id, err := parseIDFromPath("/api/pantry/items/", r)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}
	// Ensure item belongs to household
	var exists bool
	err = db.QueryRow(`SELECT EXISTS(SELECT 1 FROM pantry_items WHERE id=$1 AND household_id=$2)`, id, householdID).Scan(&exists)
	if err != nil {
		log.Printf("deletePantryHandler exists check error: %v", err)
		http.Error(w, "Failed to delete item", http.StatusInternalServerError)
		return
	}
	if !exists {
		http.Error(w, "Item not found", http.StatusNotFound)
		return
	}
	_, err = db.Exec(`DELETE FROM pantry_items WHERE id=$1 AND household_id=$2`, id, householdID)
	if err != nil {
		log.Printf("deletePantryHandler delete error: %v", err)
		http.Error(w, "Failed to delete item", http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"message": "deleted"})
}

// PUT /api/pantry/items/{id}
func updatePantryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID, err := getUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
		return
	}
	householdID, err := getUserHouseholdID(userID)
	if err != nil {
		http.Error(w, "User not in household: "+err.Error(), http.StatusForbidden)
		return
	}
	id, err := parseIDFromPath("/api/pantry/items/", r)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}
	var req struct {
		Name     *string `json:"name,omitempty"`
		Quantity *int    `json:"quantity,omitempty"`
		Unit     *string `json:"unit,omitempty"`
		Category *string `json:"category,omitempty"`
		ExpDate  *string `json:"expiration_date,omitempty"`
		Notes    *string `json:"notes,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	// Check exists and belongs to household
	var exists bool
	err = db.QueryRow(`SELECT EXISTS(SELECT 1 FROM pantry_items WHERE id=$1 AND household_id=$2)`, id, householdID).Scan(&exists)
	if err != nil {
		log.Printf("updatePantryHandler exists check error: %v", err)
		http.Error(w, "Failed to update item", http.StatusInternalServerError)
		return
	}
	if !exists {
		http.Error(w, "Item not found", http.StatusNotFound)
		return
	}
	// Build update dynamically
	sets := []string{}
	args := []interface{}{}
	argPos := 1
	if req.Name != nil {
		if strings.TrimSpace(*req.Name) == "" {
			http.Error(w, "Name cannot be empty", http.StatusBadRequest)
			return
		}
		sets = append(sets, fmt.Sprintf("name=$%d", argPos))
		args = append(args, *req.Name)
		argPos++
	}
	if req.Quantity != nil {
		if *req.Quantity < 0 {
			http.Error(w, "Quantity must be non-negative", http.StatusBadRequest)
			return
		}
		sets = append(sets, fmt.Sprintf("quantity=$%d", argPos))
		args = append(args, *req.Quantity)
		argPos++
	}
	if req.Unit != nil {
		sets = append(sets, fmt.Sprintf("unit=$%d", argPos))
		args = append(args, *req.Unit)
		argPos++
	}
	if req.Category != nil {
		sets = append(sets, fmt.Sprintf("category=$%d", argPos))
		args = append(args, *req.Category)
		argPos++
	}
	if req.Notes != nil {
		sets = append(sets, fmt.Sprintf("notes=$%d", argPos))
		args = append(args, *req.Notes)
		argPos++
	}
	if req.ExpDate != nil {
		if *req.ExpDate == "" {
			sets = append(sets, fmt.Sprintf("expiration_date = NULL"))
		} else {
			t, err := time.Parse("2006-01-02", *req.ExpDate)
			if err != nil {
				http.Error(w, "Invalid expiration_date format (use YYYY-MM-DD)", http.StatusBadRequest)
				return
			}
			sets = append(sets, fmt.Sprintf("expiration_date=$%d", argPos))
			args = append(args, t)
			argPos++
		}
	}
	if len(sets) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}
	// Append updated_at
	sets = append(sets, fmt.Sprintf("updated_at = $%d", argPos))
	args = append(args, time.Now())
	argPos++

	// Build final query
	query := fmt.Sprintf("UPDATE pantry_items SET %s WHERE id=$%d AND household_id=$%d RETURNING id, household_id, user_id, name, quantity, unit, category, expiration_date, notes, created_at, updated_at", strings.Join(sets, ", "), argPos, argPos+1)
	args = append(args, id, householdID)

	var it PantryItem
	var exp sql.NullTime
	row := db.QueryRow(query, args...)
	if err := row.Scan(&it.ID, &it.HouseholdID, &it.UserID, &it.Name, &it.Quantity, &it.Unit, &it.Category, &exp, &it.Notes, &it.CreatedAt, &it.UpdatedAt); err != nil {
		log.Printf("updatePantryHandler scan error: %v", err)
		http.Error(w, "Failed to update item", http.StatusInternalServerError)
		return
	}
	if exp.Valid {
		it.ExpirationDate = exp.Time.Format("2006-01-02")
	}
	respondJSON(w, http.StatusOK, it)
}

// GET /api/households/me
func getHouseholdHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID, err := getUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
		return
	}

	householdID, err := getUserHouseholdID(userID)
	if err != nil {
		http.Error(w, "User not in household: "+err.Error(), http.StatusNotFound)
		return
	}

	var household Household
	err = db.QueryRow(`SELECT id, name, invite_code, created_by, created_at FROM households WHERE id = $1`, householdID).Scan(
		&household.ID, &household.Name, &household.InviteCode, &household.CreatedBy, &household.CreatedAt)
	if err != nil {
		log.Printf("getHouseholdHandler query error: %v", err)
		http.Error(w, "Failed to get household", http.StatusInternalServerError)
		return
	}

	rows, err := db.Query(`
		SELECT hm.user_id, u.email, u.full_name, hm.role
		FROM household_members hm
		JOIN users u ON hm.user_id = u.id
		WHERE hm.household_id = $1
		ORDER BY hm.joined_at`, householdID)
	if err != nil {
		log.Printf("getHouseholdHandler members query error: %v", err)
		http.Error(w, "Failed to get members", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	members := []HouseholdMember{}
	for rows.Next() {
		var m HouseholdMember
		err := rows.Scan(&m.UserID, &m.Email, &m.FullName, &m.Role)
		if err != nil {
			log.Printf("getHouseholdHandler scan error: %v", err)
			continue
		}
		members = append(members, m)
	}

	response := HouseholdResponse{
		Household: household,
		Members:   members,
	}
	respondJSON(w, http.StatusOK, response)
}

// DELETE /api/households/:id
func deleteHouseholdHandler(w http.ResponseWriter, r *http.Request, userID string, householdID string) {
	err := checkHouseholdOwner(userID, householdID)
	if err != nil {
		http.Error(w, "Forbidden: "+err.Error(), http.StatusForbidden)
		return
	}

	result, err := db.Exec(`DELETE FROM households WHERE id = $1`, householdID)
	if err != nil {
		log.Printf("deleteHouseholdHandler delete error: %v", err)
		http.Error(w, "Failed to delete household", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "Household not found", http.StatusNotFound)
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "household deleted"})
}

// DELETE /api/households/:id/members/:userId
func removeMemberHandler(w http.ResponseWriter, r *http.Request, userID string, householdID string, userIDToRemove string) {
	// Check if requester is owner
	err := checkHouseholdOwner(userID, householdID)
	if err != nil {
		http.Error(w, "Forbidden: "+err.Error(), http.StatusForbidden)
		return
	}

	// Cannot remove self if owner (unless transfer ownership, but not implemented)
	if userID == userIDToRemove {
		http.Error(w, "Cannot remove yourself as owner", http.StatusBadRequest)
		return
	}

	// Check if target user is in household
	err = checkHouseholdMembership(userIDToRemove, householdID)
	if err != nil {
		http.Error(w, "User not in household", http.StatusNotFound)
		return
	}

	// Remove member
	_, err = db.Exec(`DELETE FROM household_members WHERE household_id = $1 AND user_id = $2`, householdID, userIDToRemove)
	if err != nil {
		log.Printf("removeMemberHandler delete error: %v", err)
		http.Error(w, "Failed to remove member", http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "member removed"})
}

// GET /api/households/:id/members
func listMembersSubrouteHandler(w http.ResponseWriter, r *http.Request, userID string, householdID string) {
	allowed, err := isUserHouseholdMember(userID, householdID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to verify membership", "INTERNAL_ERROR")
		return
	}
	if !allowed {
		respondError(w, http.StatusForbidden, "You are not a member of this household", "FORBIDDEN")
		return
	}

	members, err := listMembersByHouseholdID(householdID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch household members", "INTERNAL_ERROR")
		return
	}

	respondJSON(w, http.StatusOK, members)
}

// GET or DELETE /api/households/:id and subroutes
func householdSubrouteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
		return
	}
	userID, err := getUserIDFromRequest(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "Unauthorized: "+err.Error(), "UNAUTHORIZED")
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/households/")
	path = strings.Trim(path, "/")
	if path == "" {
		http.Error(w, "Invalid household path", http.StatusBadRequest)
		return
	}

	parts := strings.Split(path, "/")
	householdID := parts[0]
	if householdID == "" {
		respondError(w, http.StatusBadRequest, "Invalid household ID", "INVALID_REQUEST")
		return
	}

	if r.Method == http.MethodGet {
		if len(parts) != 2 || parts[1] != "members" {
			respondError(w, http.StatusBadRequest, "Invalid household route", "INVALID_REQUEST")
			return
		}
		listMembersSubrouteHandler(w, r, userID, householdID)
		return
	}

	if len(parts) == 1 {
		deleteHouseholdHandler(w, r, userID, householdID)
		return
	}

	if len(parts) != 3 || parts[1] != "members" || parts[2] == "" {
		respondError(w, http.StatusBadRequest, "Invalid household route", "INVALID_REQUEST")
		return
	}

	removeMemberHandler(w, r, userID, householdID, parts[2])
}

// POST /api/households/leave
func leaveHouseholdHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, err := getUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
		return
	}

	householdID, err := getUserHouseholdID(userID)
	if err != nil {
		http.Error(w, "User not in household: "+err.Error(), http.StatusNotFound)
		return
	}

	// Check if user is owner
	var role string
	err = db.QueryRow(`SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2`, householdID, userID).Scan(&role)
	if err != nil {
		http.Error(w, "Failed to verify membership", http.StatusInternalServerError)
		return
	}

	if role == "owner" {
		http.Error(w, "Owner cannot leave household. Delete the household or transfer ownership first.", http.StatusForbidden)
		return
	}

	// Remove user from household
	_, err = db.Exec(`DELETE FROM household_members WHERE household_id = $1 AND user_id = $2`, householdID, userID)
	if err != nil {
		log.Printf("leaveHouseholdHandler delete error: %v", err)
		http.Error(w, "Failed to leave household", http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "left household successfully"})
}

// Shopping List Handlers

// GET /api/shopping-list
func getShoppingListHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, err := getUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
		return
	}

	householdID, err := getUserHouseholdID(userID)
	if err != nil {
		http.Error(w, "User not in household: "+err.Error(), http.StatusNotFound)
		return
	}

	rows, err := db.Query(`
		SELECT id, household_id, user_id, name, quantity, unit, category, purchased, purchased_at, created_at
		FROM shopping_list
		WHERE household_id = $1
		ORDER BY created_at DESC
	`, householdID)
	if err != nil {
		log.Printf("getShoppingListHandler query error: %v", err)
		http.Error(w, "Failed to fetch shopping items", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	items := []ShoppingItem{}
	for rows.Next() {
		var item ShoppingItem
		err := rows.Scan(&item.ID, &item.HouseholdID, &item.UserID, &item.Name, &item.Quantity, 
			&item.Unit, &item.Category, &item.Purchased, &item.PurchasedAt, &item.CreatedAt)
		if err != nil {
			log.Printf("getShoppingListHandler scan error: %v", err)
			continue
		}
		items = append(items, item)
	}

	respondJSON(w, http.StatusOK, items)
}

// POST /api/shopping-list
func addShoppingItemHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, err := getUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
		return
	}

	householdID, err := getUserHouseholdID(userID)
	if err != nil {
		http.Error(w, "User not in household: "+err.Error(), http.StatusNotFound)
		return
	}

	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	name, ok := req["name"].(string)
	if !ok || name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	quantity := 1
	if q, ok := req["quantity"].(float64); ok {
		quantity = int(q)
	}

	unit, _ := req["unit"].(string)
	category, _ := req["category"].(string)

	var id int
	var createdAt time.Time
	err = db.QueryRow(`
		INSERT INTO shopping_list (household_id, user_id, name, quantity, unit, category)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`, householdID, userID, name, quantity, unit, category).Scan(&id, &createdAt)
	if err != nil {
		log.Printf("addShoppingItemHandler insert error: %v", err)
		http.Error(w, "Failed to add shopping item", http.StatusInternalServerError)
		return
	}

	item := ShoppingItem{
		ID:          id,
		HouseholdID: householdID,
		UserID:      userID,
		Name:        name,
		Quantity:    quantity,
		Unit:        unit,
		Category:    category,
		Purchased:   false,
		CreatedAt:   createdAt,
	}

	respondJSON(w, http.StatusCreated, item)
}

// PUT /api/shopping-list/:id
func updateShoppingItemHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, err := getUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
		return
	}

	householdID, err := getUserHouseholdID(userID)
	if err != nil {
		http.Error(w, "User not in household: "+err.Error(), http.StatusNotFound)
		return
	}

	// Parse item ID from URL
	itemID, err := strconv.Atoi(strings.TrimPrefix(r.URL.Path, "/api/shopping-list/"))
	if err != nil {
		http.Error(w, "Invalid item ID", http.StatusBadRequest)
		return
	}

	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Check if item belongs to user's household
	var existing ShoppingItem
	err = db.QueryRow(`
		SELECT id, household_id, user_id, name, quantity, unit, category, purchased, purchased_at, created_at
		FROM shopping_list WHERE id = $1 AND household_id = $2
	`, itemID, householdID).Scan(
		&existing.ID, &existing.HouseholdID, &existing.UserID, &existing.Name, &existing.Quantity,
		&existing.Unit, &existing.Category, &existing.Purchased, &existing.PurchasedAt, &existing.CreatedAt,
	)
	if err == sql.ErrNoRows {
		http.Error(w, "Item not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Failed to fetch item", http.StatusInternalServerError)
		return
	}

	// Update fields
	if purchased, ok := req["purchased"].(bool); ok {
		var purchasedAt *time.Time
		if purchased {
			now := time.Now()
			purchasedAt = &now
		}
		_, err := db.Exec(`
			UPDATE shopping_list
			SET purchased = $1, purchased_at = $2, updated_at = NOW()
			WHERE id = $3
		`, purchased, purchasedAt, itemID)
		if err != nil {
			http.Error(w, "Failed to update item", http.StatusInternalServerError)
			return
		}
		existing.Purchased = purchased
		existing.PurchasedAt = purchasedAt
	}

	respondJSON(w, http.StatusOK, existing)
}

// DELETE /api/shopping-list/:id
func deleteShoppingItemHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, err := getUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
		return
	}

	householdID, err := getUserHouseholdID(userID)
	if err != nil {
		http.Error(w, "User not in household: "+err.Error(), http.StatusNotFound)
		return
	}

	// Parse item ID from URL
	itemID, err := strconv.Atoi(strings.TrimPrefix(r.URL.Path, "/api/shopping-list/"))
	if err != nil {
		http.Error(w, "Invalid item ID", http.StatusBadRequest)
		return
	}

	result, err := db.Exec(`
		DELETE FROM shopping_list
		WHERE id = $1 AND household_id = $2
	`, itemID, householdID)
	if err != nil {
		http.Error(w, "Failed to delete item", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "Item not found", http.StatusNotFound)
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "item deleted"})
}

func main() {
	if err := initDB(); err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	defer db.Close()

	jwtSecret = []byte(os.Getenv("JWT_SECRET"))
	if len(jwtSecret) == 0 {
		jwtSecret = []byte("your-secret-key-change-in-production")
		log.Println("Warning: Using default JWT secret")
	}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Welcome to EatWise API!")
	})
	http.HandleFunc("/api/auth/signup", enableCORS(signupHandler))
	http.HandleFunc("/api/auth/login", enableCORS(loginHandler))

	// Household routes
	http.HandleFunc("/api/households", enableCORS(householdsRootHandler))
	http.HandleFunc("/api/households/join", enableCORS(joinHouseholdHandler))
	http.HandleFunc("/api/households/leave", enableCORS(leaveHouseholdHandler))
	http.HandleFunc("/api/households/me", enableCORS(getHouseholdHandler))
	http.HandleFunc("/api/households/me/summary", enableCORS(getHouseholdSummaryHandler))
	http.HandleFunc("/api/households/", enableCORS(householdSubrouteHandler))

	// Pantry routes
	http.HandleFunc("/api/pantry/items", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			fetchPantryHandler(w, r)
			return
		}
		if r.Method == http.MethodPost {
			addPantryHandler(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}))
	http.HandleFunc("/api/pantry/items/", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			deletePantryHandler(w, r)
			return
		}
		if r.Method == http.MethodPut {
			updatePantryHandler(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}))

	// Shopping List routes
	http.HandleFunc("/api/shopping-list", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			getShoppingListHandler(w, r)
			return
		}
		if r.Method == http.MethodPost {
			addShoppingItemHandler(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}))
	http.HandleFunc("/api/shopping-list/", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			deleteShoppingItemHandler(w, r)
			return
		}
		if r.Method == http.MethodPut {
			updateShoppingItemHandler(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}))

	port := ":8080"
	fmt.Printf("Server starting on port %s\n", port)
	log.Fatal(http.ListenAndServe(port, nil))
}
