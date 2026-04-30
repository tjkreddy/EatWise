# EatWise Backend API Documentation

## Overview

The EatWise API is a Go-based REST service providing endpoints for user authentication, household management, pantry tracking, and shopping list management.

**Base URL:** `http://localhost:8080`

## Authentication

All protected endpoints require a Bearer token in the Authorization header.

### Header Format

```
Authorization: Bearer <jwt_token>
```

### JWT Token Structure

- **Header:** HS256 signing method
- **Payload:** `{ "user_id": "<uuid>", "exp": <timestamp> }`
- **Expiration:** 24 hours
- **Secret:** `JWT_SECRET` environment variable (default: "your-secret-key-change-in-production")

### Token Errors

| Status | Code         | Message                             | Cause                                         |
| ------ | ------------ | ----------------------------------- | --------------------------------------------- |
| 401    | UNAUTHORIZED | missing authorization header        | No Authorization header provided              |
| 401    | UNAUTHORIZED | invalid authorization header format | Header doesn't follow "Bearer <token>" format |
| 401    | UNAUTHORIZED | invalid authorization scheme        | Scheme is not "Bearer"                        |
| 401    | UNAUTHORIZED | empty token provided                | Token string is empty                         |
| 401    | UNAUTHORIZED | failed to parse token               | Token is malformed                            |
| 401    | UNAUTHORIZED | invalid or expired token            | Token signature invalid or expired            |
| 401    | UNAUTHORIZED | missing or invalid user_id in token | Token claims are invalid                      |

## Auth Endpoints

### POST /api/auth/signup

