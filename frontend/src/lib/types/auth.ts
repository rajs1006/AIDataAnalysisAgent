export type user_type = "business" | "individual";

export type AuthErrorCode =
  | "INVALID_TOKEN"
  | "PASSWORD_MISMATCH"
  | "WS_1013_TRY_AGAIN_LATER"
  | "EMAIL_NOT_FOUND"
  | "EMAIL_DELIVERY_FAILED"
  | "CONTACT_ADMIN"
  | "UNKNOWN_ERROR"
  | "REGISTRATION_FAILED";

export interface User {
  id: string;
  full_name: string;
  email: string;
  userType: user_type;
  isEmailVerified: boolean;
  avatar?: string;
  hasConnectedSources?: boolean;
}

export interface RegistrationPayload {
  name: string;
  email: string;
  userType: user_type;
}

export interface EmailVerificationPayload {
  token: string;
  password: string;
  confirmPassword?: string;
  type?: "registration" | "reset-password" | "collaborate";
  email?: string; // Add optional email field
  name?: string;
  userType?: user_type;
}

export interface CollaboratorInvite {
  id?: string;
  inviter_id: string;
  collaborator_email: string;
  status: "pending" | "accepted" | "rejected";
  invited_at?: Date;
  expires_at?: Date;
  auth_role?: 'read' | 'comment' | 'update' | 'create' | 'none';
}

export interface DocumentCollaborator {
  id: string;
  inviter_id: string;
  collaborator_email: string;
  status: "accepted" | "pending" | "rejected";
  invited_at: string;
  expires_at: string;
  auth_role: 'read' | 'comment' | 'update' | 'create' | 'none';
}

export interface AuthorizeCollaboratorRequest {
  document_id: string;
  collaborator_ids: string[];
  auth_role: 'read' | 'comment' | 'update' | 'create' | 'none';
}

export interface AuthorizeCollaboratorResponse {
  document_id: string;
  auth_role: string;
  message: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ResetPasswordPayload {
  token?: string;
  email?: string;
  newPassword: string;
  confirmNewPassword: string;
  type?: "request" | "verify";
}

export interface AuthErrorResponse {
  error: true;
  message: string;
  code: AuthErrorCode;
  canRetry?: boolean;
  email?: string;
  retryAfter?: number; // Time in seconds before retry is allowed
}

export interface RegistrationResponse {
  error?: false;
  message: string;
  code?: string;
  user?: User;
}
