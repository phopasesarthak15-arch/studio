import { AuthenticatedLayout } from "@/components/agri/authenticated-layout";

export default function MyEquipmentLayout({
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
