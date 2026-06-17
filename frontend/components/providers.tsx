/**
 * App-wide providers. ClearAid runs fully anonymously with no authentication,
 * so this is currently a simple pass-through. Kept as a single mount point in
 * case future client-side providers are needed.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
