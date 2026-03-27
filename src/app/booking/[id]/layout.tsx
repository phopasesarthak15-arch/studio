import { AuthenticatedLayout } from "@/components/agri/authenticated-layout";

export default function BookingLayout({
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
