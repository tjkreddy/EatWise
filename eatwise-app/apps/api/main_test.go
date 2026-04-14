package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"

	"github.com/google/uuid"
)

var dbAvailable bool

func TestMain(m *testing.M) {
	// Try setup test database. If unavailable, keep running unit tests.
	if err := initDB(); err != nil {
		log.Printf("Skipping DB integration setup: %v", err)
		dbAvailable = false
	} else {
		dbAvailable = true
	}

	// Run tests
	code := m.Run()

	// Cleanup
	if db != nil {
		db.Close()
	}
	os.Exit(code)
}

func requireDB(t *testing.T) {
	t.Helper()
	if !dbAvailable || db == nil {
		t.Skip("Skipping DB integration test: database is not available")
	}
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

	_, err = db.Exec(`INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)`,
		householdID, ownerID, "owner")
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
	requireDB(t)
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

	var resp CreateHouseholdResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if resp.Household.Name != "Test Household" {
		t.Errorf("Expected name 'Test Household', got '%s'", resp.Household.Name)
	}
	if resp.Household.CreatedBy != userID {
		t.Errorf("Expected created_by '%s', got '%s'", userID, resp.Household.CreatedBy)
	}
	if resp.InviteCode == "" {
		t.Fatal("Expected invite_code to be present")
	}
}

func TestCreateHouseholdAlreadyInHousehold(t *testing.T) {
	requireDB(t)
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
	requireDB(t)
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

	var resp JoinHouseholdResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if resp.Message != "joined" {
		t.Errorf("Expected message 'joined', got '%v'", resp.Message)
	}
	if resp.Household.ID != householdID {
		t.Errorf("Expected household ID '%s', got '%s'", householdID, resp.Household.ID)
	}
	if resp.Household.Name == "" {
		t.Fatal("Expected household name in response")
	}
}

func TestGetHousehold(t *testing.T) {
	requireDB(t)
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
	requireDB(t)
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
	householdSubrouteHandler(w, req)

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
	requireDB(t)
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
	householdSubrouteHandler(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected status 403, got %d", w.Code)
	}
}

