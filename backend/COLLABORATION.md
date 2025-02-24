# Document Collaboration Feature

## Overview
This feature allows users to invite and manage collaborators for documents with granular access control.

## Authorization Roles

The collaboration system supports four distinct authorization roles:

1. **Read** (`read`)
   - View document contents
   - No modification permissions
   - Ideal for reviewers or stakeholders who need visibility

2. **Comment** (`comment`)
   - View document contents
   - Add comments and annotations
   - Cannot modify the core document
   - Useful for feedback and review processes

3. **Update** (`update`)
   - View document contents
   - Modify document content
   - Cannot delete or manage document settings
   - Suitable for team members actively contributing to the document

4. **Create** (`create`)
   - Full document management capabilities
   - View, modify, and delete document
   - Invite/remove collaborators
   - Highest level of access

## API Endpoints

### 1. Get Document Collaborators
- **Endpoint**: `GET /v1/collaborators/files/authorization`
- **Parameters**: 
  - `document_id`: Unique identifier of the document
- **Response**: List of current collaborators with their roles

### 2. Invite Collaborator
- **Endpoint**: `POST /v1/collaborators/share`
- **Request Body**:
  ```json
  {
    "document_id": "string",
    "collaborator_email": "email@example.com",
    "auth_role": "read|comment|update|create"
  }
  ```
- **Behavior**: 
  - Sends invitation email
  - Creates pending collaboration record
  - Limits to maximum 5 collaborators per document

### 3. Remove Collaborator
- **Endpoint**: `DELETE /v1/collaborators/{collaborator_id}`
- **Behavior**: Removes collaborator from document

### 4. Update Collaborator Role
- **Endpoint**: `PUT /v1/collaborators/{collaborator_id}/role`
- **Request Body**:
  ```json
  {
    "auth_role": "read|comment|update|create"
  }
  ```

### 5. Accept Collaboration Invitation
- **Endpoint**: `POST /v1/collaborators/{collaborator_id}/accept`
- **Behavior**: 
  - Changes invitation status to 'accepted'
  - Grants document access

## Error Handling

- **400 Bad Request**: 
  - Invalid document ID
  - Invalid collaborator email
  - Exceeded maximum collaborators (5)

- **401 Unauthorized**: 
  - Invalid or expired authentication token

- **403 Forbidden**: 
  - User does not have permission to invite collaborators

- **404 Not Found**: 
  - Document or collaborator not found

- **409 Conflict**: 
  - Collaborator already invited or part of the document

## Security Considerations

- All collaboration actions require authentication
- Invitations expire after 7 days
- Maximum of 5 collaborators per document
- Email invitations include document-specific details

## Best Practices

1. Only invite collaborators with necessary access levels
2. Regularly review and update collaborator permissions
3. Remove collaborators when they no longer need access
4. Use the least privileged role possible for each collaborator

## Technical Implementation

- Uses SQLAlchemy ORM for database interactions
- Implements role-based access control (RBAC)
- Sends email invitations via SMTP
- Provides comprehensive logging for collaboration actions