Create a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe" // optional
}
```

**Success Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "full_name": "John Doe",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses:**
| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | INVALID_REQUEST | Invalid request body | Malformed JSON |
| 400 | VALIDATION_ERROR | Email and password required | Missing required fields |
| 400 | VALIDATION_ERROR | Password must be at least 6 characters | Password too short |
| 409 | CONFLICT | Email already exists | User with email already registered |
| 500 | INTERNAL_ERROR | Failed to create user | Database error |

---

### POST /api/auth/login

Authenticate and get a JWT token.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "full_name": "John Doe",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses:**
| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | INVALID_REQUEST | Invalid request body | Malformed JSON |
| 401 | UNAUTHORIZED | Invalid email or password | User not found or password mismatch |
| 500 | INTERNAL_ERROR | Failed to generate token | JWT generation error |

---

## Household Endpoints

All household endpoints require authentication.

### POST /api/households

Create a new household (user must not be in a household).

**Request Body:**

```json
{
  "name": "My Family"
}
```

**Success Response (201):**

```json
{
  "household": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "My Family",
    "invite_code": "ABC123",
    "created_by": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2024-01-15T10:35:00Z"
  },
  "invite_code": "ABC123"
}
```

**Error Responses:**
| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | VALIDATION_ERROR | Household name is required | Name field empty |
| 401 | UNAUTHORIZED | Unauthorized | Invalid/missing token |
| 409 | CONFLICT | User already in a household | User cannot create if already member |
| 500 | INTERNAL_ERROR | Failed to generate invite code | Unique code generation failed |

---

### POST /api/households/join

Join an existing household using invite code.

**Request Body:**

```json
{
  "invite_code": "ABC123"
}
```

**Success Response (200):**

```json
{
  "message": "Joined household successfully",
  "household": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "My Family",
    "invite_code": "ABC123",
    "created_by": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2024-01-15T10:35:00Z"
  }
}
```

**Error Responses:**
| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | VALIDATION_ERROR | Invite code required | Missing invite_code |
| 401 | UNAUTHORIZED | Unauthorized | Invalid/missing token |
| 409 | CONFLICT | User already in a household | User cannot join if already member |
| 404 | NOT_FOUND | Invalid invite code | Invite code doesn't exist |
| 500 | INTERNAL_ERROR | Failed to join household | Database error |

---

### GET /api/households/me

Get current user's household and members.

**Success Response (200):**

```json
{
  "household": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "My Family",
    "invite_code": "ABC123",
    "created_by": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2024-01-15T10:35:00Z"
  },
  "members": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john@example.com",
      "full_name": "John Doe",
      "role": "owner"
    },
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440001",
      "email": "jane@example.com",
      "full_name": "Jane Doe",
      "role": "member"
    }
  ]
}
```

**Error Responses:**
| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 401 | UNAUTHORIZED | Unauthorized | Invalid/missing token |
| 404 | NOT_FOUND | User not in any household | User hasn't created/joined household |
| 500 | INTERNAL_ERROR | Failed to fetch household | Database error |

---

### GET /api/households/:id/members

Get members of a specific household.

**URL Parameters:**

- `id` (string): Household UUID

**Success Response (200):**

```json
[
  {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "full_name": "John Doe",
    "role": "owner"
  },
  {
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "jane@example.com",
    "full_name": "Jane Doe",
    "role": "member"
  }
]
```

**Error Responses:**
| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 401 | UNAUTHORIZED | Unauthorized | Invalid/missing token |
| 403 | FORBIDDEN | User not member of household | User can only access their own household |
| 404 | NOT_FOUND | Household not found | Household doesn't exist |
| 500 | INTERNAL_ERROR | Failed to list members | Database error |

---

### GET /api/households/me/summary

Get household statistics and summary.

**Success Response (200):**

```json
{
  "household_id": "660e8400-e29b-41d4-a716-446655440001",
  "household_name": "My Family",
  "current_user_role": "owner",
  "members_count": 2,
  "pantry_items_count": 15,
  "shopping_items_count": 8,
  "purchased_count": 3,
  "pending_count": 5
}
```

**Error Responses:**
| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 401 | UNAUTHORIZED | Unauthorized | Invalid/missing token |
| 404 | NOT_FOUND | User not in any household | User hasn't created/joined household |
| 500 | INTERNAL_ERROR | Failed to fetch summary | Database error |

---

## Pantry Endpoints

### GET /api/pantry/items

Get all pantry items for user's household.

**Success Response (200):**

```json
[
  {
    "id": 1,
    "household_id": "660e8400-e29b-41d4-a716-446655440001",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Milk",
    "quantity": 2,
    "unit": "liters",
    "category": "Dairy",
    "expiration_date": "2024-01-20T00:00:00Z",
    "notes": "Keep refrigerated",
    "created_at": "2024-01-15T10:40:00Z",
    "updated_at": "2024-01-15T10:40:00Z"
  }
]
```

**Error Responses:**
| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 401 | UNAUTHORIZED | Unauthorized | Invalid/missing token |
| 404 | NOT_FOUND | User not in any household | User must join household first |
| 500 | INTERNAL_ERROR | Failed to fetch items | Database error |

---

### POST /api/pantry/items

Add a new pantry item.

**Request Body:**

```json
{
  "name": "Milk",
  "quantity": 2,
  "unit": "liters",
  "category": "Dairy",
  "expiration_date": "2024-01-20",
  "notes": "Keep refrigerated"
}
```

**Success Response (201):**

```json
{
  "id": 1,
  "household_id": "660e8400-e29b-41d4-a716-446655440001",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Milk",
  "quantity": 2,
  "unit": "liters",
  "category": "Dairy",
  "expiration_date": "2024-01-20T00:00:00Z",
  "notes": "Keep refrigerated",
  "created_at": "2024-01-15T10:40:00Z",
  "updated_at": "2024-01-15T10:40:00Z"
}
```

**Error Responses:**
| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | VALIDATION_ERROR | Item name is required | Missing name |
| 400 | VALIDATION_ERROR | Quantity must be positive | Invalid quantity |
| 401 | UNAUTHORIZED | Unauthorized | Invalid/missing token |
| 404 | NOT_FOUND | User not in any household | User must join household first |
| 500 | INTERNAL_ERROR | Failed to add item | Database error |

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE_IN_UPPERCASE",
  "path": "/api/endpoint"
}
```

### Common Error Codes

| Code             | HTTP Status | Description                               |
| ---------------- | ----------- | ----------------------------------------- |
| UNAUTHORIZED     | 401         | Authentication failed or missing          |
| FORBIDDEN        | 403         | User lacks permissions for resource       |
| NOT_FOUND        | 404         | Resource doesn't exist                    |
| CONFLICT         | 409         | Resource conflict (e.g., duplicate email) |
| VALIDATION_ERROR | 400         | Input validation failed                   |
| INVALID_REQUEST  | 400         | Request format/structure invalid          |
| INTERNAL_ERROR   | 500         | Unexpected server error                   |

---

## CORS Headers

All endpoints support CORS with the following headers:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

## Rate Limiting

Currently no rate limiting is implemented. This should be added in production.

## Versioning

This is API v1. Future versions may be available at `/api/v2/`, etc.
