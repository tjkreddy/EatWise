package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/google/uuid"
)

func TestMain(m *testing.M) {
	// Setup test database
	if err := initDB(); err != nil {
		panic("Failed to connect to test database: " + err.Error())
	}

	// Run tests
	code := m.Run()

	// Cleanup
	db.Close()
	os.Exit(code)
}

func setupTestUser(t *testing.T) (string, string) {
	userID := uuid.New().String()
	email := "test" + userID[:8] + "@example.com"
	password := "testpass123"

	hash, err := hashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	_, err = db.Exec(`INSERT INTO users (id, email, password_hash, full_name) VALUES ($1, $2, $3, $4)`,
		userID, email, hash, "Test User")
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	token, err := generateJWT(userID)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	return userID, token
}

func setupTestHousehold(t *testing.T, ownerID string) string {
	householdID := uuid.New().String()
	inviteCode := strings.ToUpper(uuid.New().String()[:6]) // Match handler format

	_, err := db.Exec(`INSERT INTO households (id, name, invite_code, created_by) VALUES ($1, $2, $3, $4)`,
		householdID, "Test Household", inviteCode, ownerID)
	if err != nil {
		t.Fatalf("Failed to create test household: %v", err)
	}

	_, err = db.Exec(`INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'owner')`,
		householdID, ownerID)
	if err != nil {
		t.Fatalf("Failed to add owner to household: %v", err)
	}

	return householdID
}

func cleanupTestData(t *testing.T, userID string) {
	// Clean up in reverse order to avoid FK constraints
	db.Exec(`DELETE FROM pantry_items WHERE user_id = $1`, userID)
	db.Exec(`DELETE FROM household_members WHERE user_id = $1`, userID)
	db.Exec(`DELETE FROM households WHERE created_by = $1`, userID)
	db.Exec(`DELETE FROM users WHERE id = $1`, userID)
}

