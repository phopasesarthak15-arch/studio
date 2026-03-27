import { AuthenticatedLayout } from "@/components/agri/authenticated-layout";

export default function DashboardLayout({
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
