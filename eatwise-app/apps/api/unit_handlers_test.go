package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strconv"
	"strings"
	"testing"
)

func TestHashPasswordAndCheckPassword(t *testing.T) {
	password := "Secret123!"
	hash, err := hashPassword(password)
	if err != nil {
		t.Fatalf("hashPassword failed: %v", err)
	}
	if hash == "" {
		t.Fatal("expected non-empty hash")
	}
	if !checkPassword(password, hash) {
		t.Fatal("expected password check to succeed")
	}
	if checkPassword("wrong-password", hash) {
		t.Fatal("expected password check to fail for wrong password")
	}
}

func TestGenerateJWTAndGetUserIDFromRequest(t *testing.T) {
	jwtSecret = []byte("unit-test-secret")
	userID := "user-123"
	token, err := generateJWT(userID)
	if err != nil {
		t.Fatalf("generateJWT failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	gotUserID, err := getUserIDFromRequest(req)
	if err != nil {
		t.Fatalf("getUserIDFromRequest failed: %v", err)
	}
	if gotUserID != userID {
		t.Fatalf("expected user ID %q, got %q", userID, gotUserID)
	}
}

func TestGetUserIDFromRequestErrors(t *testing.T) {
	jwtSecret = []byte("unit-test-secret")
	cases := []struct {
		name   string
		auth   string
		wantErr string
	}{
		{name: "missing header", auth: "", wantErr: "authorization header missing"},
		{name: "invalid format", auth: "Token abc", wantErr: "invalid authorization header format"},
		{name: "invalid token", auth: "Bearer bad-token", wantErr: "invalid token"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			if tc.auth != "" {
				req.Header.Set("Authorization", tc.auth)
			}
			_, err := getUserIDFromRequest(req)
			if err == nil || !strings.Contains(err.Error(), tc.wantErr) {
				t.Fatalf("expected error containing %q, got %v", tc.wantErr, err)
			}
		})
	}
}

func TestParseIDFromPath(t *testing.T) {
	req := httptest.NewRequest(http.MethodDelete, "/api/pantry/items/42", nil)
	id, err := parseIDFromPath("/api/pantry/items/", req)
	if err != nil {
		t.Fatalf("parseIDFromPath failed: %v", err)
	}
	if id != 42 {
		t.Fatalf("expected id 42, got %d", id)
	}
}

func TestParseIDFromPathErrors(t *testing.T) {
	cases := []string{
		"/api/pantry/items/",
		"/api/pantry/items/not-a-number",
	}
	for _, path := range cases {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodDelete, path, nil)
			_, err := parseIDFromPath("/api/pantry/items/", req)
			if err == nil {
				t.Fatalf("expected error for path %q", path)
			}
		})
	}
}

func TestGenerateInviteCode(t *testing.T) {
	code, err := generateInviteCode(6)
	if err != nil {
		t.Fatalf("generateInviteCode failed: %v", err)
	}
	if len(code) != 6 {
		t.Fatalf("expected code length 6, got %d", len(code))
	}
	if !regexp.MustCompile(`^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$`).MatchString(code) {
		t.Fatalf("unexpected invite code format: %q", code)
	}
}

func TestParseHouseholdIDForMembers(t *testing.T) {
	valid := "/api/households/550e8400-e29b-41d4-a716-446655440000/members"
	id, err := parseHouseholdIDForMembers(valid)
	if err != nil {
		t.Fatalf("expected valid path, got error: %v", err)
	}
	if id != "550e8400-e29b-41d4-a716-446655440000" {
		t.Fatalf("unexpected household id: %s", id)
	}

	invalid := []string{
		"/api/households/not-uuid/members",
		"/api/households/550e8400-e29b-41d4-a716-446655440000/member",
		"/wrong/path",
	}
	for _, path := range invalid {
		t.Run(path, func(t *testing.T) {
			_, err := parseHouseholdIDForMembers(path)
			if err == nil {
				t.Fatalf("expected error for path %q", path)
			}
		})
	}
}

func TestEnableCORSOptions(t *testing.T) {
	h := enableCORS(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTeapot)
	})

	req := httptest.NewRequest(http.MethodOptions, "/api/test", nil)
	rr := httptest.NewRecorder()
	h(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 for OPTIONS, got %d", rr.Code)
	}
	if rr.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Fatal("missing Access-Control-Allow-Origin header")
	}
}

func TestEnableCORSPassThrough(t *testing.T) {
	h := enableCORS(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	rr := httptest.NewRecorder()
	h(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Fatalf("expected pass-through status 204, got %d", rr.Code)
	}
}

func TestRespondJSONAndRespondError(t *testing.T) {
	rr := httptest.NewRecorder()
	respondJSON(rr, http.StatusCreated, map[string]string{"ok": "yes"})
	if rr.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", rr.Code)
	}
	var body map[string]string
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if body["ok"] != "yes" {
		t.Fatalf("unexpected JSON body: %v", body)
	}

	rr2 := httptest.NewRecorder()
	respondError(rr2, http.StatusBadRequest, "bad", "BAD_REQUEST")
	if rr2.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rr2.Code)
	}
	var errBody map[string]string
	if err := json.Unmarshal(rr2.Body.Bytes(), &errBody); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if errBody["error"] != "bad" || errBody["code"] != "BAD_REQUEST" {
		t.Fatalf("unexpected error body: %v", errBody)
	}
}

