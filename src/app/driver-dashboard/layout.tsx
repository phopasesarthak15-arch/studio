import { AuthenticatedLayout } from "@/components/agri/authenticated-layout";

export default function DriverDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthenticatedLayout>
        {children}
    </AuthenticatedLayout>
  );
}
