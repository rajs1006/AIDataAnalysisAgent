import { Metadata } from "next";
import { DashboardLayout } from "@/components/layout/dashboard";
import { ProtectedRoute } from "@/components/layout/protected-route";

export const metadata: Metadata = {
  title: "Dashboard - AI Data Agent",
  description: "AI Data Agent Dashboard",
};

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout />
      {/* <div>Chat component will go here</div>
      </DashboardLayout> */}
    </ProtectedRoute>
  );
}
