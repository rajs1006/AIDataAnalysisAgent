import { authService } from '../api/auth';
import { useAuthStore } from '../store/auth';

export const emailVerificationThunks = {
  verifyEmail: (request: { 
    token: string, 
    password: string, 
    confirmPassword?: string,
    type?: 'registration' | 'reset-password',
    email?: string
  }) => async () => {
    try {
      const user = await authService.verifyEmailAndSetPassword({
        token: request.token,
        password: request.password,
        confirmPassword: request.confirmPassword,
        type: request.type,
        email: request.email || ''
      });
      
      return user;
    } catch (error) {
      console.error('Email verification thunk failed', error);
      throw error;
    }
  },

  resendVerificationEmail: (email: string, name?: string, userType?: 'individual' | 'business') => async () => {
    try {
      // Use register method to resend verification email
      await authService.register({
        email,
        name: name || '', // Provide a default empty string if name is not provided
        userType: userType || 'individual' // Default to individual if not specified
      });
    } catch (error) {
      console.error('Resend verification email thunk failed', error);
      throw error;
    }
  }
};
