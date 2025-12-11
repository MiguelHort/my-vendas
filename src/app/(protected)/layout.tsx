// app/(dashboard)/layout.tsx ou algo assim
import AuthGuard from "@/components/AuthGuard";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}