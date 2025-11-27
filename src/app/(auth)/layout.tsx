// app/(auth)/layout.tsx
import GuestGuard from "@/components/GuestGuard";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GuestGuard>{children}</GuestGuard>;
}