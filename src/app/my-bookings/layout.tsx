import { AuthenticatedLayout } from "@/components/agri/authenticated-layout";

export default function MyBookingsLayout({
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
