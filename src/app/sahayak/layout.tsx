import { AuthenticatedLayout } from "@/components/agri/authenticated-layout";

export default function SahayakLayout({
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
