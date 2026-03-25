package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"strconv"
	"strings"
	"golang.org/x/crypto/bcrypt"
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
	ID          int       `json:"id"`
	HouseholdID string    `json:"household_id"`
	UserID      string    `json:"user_id"`
	Name        string    `json:"name"`
	Quantity    int       `json:"quantity"`
	Unit        string    `json:"unit,omitempty"`
	Category    string    `json:"category,omitempty"`
	ExpirationDate string `json:"expiration_date,omitempty"`
	Notes      string    `json:"notes,omitempty"`
	CreatedAt  time.Time `json:"created_at,omitempty"`
	UpdatedAt  time.Time `json:"updated_at,omitempty"`
}

type Household struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	InviteCode string    `json:"invite_code"`
	CreatedBy  string    `json:"created_by"`
	CreatedAt  time.Time `json:"created_at"`
}

type HouseholdMember struct {
	UserID   string `json:"user_id"`
	Email    string `json:"email"`
	FullName string `json:"full_name,omitempty"`
	Role     string `json:"role"`
}

type HouseholdResponse struct {
	Household Household          `json:"household"`
	Members   []HouseholdMember `json:"members"`
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

// POST /api/households
func createHouseholdHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID, err := getUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
		return
	}

	// Check if user already in household
	_, err = getUserHouseholdID(userID)
	if err == nil {
		http.Error(w, "User already in a household", http.StatusConflict)
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	householdID := uuid.New().String()
	inviteCode := strings.ToUpper(uuid.New().String()[:6]) // Simple 6-char code

	query := `INSERT INTO households (id, name, invite_code, created_by) VALUES ($1, $2, $3, $4)`
	_, err = db.Exec(query, householdID, req.Name, inviteCode, userID)
	if err != nil {
		log.Printf("createHouseholdHandler insert error: %v", err)
		http.Error(w, "Failed to create household", http.StatusInternalServerError)
		return
	}

	// Add creator as owner
	_, err = db.Exec(`INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'owner')`, householdID, userID)
	if err != nil {
		log.Printf("createHouseholdHandler member insert error: %v", err)
		http.Error(w, "Failed to add member", http.StatusInternalServerError)
		return
	}

	household := Household{
		ID:         householdID,
		Name:       req.Name,
		InviteCode: inviteCode,
		CreatedBy:  userID,
		CreatedAt:  time.Now(),
	}
	respondJSON(w, http.StatusCreated, household)
}

// POST /api/households/join
func joinHouseholdHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID, err := getUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
		return
	}

	// Check if user already in household
	_, err = getUserHouseholdID(userID)
	if err == nil {
		http.Error(w, "User already in a household", http.StatusConflict)
		return
	}

	var req struct {
		InviteCode string `json:"invite_code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.InviteCode) == "" {
		http.Error(w, "Invite code is required", http.StatusBadRequest)
		return
	}

	var householdID string
	err = db.QueryRow(`SELECT id FROM households WHERE invite_code = $1`, strings.ToUpper(req.InviteCode)).Scan(&householdID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Invalid invite code", http.StatusNotFound)
			return
		}
		log.Printf("joinHouseholdHandler query error: %v", err)
		http.Error(w, "Failed to join household", http.StatusInternalServerError)
		return
	}

	// Add as member
	_, err = db.Exec(`INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'member')`, householdID, userID)
	if err != nil {
		log.Printf("joinHouseholdHandler member insert error: %v", err)
		http.Error(w, "Failed to join household", http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":      "joined",
		"household_id": householdID,
	})
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

// DELETE /api/households/:id/members/:userId
func removeMemberHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	userID, err := getUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
		return
	}

	// Parse household ID from URL
	householdID := strings.TrimPrefix(r.URL.Path, "/api/households/")
	householdID = strings.Split(householdID, "/")[0]
	if householdID == "" {
		http.Error(w, "Invalid household ID", http.StatusBadRequest)
		return
	}

	// Parse user ID to remove
	userIDToRemove := strings.TrimPrefix(r.URL.Path, "/api/households/"+householdID+"/members/")
	if userIDToRemove == "" {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Check if requester is owner
	err = checkHouseholdOwner(userID, householdID)
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
	http.HandleFunc("/api/households", enableCORS(createHouseholdHandler))
	http.HandleFunc("/api/households/join", enableCORS(joinHouseholdHandler))
	http.HandleFunc("/api/households/me", enableCORS(getHouseholdHandler))
	http.HandleFunc("/api/households/", enableCORS(removeMemberHandler))
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

	port := ":8080"
	fmt.Printf("Server starting on port %s\n", port)
	log.Fatal(http.ListenAndServe(port, nil))
}
