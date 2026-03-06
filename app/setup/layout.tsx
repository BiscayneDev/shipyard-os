// Setup wizard uses its own full-screen layout — no sidebar, no toast provider
export default function SetupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