func TestTransferOwnership(t *testing.T) {
	requireDB(t)
	ownerID, ownerToken := setupTestUser(t)
	householdID := setupTestHousehold(t, ownerID)

	newOwnerID, _ := setupTestUser(t)
	_, err := db.Exec(`INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'member')`, householdID, newOwnerID)
	if err != nil {
		t.Fatalf("Failed to add new owner candidate: %v", err)
	}
	defer cleanupTestData(t, ownerID)
	defer cleanupTestData(t, newOwnerID)

	reqBody := map[string]string{"new_owner_user_id": newOwnerID}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest("POST", "/api/households/"+householdID+"/transfer-ownership", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+ownerToken)

	w := httptest.NewRecorder()
	householdSubrouteHandler(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	var ownerRole string
	err = db.QueryRow(`SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2`, householdID, ownerID).Scan(&ownerRole)
	if err != nil {
		t.Fatalf("Failed to query original owner role: %v", err)
	}
	if ownerRole != "member" {
		t.Fatalf("Expected original owner role to be member, got %s", ownerRole)
	}

	var newOwnerRole string
	err = db.QueryRow(`SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2`, householdID, newOwnerID).Scan(&newOwnerRole)
	if err != nil {
		t.Fatalf("Failed to query new owner role: %v", err)
	}
	if newOwnerRole != "owner" {
		t.Fatalf("Expected new owner role to be owner, got %s", newOwnerRole)
	}
}

func TestTransferOwnershipNotOwner(t *testing.T) {
	requireDB(t)
	ownerID, _ := setupTestUser(t)
	householdID := setupTestHousehold(t, ownerID)

	memberID, memberToken := setupTestUser(t)
	_, err := db.Exec(`INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'member')`, householdID, memberID)
	if err != nil {
		t.Fatalf("Failed to add member: %v", err)
	}
	defer cleanupTestData(t, ownerID)
	defer cleanupTestData(t, memberID)

	reqBody := map[string]string{"new_owner_user_id": ownerID}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest("POST", "/api/households/"+householdID+"/transfer-ownership", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+memberToken)

	w := httptest.NewRecorder()
	householdSubrouteHandler(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("Expected status 403, got %d", w.Code)
	}
}

func TestFormerOwnerCanLeaveAfterTransfer(t *testing.T) {
	requireDB(t)
	ownerID, ownerToken := setupTestUser(t)
	householdID := setupTestHousehold(t, ownerID)

	newOwnerID, _ := setupTestUser(t)
	_, err := db.Exec(`INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'member')`, householdID, newOwnerID)
	if err != nil {
		t.Fatalf("Failed to add new owner candidate: %v", err)
	}
	defer cleanupTestData(t, ownerID)
	defer cleanupTestData(t, newOwnerID)

	transferBody, _ := json.Marshal(map[string]string{"new_owner_user_id": newOwnerID})
	transferReq := httptest.NewRequest("POST", "/api/households/"+householdID+"/transfer-ownership", bytes.NewReader(transferBody))
	transferReq.Header.Set("Content-Type", "application/json")
	transferReq.Header.Set("Authorization", "Bearer "+ownerToken)

	transferRes := httptest.NewRecorder()
	householdSubrouteHandler(transferRes, transferReq)
	if transferRes.Code != http.StatusOK {
		t.Fatalf("Expected transfer status 200, got %d", transferRes.Code)
	}

	leaveReq := httptest.NewRequest("POST", "/api/households/leave", nil)
	leaveReq.Header.Set("Authorization", "Bearer "+ownerToken)

	leaveRes := httptest.NewRecorder()
	leaveHouseholdHandler(leaveRes, leaveReq)
	if leaveRes.Code != http.StatusOK {
		t.Fatalf("Expected leave status 200, got %d", leaveRes.Code)
	}

	var stillMember bool
	err = db.QueryRow(`SELECT EXISTS(SELECT 1 FROM household_members WHERE household_id = $1 AND user_id = $2)`, householdID, ownerID).Scan(&stillMember)
	if err != nil {
		t.Fatalf("Failed to verify old owner membership: %v", err)
	}
	if stillMember {
		t.Fatal("Expected former owner to be removed from household after leave")
	}
}

func TestTransferOwnershipToNonMember(t *testing.T) {
	requireDB(t)
	ownerID, ownerToken := setupTestUser(t)
	householdID := setupTestHousehold(t, ownerID)

	nonMemberID, _ := setupTestUser(t)
	defer cleanupTestData(t, ownerID)
	defer cleanupTestData(t, nonMemberID)

	body, _ := json.Marshal(map[string]string{"new_owner_user_id": nonMemberID})
	req := httptest.NewRequest("POST", "/api/households/"+householdID+"/transfer-ownership", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+ownerToken)

	w := httptest.NewRecorder()
	householdSubrouteHandler(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("Expected status 404, got %d", w.Code)
	}
}

func TestTransferOwnershipToSelf(t *testing.T) {
	requireDB(t)
	ownerID, ownerToken := setupTestUser(t)
	householdID := setupTestHousehold(t, ownerID)
	defer cleanupTestData(t, ownerID)

	body, _ := json.Marshal(map[string]string{"new_owner_user_id": ownerID})
	req := httptest.NewRequest("POST", "/api/households/"+householdID+"/transfer-ownership", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+ownerToken)

	w := httptest.NewRecorder()
	householdSubrouteHandler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400, got %d", w.Code)
	}
}

func TestTransferOwnershipInvalidBody(t *testing.T) {
	requireDB(t)
	ownerID, ownerToken := setupTestUser(t)
	householdID := setupTestHousehold(t, ownerID)
	defer cleanupTestData(t, ownerID)

	req := httptest.NewRequest("POST", "/api/households/"+householdID+"/transfer-ownership", strings.NewReader("not-json"))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+ownerToken)

	w := httptest.NewRecorder()
	householdSubrouteHandler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400, got %d", w.Code)
	}
}