func TestCreateHousehold(t *testing.T) {
	userID, token := setupTestUser(t)
	defer cleanupTestData(t, userID)

	reqBody := map[string]string{"name": "Test Household"}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest("POST", "/api/households", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	createHouseholdHandler(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status 201, got %d", w.Code)
	}

	var resp Household
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if resp.Name != "Test Household" {
		t.Errorf("Expected name 'Test Household', got '%s'", resp.Name)
	}
	if resp.CreatedBy != userID {
		t.Errorf("Expected created_by '%s', got '%s'", userID, resp.CreatedBy)
	}
}

func TestCreateHouseholdAlreadyInHousehold(t *testing.T) {
	userID, token := setupTestUser(t)
	setupTestHousehold(t, userID)
	defer cleanupTestData(t, userID)

	reqBody := map[string]string{"name": "Another Household"}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest("POST", "/api/households", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	createHouseholdHandler(w, req)

	if w.Code != http.StatusConflict {
		t.Errorf("Expected status 409, got %d", w.Code)
	}
}

func TestJoinHousehold(t *testing.T) {
	ownerID, _ := setupTestUser(t)
	householdID := setupTestHousehold(t, ownerID)

	memberID, token := setupTestUser(t)
	defer cleanupTestData(t, ownerID)
	defer cleanupTestData(t, memberID)

	// Get invite code
	var inviteCode string
	err := db.QueryRow(`SELECT invite_code FROM households WHERE id = $1`, householdID).Scan(&inviteCode)
	if err != nil {
		t.Fatalf("Failed to get invite code: %v", err)
	}

	reqBody := map[string]string{"invite_code": inviteCode}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest("POST", "/api/households/join", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	joinHouseholdHandler(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if resp["message"] != "joined" {
		t.Errorf("Expected message 'joined', got '%v'", resp["message"])
	}
}

func TestGetHousehold(t *testing.T) {
	userID, token := setupTestUser(t)
	householdID := setupTestHousehold(t, userID)
	defer cleanupTestData(t, userID)

	req := httptest.NewRequest("GET", "/api/households/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	getHouseholdHandler(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var resp HouseholdResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if resp.Household.ID != householdID {
		t.Errorf("Expected household ID '%s', got '%s'", householdID, resp.Household.ID)
	}
	if len(resp.Members) != 1 {
		t.Errorf("Expected 1 member, got %d", len(resp.Members))
	}
	if resp.Members[0].Role != "owner" {
		t.Errorf("Expected role 'owner', got '%s'", resp.Members[0].Role)
	}
}

func TestRemoveMember(t *testing.T) {
	ownerID, ownerToken := setupTestUser(t)
	householdID := setupTestHousehold(t, ownerID)

	memberID, _ := setupTestUser(t)
	_, err := db.Exec(`INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'member')`,
		householdID, memberID)
	if err != nil {
		t.Fatalf("Failed to add member: %v", err)
	}
	defer cleanupTestData(t, ownerID)
	defer cleanupTestData(t, memberID)

	req := httptest.NewRequest("DELETE", "/api/households/"+householdID+"/members/"+memberID, nil)
	req.Header.Set("Authorization", "Bearer "+ownerToken)

	w := httptest.NewRecorder()
	removeMemberHandler(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if resp["message"] != "member removed" {
		t.Errorf("Expected message 'member removed', got '%s'", resp["message"])
	}
}

func TestRemoveMemberNotOwner(t *testing.T) {
	ownerID, _ := setupTestUser(t)
	householdID := setupTestHousehold(t, ownerID)

	memberID, memberToken := setupTestUser(t)
	_, err := db.Exec(`INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'member')`,
		householdID, memberID)
	if err != nil {
		t.Fatalf("Failed to add member: %v", err)
	}

	otherMemberID, _ := setupTestUser(t)
	_, err = db.Exec(`INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'member')`,
		householdID, otherMemberID)
	if err != nil {
		t.Fatalf("Failed to add other member: %v", err)
	}
	defer cleanupTestData(t, ownerID)
	defer cleanupTestData(t, memberID)
	defer cleanupTestData(t, otherMemberID)

	req := httptest.NewRequest("DELETE", "/api/households/"+householdID+"/members/"+otherMemberID, nil)
	req.Header.Set("Authorization", "Bearer "+memberToken)

	w := httptest.NewRecorder()
	removeMemberHandler(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected status 403, got %d", w.Code)
	}
}

func TestPantryUnauthorizedWithoutHousehold(t *testing.T) {
	userID, token := setupTestUser(t)
	defer cleanupTestData(t, userID)

	req := httptest.NewRequest("GET", "/api/pantry/items", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	fetchPantryHandler(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected status 403, got %d", w.Code)
	}
}

func TestPantryCRUD(t *testing.T) {
	userID, token := setupTestUser(t)
	householdID := setupTestHousehold(t, userID)
	defer cleanupTestData(t, userID)

	// Add item
	reqBody := map[string]interface{}{
		"name":     "Test Item",
		"quantity": 5,
		"unit":     "pieces",
		"category": "test",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest("POST", "/api/pantry/items", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	addPantryHandler(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status 201, got %d", w.Code)
	}

	var item PantryItem
	if err := json.Unmarshal(w.Body.Bytes(), &item); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if item.Name != "Test Item" {
		t.Errorf("Expected name 'Test Item', got '%s'", item.Name)
	}
	if item.HouseholdID != householdID {
		t.Errorf("Expected household_id '%s', got '%s'", householdID, item.HouseholdID)
	}

	// Fetch items
	req2 := httptest.NewRequest("GET", "/api/pantry/items", nil)
	req2.Header.Set("Authorization", "Bearer "+token)

	w2 := httptest.NewRecorder()
	fetchPantryHandler(w2, req2)

	if w2.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w2.Code)
	}

	var items []PantryItem
	if err := json.Unmarshal(w2.Body.Bytes(), &items); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if len(items) != 1 {
		t.Errorf("Expected 1 item, got %d", len(items))
	}
	if items[0].Name != "Test Item" {
		t.Errorf("Expected name 'Test Item', got '%s'", items[0].Name)
	}
}