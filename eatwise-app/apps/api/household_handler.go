package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// HouseholdHandler provides enhanced household endpoint handlers with improved error handling
// This module ensures consistent error responses and membership verification

// EnhancedGetMyHouseholdHandler retrieves current user's household with improved error handling
func EnhancedGetMyHouseholdHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromRequest(r)
	if err != nil {
		WriteAuthError(w, err, r.RequestURI)
		return
	}

	householdID, err := getUserHouseholdID(userID)
	if err != nil {
		log.Printf("ERROR: Failed to get household for user %s: %v", userID, err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "User not in any household",
			Code:    "NOT_FOUND",
			Path:    r.RequestURI,
		})
		return
	}

	// Verify user is member of household
	isMember, err := checkHouseholdMembership(householdID, userID)
	if err != nil {
		log.Printf("ERROR: Failed to verify household membership for user %s, household %s: %v", userID, householdID, err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "Failed to verify household membership",
			Code:    "INTERNAL_ERROR",
			Path:    r.RequestURI,
		})
		return
	}

	if !isMember {
		log.Printf("WARNING: User %s claims household %s but membership check failed", userID, householdID)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "User not member of household",
			Code:    "FORBIDDEN",
			Path:    r.RequestURI,
		})
		return
	}

	// Fetch household and members
	var household Household
	var createdAt time.Time
	err = db.QueryRow(
		`SELECT id, name, invite_code, created_by, created_at FROM households WHERE id = $1`,
		householdID,
	).Scan(&household.ID, &household.Name, &household.InviteCode, &household.CreatedBy, &createdAt)

	if err != nil {
		log.Printf("ERROR: Failed to fetch household %s: %v", householdID, err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "Failed to fetch household",
			Code:    "INTERNAL_ERROR",
			Path:    r.RequestURI,
		})
		return
	}

	household.CreatedAt = createdAt

	// Fetch members
	rows, err := db.Query(
		`SELECT user_id, email, full_name, role FROM household_members 
		 LEFT JOIN users ON household_members.user_id = users.id 
		 WHERE household_id = $1`,
		householdID,
	)
	if err != nil {
		log.Printf("ERROR: Failed to fetch members for household %s: %v", householdID, err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "Failed to fetch household members",
			Code:    "INTERNAL_ERROR",
			Path:    r.RequestURI,
		})
		return
	}
	defer rows.Close()

	var members []HouseholdMember
	for rows.Next() {
		var member HouseholdMember
		if err := rows.Scan(&member.UserID, &member.Email, &member.FullName, &member.Role); err != nil {
			log.Printf("ERROR: Failed to scan member row: %v", err)
			continue
		}
		members = append(members, member)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(HouseholdResponse{
		Household: household,
		Members:   members,
	})
}

// EnhancedJoinHouseholdHandler joins a household with improved validation and error handling
func EnhancedJoinHouseholdHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromRequest(r)
	if err != nil {
		WriteAuthError(w, err, r.RequestURI)
		return
	}

	// Check if user already in household
	existingHouseholdID, err := getUserHouseholdID(userID)
	if err == nil && existingHouseholdID != "" {
		log.Printf("INFO: User %s attempted to join household but already member of %s", userID, existingHouseholdID)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "User already in a household",
			Code:    "CONFLICT",
			Details: "User cannot join multiple households",
			Path:    r.RequestURI,
		})
		return
	}

	// Parse request
	var req JoinHouseholdRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("ERROR: Failed to decode join request body: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "Invalid request body",
			Code:    "INVALID_REQUEST",
			Path:    r.RequestURI,
		})
		return
	}

	if req.InviteCode == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "Invite code required",
			Code:    "VALIDATION_ERROR",
			Path:    r.RequestURI,
		})
		return
	}

	// Find household by invite code
	var householdID string
	var householdName string
	err = db.QueryRow(`SELECT id, name FROM households WHERE invite_code = $1`, req.InviteCode).Scan(&householdID, &householdName)
	if err != nil {
		log.Printf("WARNING: Invalid invite code attempt: %s", req.InviteCode)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "Invalid invite code",
			Code:    "NOT_FOUND",
			Path:    r.RequestURI,
		})
		return
	}

	// Add user to household
	_, err = db.Exec(
		`INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'member')`,
		householdID, userID,
	)
	if err != nil {
		log.Printf("ERROR: Failed to add user %s to household %s: %v", userID, householdID, err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "Failed to join household",
			Code:    "INTERNAL_ERROR",
			Path:    r.RequestURI,
		})
		return
	}

	log.Printf("INFO: User %s successfully joined household %s", userID, householdID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(JoinHouseholdResponse{
		Message: "joined",
		Household: Household{
			ID:   householdID,
			Name: householdName,
		},
	})
}

// EnhancedListHouseholdMembersHandler lists household members with permission checks
func EnhancedListHouseholdMembersHandler(w http.ResponseWriter, r *http.Request, householdID string) {
	userID, err := getUserIDFromRequest(r)
	if err != nil {
		WriteAuthError(w, err, r.RequestURI)
		return
	}

	// Validate household exists
	var household Household
	err = db.QueryRow(`SELECT id, name FROM households WHERE id = $1`, householdID).Scan(&household.ID, &household.Name)
	if err != nil {
		log.Printf("WARNING: Non-existent household access attempt: %s by user %s", householdID, userID)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "Household not found",
			Code:    "NOT_FOUND",
			Path:    r.RequestURI,
		})
		return
	}

	// Check user is member of household
	isMember, err := checkHouseholdMembership(householdID, userID)
	if err != nil {
		log.Printf("ERROR: Failed to check membership for user %s, household %s: %v", userID, householdID, err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "Failed to verify membership",
			Code:    "INTERNAL_ERROR",
			Path:    r.RequestURI,
		})
		return
	}

	if !isMember {
		log.Printf("WARNING: Non-member %s attempted to access household %s members", userID, householdID)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "User not member of household",
			Code:    "FORBIDDEN",
			Path:    r.RequestURI,
		})
		return
	}

	// Fetch members
	rows, err := db.Query(
		`SELECT user_id, email, full_name, role FROM household_members 
		 LEFT JOIN users ON household_members.user_id = users.id 
		 WHERE household_id = $1 ORDER BY role DESC, users.email ASC`,
		householdID,
	)
	if err != nil {
		log.Printf("ERROR: Failed to fetch members for household %s: %v", householdID, err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{
			Error:   "Failed to fetch members",
			Code:    "INTERNAL_ERROR",
			Path:    r.RequestURI,
		})
		return
	}
	defer rows.Close()

	var members []HouseholdMember
	for rows.Next() {
		var member HouseholdMember
		if err := rows.Scan(&member.UserID, &member.Email, &member.FullName, &member.Role); err != nil {
			log.Printf("ERROR: Failed to scan member: %v", err)
			continue
		}
		members = append(members, member)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(members)
}

// Types for household requests/responses
type JoinHouseholdRequest struct {
	InviteCode string `json:"invite_code"`
}

type JoinHouseholdResponse struct {
	Message   string    `json:"message"`
	Household Household `json:"household"`
}

type HouseholdResponse struct {
	Household Household           `json:"household"`
	Members   []HouseholdMember   `json:"members"`
}

type HouseholdMember struct {
	UserID   string `json:"user_id"`
	Email    string `json:"email"`
	FullName string `json:"full_name"`
	Role     string `json:"role"`
}