func TestListHouseholdMembers(t *testing.T) {
	requireDB(t)
	ownerID, ownerToken := setupTestUser(t)
	householdID := setupTestHousehold(t, ownerID)

	memberID, _ := setupTestUser(t)
	_, err := db.Exec(`INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'member')`, householdID, memberID)
	if err != nil {
		t.Fatalf("Failed to add member: %v", err)
	}
	defer cleanupTestData(t, ownerID)
	defer cleanupTestData(t, memberID)

	req := httptest.NewRequest("GET", "/api/households/"+householdID+"/members", nil)
	req.Header.Set("Authorization", "Bearer "+ownerToken)

	w := httptest.NewRecorder()
	householdSubrouteHandler(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var members []HouseholdMember
	if err := json.Unmarshal(w.Body.Bytes(), &members); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if len(members) != 2 {
		t.Fatalf("Expected 2 members, got %d", len(members))
	}
}

func TestListHouseholdMembersForbiddenForNonMember(t *testing.T) {
	requireDB(t)
	ownerID, _ := setupTestUser(t)
	householdID := setupTestHousehold(t, ownerID)

	outsiderID, outsiderToken := setupTestUser(t)
	defer cleanupTestData(t, ownerID)
	defer cleanupTestData(t, outsiderID)

	req := httptest.NewRequest("GET", "/api/households/"+householdID+"/members", nil)
	req.Header.Set("Authorization", "Bearer "+outsiderToken)

	w := httptest.NewRecorder()
	householdSubrouteHandler(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected status 403, got %d", w.Code)
	}
}

func TestGetHouseholdSummary(t *testing.T) {
	requireDB(t)
	userID, token := setupTestUser(t)
	setupTestHousehold(t, userID)
	defer cleanupTestData(t, userID)

	req := httptest.NewRequest("GET", "/api/households/me/summary", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	getHouseholdSummaryHandler(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	var summary HouseholdSummaryResponse
	if err := json.Unmarshal(w.Body.Bytes(), &summary); err != nil {
		t.Fatalf("Failed to unmarshal summary: %v", err)
	}

	if summary.HouseholdID == "" {
		t.Fatal("Expected household_id in summary")
	}
	if summary.CurrentUserRole != "owner" {
		t.Fatalf("Expected role owner, got %s", summary.CurrentUserRole)
	}
	if summary.MembersCount < 1 {
		t.Fatalf("Expected at least 1 member, got %d", summary.MembersCount)
	}
}

func TestPantryUnauthorizedWithoutHousehold(t *testing.T) {
	requireDB(t)
	userID, token := setupTestUser(t)
	defer cleanupTestData(t, userID)

	req := httptest.NewRequest("GET", "/api/pantry/items", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	fetchPantryHandler(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected status 403, got %d", w.Code)
	}

	var errResp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
		t.Fatalf("Expected JSON error response, got parse error: %v", err)
	}
	if errResp["code"] != "FORBIDDEN" {
		t.Fatalf("Expected error code FORBIDDEN, got %q", errResp["code"])
	}
}

func TestPantryCRUD(t *testing.T) {
	requireDB(t)
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

func TestClearPurchasedShoppingItems(t *testing.T) {
	requireDB(t)
	userID, token := setupTestUser(t)
	householdID := setupTestHousehold(t, userID)
	defer cleanupTestData(t, userID)

	// Insert purchased and unpurchased items.
	_, err := db.Exec(`
		INSERT INTO shopping_list (household_id, user_id, name, quantity, unit, category, purchased)
		VALUES
		($1, $2, 'Milk', 1, 'liters', 'Dairy', true),
		($1, $2, 'Bread', 1, 'pieces', 'Bakery', false)
	`, householdID, userID)
	if err != nil {
		t.Fatalf("Failed to seed shopping items: %v", err)
	}

	req := httptest.NewRequest("DELETE", "/api/shopping-list/clear-purchased", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	clearPurchasedShoppingItemsHandler(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if resp["message"] != "purchased items cleared" {
		t.Fatalf("Unexpected message: %v", resp["message"])
	}

	if resp["deleted_count"].(float64) != 1 {
		t.Fatalf("Expected deleted_count 1, got %v", resp["deleted_count"])
	}

	var remaining int
	err = db.QueryRow(`SELECT COUNT(*) FROM shopping_list WHERE household_id = $1`, householdID).Scan(&remaining)
	if err != nil {
		t.Fatalf("Failed to count remaining items: %v", err)
	}
	if remaining != 1 {
		t.Fatalf("Expected 1 remaining item, got %d", remaining)
	}
}

func TestPantryUpdateAllFieldsAndValidation(t *testing.T) {
	requireDB(t)
	userID, token := setupTestUser(t)
	householdID := setupTestHousehold(t, userID)
	defer cleanupTestData(t, userID)

	var itemID int
	err := db.QueryRow(`
		INSERT INTO pantry_items (household_id, user_id, name, quantity, unit, category, notes)
		VALUES ($1, $2, 'Old Name', 1, 'pcs', 'OldCat', 'Old Notes')
		RETURNING id
	`, householdID, userID).Scan(&itemID)
	if err != nil {
		t.Fatalf("Failed to seed pantry item: %v", err)
	}

	updateReq := map[string]interface{}{
		"name":            "Updated Item",
		"quantity":        4,
		"unit":            "kg",
		"category":        "Produce",
		"expiration_date": "2026-12-31",
		"notes":           "Fresh",
	}
	body, _ := json.Marshal(updateReq)
	req := httptest.NewRequest("PUT", "/api/pantry/items/"+strconv.Itoa(itemID), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	updatePantryHandler(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	var updated PantryItem
	if err := json.Unmarshal(w.Body.Bytes(), &updated); err != nil {
		t.Fatalf("Failed to parse updated item: %v", err)
	}

	if updated.Name != "Updated Item" || updated.Quantity != 4 || updated.Unit != "kg" || updated.Category != "Produce" || updated.Notes != "Fresh" || updated.ExpirationDate != "2026-12-31" {
		t.Fatalf("Unexpected updated pantry item: %+v", updated)
	}

	badReq := map[string]interface{}{"quantity": -5}
	badBody, _ := json.Marshal(badReq)
	badUpdate := httptest.NewRequest("PUT", "/api/pantry/items/"+strconv.Itoa(itemID), bytes.NewReader(badBody))
	badUpdate.Header.Set("Content-Type", "application/json")
	badUpdate.Header.Set("Authorization", "Bearer "+token)

	badRes := httptest.NewRecorder()
	updatePantryHandler(badRes, badUpdate)

	if badRes.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400 for negative quantity, got %d", badRes.Code)
	}
}

func TestPantryDeleteCrossHouseholdNotFound(t *testing.T) {
	requireDB(t)
	ownerID, _ := setupTestUser(t)
	householdID := setupTestHousehold(t, ownerID)
	defer cleanupTestData(t, ownerID)

	otherUserID, otherToken := setupTestUser(t)
	setupTestHousehold(t, otherUserID)
	defer cleanupTestData(t, otherUserID)

	var itemID int
	err := db.QueryRow(`
		INSERT INTO pantry_items (household_id, user_id, name, quantity)
		VALUES ($1, $2, 'Only In Household One', 1)
		RETURNING id
	`, householdID, ownerID).Scan(&itemID)
	if err != nil {
		t.Fatalf("Failed to seed pantry item: %v", err)
	}

	req := httptest.NewRequest("DELETE", "/api/pantry/items/"+strconv.Itoa(itemID), nil)
	req.Header.Set("Authorization", "Bearer "+otherToken)

	w := httptest.NewRecorder()
	deletePantryHandler(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("Expected status 404 for cross-household delete, got %d", w.Code)
	}
}

func TestShoppingUpdateAllFieldsAndPurchasedToggle(t *testing.T) {
	requireDB(t)
	userID, token := setupTestUser(t)
	householdID := setupTestHousehold(t, userID)
	defer cleanupTestData(t, userID)

	var itemID int
	err := db.QueryRow(`
		INSERT INTO shopping_list (household_id, user_id, name, quantity, unit, category, purchased)
		VALUES ($1, $2, 'Rice', 1, 'bag', 'Groceries', false)
		RETURNING id
	`, householdID, userID).Scan(&itemID)
	if err != nil {
		t.Fatalf("Failed to seed shopping item: %v", err)
	}

	updateReq := map[string]interface{}{
		"name":      "Brown Rice",
		"quantity":  2,
		"unit":      "bags",
		"category":  "Pantry",
		"purchased": true,
	}
	body, _ := json.Marshal(updateReq)
	req := httptest.NewRequest("PUT", "/api/shopping-list/"+strconv.Itoa(itemID), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	updateShoppingItemHandler(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	var updated ShoppingItem
	if err := json.Unmarshal(w.Body.Bytes(), &updated); err != nil {
		t.Fatalf("Failed to parse updated shopping item: %v", err)
	}

	if updated.Name != "Brown Rice" || updated.Quantity != 2 || updated.Unit != "bags" || updated.Category != "Pantry" || !updated.Purchased || updated.PurchasedAt == nil {
		t.Fatalf("Unexpected shopping update result: %+v", updated)
	}

	unpurchaseReq := map[string]interface{}{"purchased": false}
	unpurchaseBody, _ := json.Marshal(unpurchaseReq)
	unpurchase := httptest.NewRequest("PUT", "/api/shopping-list/"+strconv.Itoa(itemID), bytes.NewReader(unpurchaseBody))
	unpurchase.Header.Set("Content-Type", "application/json")
	unpurchase.Header.Set("Authorization", "Bearer "+token)

	unpurchaseRes := httptest.NewRecorder()
	updateShoppingItemHandler(unpurchaseRes, unpurchase)

	if unpurchaseRes.Code != http.StatusOK {
		t.Fatalf("Expected status 200 for unpurchase, got %d", unpurchaseRes.Code)
	}

	var unpurchased ShoppingItem
	if err := json.Unmarshal(unpurchaseRes.Body.Bytes(), &unpurchased); err != nil {
		t.Fatalf("Failed to parse unpurchase response: %v", err)
	}

	if unpurchased.Purchased {
		t.Fatal("Expected purchased=false after unpurchase")
	}
}

func TestShoppingUpdateInvalidBodyErrorContract(t *testing.T) {
	requireDB(t)
	userID, token := setupTestUser(t)
	householdID := setupTestHousehold(t, userID)
	defer cleanupTestData(t, userID)

	var itemID int
	err := db.QueryRow(`
		INSERT INTO shopping_list (household_id, user_id, name, quantity, unit, category, purchased)
		VALUES ($1, $2, 'Eggs', 12, 'count', 'Dairy', false)
		RETURNING id
	`, householdID, userID).Scan(&itemID)
	if err != nil {
		t.Fatalf("Failed to seed shopping item: %v", err)
	}

	req := httptest.NewRequest("PUT", "/api/shopping-list/"+strconv.Itoa(itemID), strings.NewReader("not-json"))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	updateShoppingItemHandler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400, got %d", w.Code)
	}

	var errResp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
		t.Fatalf("Expected JSON error response, got parse error: %v", err)
	}
	if errResp["code"] != "INVALID_REQUEST" {
		t.Fatalf("Expected error code INVALID_REQUEST, got %q", errResp["code"])
	}
}

func TestShoppingUpdateCrossHouseholdNotFound(t *testing.T) {
	requireDB(t)
	ownerID, _ := setupTestUser(t)
	householdID := setupTestHousehold(t, ownerID)
	defer cleanupTestData(t, ownerID)

	otherUserID, otherToken := setupTestUser(t)
	setupTestHousehold(t, otherUserID)
	defer cleanupTestData(t, otherUserID)

	var itemID int
	err := db.QueryRow(`
		INSERT INTO shopping_list (household_id, user_id, name, quantity, unit, category, purchased)
		VALUES ($1, $2, 'Owner Item', 1, 'pcs', 'General', false)
		RETURNING id
	`, householdID, ownerID).Scan(&itemID)
	if err != nil {
		t.Fatalf("Failed to seed shopping item: %v", err)
	}

	updateReq := map[string]interface{}{"name": "Hijacked"}
	body, _ := json.Marshal(updateReq)
	req := httptest.NewRequest("PUT", "/api/shopping-list/"+strconv.Itoa(itemID), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+otherToken)

	w := httptest.NewRecorder()
	updateShoppingItemHandler(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("Expected status 404 for cross-household shopping update, got %d", w.Code)
	}
}

func TestShoppingUpdateNoFieldsValidationError(t *testing.T) {
	requireDB(t)
	userID, token := setupTestUser(t)
	householdID := setupTestHousehold(t, userID)
	defer cleanupTestData(t, userID)

	var itemID int
	err := db.QueryRow(`
		INSERT INTO shopping_list (household_id, user_id, name, quantity, unit, category, purchased)
		VALUES ($1, $2, 'Apples', 3, 'pcs', 'Produce', false)
		RETURNING id
	`, householdID, userID).Scan(&itemID)
	if err != nil {
		t.Fatalf("Failed to seed shopping item: %v", err)
	}

	body := []byte(`{}`)
	req := httptest.NewRequest("PUT", "/api/shopping-list/"+strconv.Itoa(itemID), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	updateShoppingItemHandler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400 for empty update body, got %d", w.Code)
	}

	var errResp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
		t.Fatalf("Expected JSON error response, got parse error: %v", err)
	}
	if errResp["code"] != "VALIDATION_ERROR" {
		t.Fatalf("Expected error code VALIDATION_ERROR, got %q", errResp["code"])
	}
}

func TestPantryDeleteInvalidIDErrorContract(t *testing.T) {
	requireDB(t)
	userID, token := setupTestUser(t)
	setupTestHousehold(t, userID)
	defer cleanupTestData(t, userID)

	req := httptest.NewRequest("DELETE", "/api/pantry/items/not-a-number", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	deletePantryHandler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400 for invalid pantry item id, got %d", w.Code)
	}

	var errResp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
		t.Fatalf("Expected JSON error response, got parse error: %v", err)
	}
	if errResp["code"] != "INVALID_REQUEST" {
		t.Fatalf("Expected error code INVALID_REQUEST, got %q", errResp["code"])
	}
}

func TestAddShoppingItemValidation(t *testing.T) {
	requireDB(t)
	userID, token := setupTestUser(t)
	setupTestHousehold(t, userID)
	defer cleanupTestData(t, userID)

	t.Run("rejects blank name", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"name":     "   ",
			"quantity": 1,
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest("POST", "/api/shopping-list", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		addShoppingItemHandler(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("Expected status 400, got %d", w.Code)
		}

		var errResp map[string]string
		if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
			t.Fatalf("Expected JSON error response, got parse error: %v", err)
		}
		if errResp["code"] != "VALIDATION_ERROR" {
			t.Fatalf("Expected error code VALIDATION_ERROR, got %q", errResp["code"])
		}
	})

	t.Run("rejects negative quantity", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"name":     "Banana",
			"quantity": -1,
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest("POST", "/api/shopping-list", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		addShoppingItemHandler(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("Expected status 400, got %d", w.Code)
		}

		var errResp map[string]string
		if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
			t.Fatalf("Expected JSON error response, got parse error: %v", err)
		}
		if errResp["code"] != "VALIDATION_ERROR" {
			t.Fatalf("Expected error code VALIDATION_ERROR, got %q", errResp["code"])
		}
	})

	t.Run("rejects fractional quantity", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"name":     "Banana",
			"quantity": 1.5,
		}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest("POST", "/api/shopping-list", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		addShoppingItemHandler(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("Expected status 400, got %d", w.Code)
		}

		var errResp map[string]string
		if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
			t.Fatalf("Expected JSON error response, got parse error: %v", err)
		}
		if errResp["code"] != "VALIDATION_ERROR" {
			t.Fatalf("Expected error code VALIDATION_ERROR, got %q", errResp["code"])
		}
	})

	t.Run("rejects string quantity", func(t *testing.T) {
		body := []byte(`{"name":"Banana","quantity":"2"}`)

		req := httptest.NewRequest("POST", "/api/shopping-list", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		addShoppingItemHandler(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("Expected status 400, got %d", w.Code)
		}

		var errResp map[string]string
		if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
			t.Fatalf("Expected JSON error response, got parse error: %v", err)
		}
		if errResp["code"] != "VALIDATION_ERROR" {
			t.Fatalf("Expected error code VALIDATION_ERROR, got %q", errResp["code"])
		}
	})
}
