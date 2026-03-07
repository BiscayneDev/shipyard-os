import type { Metadata } from "next"
import "./globals.css"
import { ConditionalLayout } from "@/components/ConditionalLayout"

export const metadata: Metadata = {
  title: "Shipyard OS",
  description: "The open-source Agent OS for solo founders",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className="antialiased"
        style={{ backgroundColor: "#0a0a0f", color: "#e4e4e7" }}
      >
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  )
}