func TestHandlerMethodGuards(t *testing.T) {
	tests := []struct {
		name    string
		handler http.HandlerFunc
		path    string
	}{
		{name: "signup method guard", handler: signupHandler, path: "/api/auth/signup"},
		{name: "login method guard", handler: loginHandler, path: "/api/auth/login"},
		{name: "create household method guard", handler: createHouseholdHandler, path: "/api/households"},
		{name: "join household method guard", handler: joinHouseholdHandler, path: "/api/households/join"},
		{name: "list members method guard", handler: listHouseholdMembersHandler, path: "/api/households/550e8400-e29b-41d4-a716-446655440000/members"},
		{name: "fetch pantry method guard", handler: fetchPantryHandler, path: "/api/pantry/items"},
		{name: "add pantry method guard", handler: addPantryHandler, path: "/api/pantry/items"},
		{name: "delete pantry method guard", handler: deletePantryHandler, path: "/api/pantry/items/1"},
		{name: "update pantry method guard", handler: updatePantryHandler, path: "/api/pantry/items/1"},
		{name: "leave household method guard", handler: leaveHouseholdHandler, path: "/api/households/leave"},
		{name: "shopping list GET method guard", handler: getShoppingListHandler, path: "/api/shopping-list"},
		{name: "shopping list POST method guard", handler: addShoppingItemHandler, path: "/api/shopping-list"},
		{name: "shopping list PUT method guard", handler: updateShoppingItemHandler, path: "/api/shopping-list/1"},
		{name: "shopping list DELETE method guard", handler: deleteShoppingItemHandler, path: "/api/shopping-list/1"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPatch, tc.path, nil)
			rr := httptest.NewRecorder()
			tc.handler(rr, req)
			if rr.Code != http.StatusMethodNotAllowed {
				t.Fatalf("expected 405, got %d", rr.Code)
			}
		})
	}
}

func TestHouseholdsRootHandlerMethodDispatch(t *testing.T) {
	req := httptest.NewRequest(http.MethodPatch, "/api/households", nil)
	rr := httptest.NewRecorder()
	householdsRootHandler(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", rr.Code)
	}
}

func TestHouseholdSubrouteHandlerUnauthorized(t *testing.T) {
	req := httptest.NewRequest(http.MethodDelete, "/api/households/550e8400-e29b-41d4-a716-446655440000", nil)
	rr := httptest.NewRecorder()
	householdSubrouteHandler(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
}

func TestSignupValidationWithoutDBAccess(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/auth/signup", strings.NewReader(`{"email":""}`))
	rr := httptest.NewRecorder()
	signupHandler(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rr.Code)
	}
}

func TestLoginInvalidBodyWithoutDBAccess(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader("not-json"))
	rr := httptest.NewRecorder()
	loginHandler(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rr.Code)
	}
}

func TestAddShoppingItemValidationRejectsNonIntegerQuantity(t *testing.T) {
	requireDB(t)
	userID, token := setupTestUser(t)
	setupTestHousehold(t, userID)
	defer cleanupTestData(t, userID)

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

func TestUpdateShoppingItemValidationRejectsNonIntegerQuantity(t *testing.T) {
	requireDB(t)
	userID, token := setupTestUser(t)
	householdID := setupTestHousehold(t, userID)
	defer cleanupTestData(t, userID)

	var itemID int
	err := db.QueryRow(`
		INSERT INTO shopping_list (household_id, user_id, name, quantity, unit, category, purchased)
		VALUES ($1, $2, 'Apples', 1, 'kg', 'Produce', false)
		RETURNING id
	`, householdID, userID).Scan(&itemID)
	if err != nil {
		t.Fatalf("Failed to seed shopping item: %v", err)
	}

	t.Run("rejects fractional quantity", func(t *testing.T) {
		reqBody := map[string]interface{}{"quantity": 2.5}
		body, _ := json.Marshal(reqBody)

		req := httptest.NewRequest("PUT", "/api/shopping-list/"+strconv.Itoa(itemID), bytes.NewReader(body))
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
		if errResp["code"] != "VALIDATION_ERROR" {
			t.Fatalf("Expected error code VALIDATION_ERROR, got %q", errResp["code"])
		}
	})

	t.Run("rejects string quantity", func(t *testing.T) {
		body := []byte(`{"quantity":"3"}`)

		req := httptest.NewRequest("PUT", "/api/shopping-list/"+strconv.Itoa(itemID), bytes.NewReader(body))
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
		if errResp["code"] != "VALIDATION_ERROR" {
			t.Fatalf("Expected error code VALIDATION_ERROR, got %q", errResp["code"])
		}
	})
}
