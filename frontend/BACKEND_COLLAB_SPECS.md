# Backend API Specifications for Document Collaboration

## 1. Get Collaborators Endpoint
- **URL**: `/collaborators/`
- **Method**: GET
- **Authentication**: Required (Bearer Token)
- **Response**:
  ```typescript
  interface CollaboratorInvite {
    id?: string;
    inviter_id: string;
    collaborator_email: string;
    status: "pending" | "accepted" | "rejected";
    invited_at?: Date;
    expires_at?: Date;
    auth_role?: 'read' | 'comment' | 'update' | 'create';
  }
  ```

## 2. Get Document Collaborators Endpoint
- **URL**: `/collaborators/files`
- **Method**: GET
- **Authentication**: Required (Bearer Token)
- **Query Parameters**:
  - `document_id`: string (required)
- **Response**:
  ```typescript
  interface DocumentCollaborator {
    document_id: string;
    inviter_id: string;
    invitee_id: string;
    auth_role: 'read' | 'comment' | 'update' | 'create';
  }[]
  ```

## 3. Authorize Collaborator Endpoint
- **URL**: `/collaborators/authorize`
- **Method**: POST
- **Authentication**: Required (Bearer Token)
- **Request Body**:
  ```typescript
  interface AuthorizeCollaboratorRequest {
    id?: string;
    inviter_id: string;
    collaborator_email: string;
    invited_at?: Date;
    auth_role: 'read' | 'comment' | 'update' | 'create';
    document_id: string;
  }
  ```
- **Response**:
  ```typescript
  interface CollaboratorInvite {
    id: string;
    inviter_id: string;
    collaborator_email: string;
    status: "pending";
    invited_at: Date;
    expires_at: Date;
    auth_role: 'read' | 'comment' | 'update' | 'create';
  }
  ```

## 4. Remove Collaborator Endpoint
- **URL**: `/collaborators/{collaboratorId}`
- **Method**: DELETE
- **Authentication**: Required (Bearer Token)
- **Response**: 204 No Content

## Error Handling
Common Error Responses:
- 400 Bad Request
  - Invalid document_id
  - Invalid collaborator email
  - Exceeded maximum collaborators (5)
- 401 Unauthorized
  - Invalid or expired authentication token
- 403 Forbidden
  - User does not have permission to invite collaborators
- 404 Not Found
  - Document or collaborator not found
- 409 Conflict
  - Collaborator already invited or part of the document

## Authorization Roles
- `read`: View-only access
- `comment`: View and add comments
- `update`: Edit document content
- `create`: Full document management including deletion

## Invitation Workflow
1. Fetch available collaborators
2. Select collaborators (max 5)
3. Send invitation with specified role
4. Backend creates pending invitation
5. Invited user receives email notification
6. Invited user can accept or reject invitation

## Security Considerations
- Validate email domains
- Implement rate limiting for invitations
- Ensure inviter has permission to share document
- Set expiration for invitations (e.g., 7 days)
- Prevent duplicate invitations
