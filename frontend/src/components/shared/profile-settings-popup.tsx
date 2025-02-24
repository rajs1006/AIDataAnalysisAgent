'use client';

import { useState } from 'react';
import { X, User, Shield, Mail, CheckCircle, Edit, DollarSign } from 'lucide-react';
import { BillingMetrics } from './billing-metrics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/store/auth';
import { useToast } from '@/components/ui/use-toast';
import { User as UserType } from '@/lib/types/auth';

export function ProfileSettingsPopup({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean, 
  onClose: () => void 
}) {
  const [activeTab, setActiveTab] = useState('profile');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const { 
    user, 
    resetPassword, 
    resendVerificationEmail,
  } = useAuthStore();
  const { toast } = useToast();

  const handleResetPassword = async () => {
    try {
      await resetPassword({
        type: 'verify',
        newPassword,
        confirmNewPassword,
        email: user?.email
      });
      
      toast({
        title: 'Password Reset',
        description: 'Your password has been successfully updated'
      });
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      toast({
        title: 'Password Reset Failed',
        description: error.message || 'Could not reset password',
        variant: 'destructive'
      });
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;
    
    try {
      await resendVerificationEmail(user.email);
      toast({
        title: 'Verification Email Sent',
        description: 'A new verification email has been sent to your email address'
      });
    } catch (error: any) {
      toast({
        title: 'Verification Email Failed',
        description: error.message || 'Could not resend verification email',
        variant: 'destructive'
      });
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
      style={{ backdropFilter: "blur(8px)" }}
    >
      <div
        className="bg-gray-900 w-[60%] h-[80%] rounded-2xl shadow-2xl flex overflow-hidden"
        style={{
          backgroundColor: "rgba(17, 24, 39, 0.95)", 
          backdropFilter: "blur(15px)",
        }}
      >
        {/* Left Navigation */}
        <div className="w-1/4 border-r border-gray-700 p-4 bg-gray-800 space-y-2">
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center space-x-2 p-3 rounded-lg transition-all duration-200 ${
              activeTab === "profile"
                ? "bg-gray-700 text-white shadow-md"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
          >
            <User className="w-5 h-5" />
            <span>Profile</span>
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`w-full flex items-center space-x-2 p-3 rounded-lg transition-all duration-200 ${
              activeTab === "security"
                ? "bg-gray-700 text-white shadow-md"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
          >
            <Shield className="w-5 h-5" />
            <span>Security</span>
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`w-full flex items-center space-x-2 p-3 rounded-lg transition-all duration-200 ${
              activeTab === "billing"
                ? "bg-gray-700 text-white shadow-md"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span>Billing</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="w-3/4 p-8 relative overflow-y-auto bg-gray-900 text-gray-100">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-300 hover:text-white bg-gray-700 p-2 rounded-full transition-all duration-200 hover:bg-gray-600"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="flex items-center space-x-6 border-b border-gray-700 pb-6">
                <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center">
                  <User className="w-12 h-12 text-gray-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                    <span>{user.full_name}</span>
                    <Edit className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-200" />
                  </h2>
                  <p className="text-gray-400 flex items-center space-x-2">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Account Type
                  </h3>
                  <Badge
                    variant="secondary"
                    className="bg-blue-600 text-white"
                  >
                    {user.userType || "User"}
                  </Badge>
                </div>

                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Email Status
                  </h3>
                  <Badge
                    variant={user.isEmailVerified ? "default" : "destructive"}
                    className="flex items-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {user.isEmailVerified ? "Verified" : "Not Verified"}
                    </span>
                  </Badge>
                  {!user.isEmailVerified && (
                    <Button
                      variant="link"
                      onClick={handleResendVerification}
                      className="text-blue-400 hover:text-blue-300 mt-2"
                    >
                      Resend Verification
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white border-b border-gray-700 pb-4">
                Security Settings
              </h2>
              <div className="space-y-4">
                <Input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="border-gray-700 focus:border-blue-500 bg-gray-800 text-white"
                />
                <Input
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="border-gray-700 focus:border-blue-500 bg-gray-800 text-white"
                />
                <Button
                  onClick={handleResetPassword}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                >
                  Reset Password
                </Button>
              </div>
            </div>
          )}

          {activeTab === "billing" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white border-b border-gray-700 pb-4">
                Billing & Usage
              </h2>
              <BillingMetrics />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
