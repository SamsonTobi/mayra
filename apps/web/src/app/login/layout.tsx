/**
 * Login route layout — no auth gate.
 * The login page is the auth page itself, so it's always visible.
 */
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
