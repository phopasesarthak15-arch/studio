import { AuthenticatedLayout } from "@/components/agri/authenticated-layout";

export default function ProfileLayout({
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
