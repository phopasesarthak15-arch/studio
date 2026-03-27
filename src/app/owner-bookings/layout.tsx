import { AuthenticatedLayout } from "@/components/agri/authenticated-layout";

export default function OwnerBookingsLayout({
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
