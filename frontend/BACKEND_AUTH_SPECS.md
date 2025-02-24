# Collaborator API Specifications

## Invite Collaborator Endpoint

### Request
- **URL**: `/collaborators/invite`
- **Method**: `POST`
- **Authentication**: Required (Bearer Token)
- **Request Body**:
```json
{
  "inviterUserId": "string",
  "email": "string"
}
```

### Response
- **Success Response**:
```json
{
  "id": "string",
  "inviterId": "string",
  "inviteeEmail": "string",
  "status": "pending" | "accepted" | "rejected",
  "invitedAt": "date",
  "expiresAt": "date"
}
```
- **Error Responses**:
  - 400 Bad Request: Invalid email or missing required fields
  - 401 Unauthorized: Authentication token missing or invalid
  - 409 Conflict: Collaborator already invited

## Get Collaborators Endpoint

### Request
- **URL**: `/collaborators/{userId}`
- **Method**: `GET`
- **Authentication**: Required (Bearer Token)
- **Path Parameters**:
  - `userId`: ID of the user whose collaborators are being fetched

### Response
- **Success Response**: Array of Collaborator Invites
```json
[
  {
    "id": "string",
    "inviterId": "string",
    "inviteeEmail": "string",
    "status": "pending" | "accepted" | "rejected",
    "invitedAt": "date",
    "expiresAt": "date"
  }
]
```
- **Error Responses**:
  - 401 Unauthorized: Authentication token missing or invalid
  - 404 Not Found: User not found

## Remove Collaborator Endpoint

### Request
- **URL**: `/collaborators/{collaboratorId}`
- **Method**: `DELETE`
- **Authentication**: Required (Bearer Token)
- **Path Parameters**:
  - `collaboratorId`: ID of the collaborator invite to remove

### Response
- **Success Response**: 
  - Status Code: 204 No Content
- **Error Responses**:
  - 401 Unauthorized: Authentication token missing or invalid
  - 403 Forbidden: User not authorized to remove this collaborator
  - 404 Not Found: Collaborator invite not found

## Collaborator Invite Status Lifecycle

1. **Pending**: Initial state when invite is created
2. **Accepted**: Collaborator has accepted the invite
3. **Rejected**: Collaborator has declined the invite

## Error Codes

- `COLLABORATOR_ALREADY_INVITED`: Invite already exists for this email
- `INVALID_EMAIL`: Email address is not valid
- `MAX_COLLABORATORS_REACHED`: User has reached maximum number of collaborators
- `SELF_INVITE_NOT_ALLOWED`: Cannot invite yourself as a collaborator
