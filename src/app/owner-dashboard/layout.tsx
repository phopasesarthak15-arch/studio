import { AuthenticatedLayout } from "@/components/agri/authenticated-layout";

export default function OwnerDashboardLayout({
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
