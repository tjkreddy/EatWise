package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	FullName string `json:"full_name,omitempty"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type PantryItem struct {
	ID       int    `json:"id"`
	UserID   string `json:"user_id"`
	Name     string `json:"name"`
	Quantity int    `json:"quantity"`
	Unit     string `json:"unit,omitempty"`
}

var users = map[string]User{}
var pantry = map[string]map[int]PantryItem{} // userID -> id -> item
var idCounter = 1

func respondJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func signupHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Email string `json:"email"`
		Password string `json:"password"`
		FullName string `json:"full_name,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Email) == "" || strings.TrimSpace(req.Password) == "" {
		http.Error(w, "email and password required", http.StatusBadRequest)
		return
	}
	// create user id
	uid := fmt.Sprintf("user-%d", rand.Intn(1000000))
	user := User{ID: uid, Email: req.Email, FullName: req.FullName}
	users[uid] = user
	// initialize pantry map
	pantry[uid] = map[int]PantryItem{}
	// return token equal to user id for simplicity
	respondJSON(w, http.StatusCreated, AuthResponse{Token: uid, User: user})
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Email string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	// find user by email
	for _, u := range users {
		if u.Email == req.Email {
			respondJSON(w, http.StatusOK, AuthResponse{Token: u.ID, User: u})
			return
		}
	}
	http.Error(w, "Invalid credentials", http.StatusUnauthorized)
}

func getUserIDFromHeader(r *http.Request) (string, error) {
	auth := r.Header.Get("Authorization")
	if auth == "" {
		return "", fmt.Errorf("authorization header missing")
	}
	parts := strings.Split(auth, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return "", fmt.Errorf("invalid auth header")
	}
	// in this mock, token is the user id
	return parts[1], nil
}

func fetchPantryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	uid, err := getUserIDFromHeader(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	itemsMap, ok := pantry[uid]
	if !ok {
		respondJSON(w, http.StatusOK, []PantryItem{})
		return
	}
	items := []PantryItem{}
	for _, it := range itemsMap {
		items = append(items, it)
	}
	respondJSON(w, http.StatusOK, items)
}

func addPantryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	uid, err := getUserIDFromHeader(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	var req struct {
		Name string `json:"name"`
		Quantity int `json:"quantity"`
		Unit string `json:"unit,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		http.Error(w, "Name required", http.StatusBadRequest)
		return
	}
	if req.Quantity < 0 {
		http.Error(w, "Quantity must be non-negative", http.StatusBadRequest)
		return
	}
	id := idCounter
	idCounter++
	item := PantryItem{ID: id, UserID: uid, Name: req.Name, Quantity: req.Quantity, Unit: req.Unit}
	pantry[uid][id] = item
	respondJSON(w, http.StatusCreated, item)
}

func deletePantryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	uid, err := getUserIDFromHeader(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	// path is /api/pantry/items/{id}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	idStr := parts[3]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	items, ok := pantry[uid]
	if !ok {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	if _, ok := items[id]; !ok {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	delete(items, id)
	respondJSON(w, http.StatusOK, map[string]string{"message": "deleted"})
}

func updatePantryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	uid, err := getUserIDFromHeader(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	idStr := parts[3]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	items, ok := pantry[uid]
	if !ok {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	it, ok := items[id]
	if !ok {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	var req struct {
		Name *string `json:"name,omitempty"`
		Quantity *int `json:"quantity,omitempty"`
		Unit *string `json:"unit,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	if req.Name != nil {
		if strings.TrimSpace(*req.Name) == "" {
			http.Error(w, "Name cannot be empty", http.StatusBadRequest)
			return
		}
		it.Name = *req.Name
	}
	if req.Quantity != nil {
		if *req.Quantity < 0 {
			http.Error(w, "Quantity must be non-negative", http.StatusBadRequest)
			return
		}
		it.Quantity = *req.Quantity
	}
	if req.Unit != nil {
		it.Unit = *req.Unit
	}
	items[id] = it
	respondJSON(w, http.StatusOK, it)
}

func main() {
	rand.Seed(time.Now().UnixNano())
	http.HandleFunc("/api/auth/signup", signupHandler)
	http.HandleFunc("/api/auth/login", loginHandler)
	http.HandleFunc("/api/pantry/items", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			fetchPantryHandler(w, r)
			return
		}
		if r.Method == http.MethodPost {
			addPantryHandler(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})
	http.HandleFunc("/api/pantry/items/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			deletePantryHandler(w, r)
			return
		}
		if r.Method == http.MethodPut {
			updatePantryHandler(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})

	port := ":8080"
	log.Printf("Mock API server starting on %s\n", port)
	log.Fatal(http.ListenAndServe(port, nil))
}
