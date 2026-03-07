import type { Metadata } from "next"
import "./globals.css"
import { ConditionalLayout } from "@/components/ConditionalLayout"

export const metadata: Metadata = {
  title: "Shipyard OS",
  description: "The open-source Agent OS for solo founders",
  metadataBase: new URL("https://shipyard-teal.vercel.app"),
  keywords: [
    "ai agents",
    "agent os",
    "autonomous agents",
    "task management",
    "agent orchestration",
    "solo founder",
    "ai dashboard",
  ],
  openGraph: {
    title: "Shipyard OS",
    description: "The open-source Agent OS for solo founders",
    url: "/os",
    siteName: "Shipyard OS",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shipyard OS",
    description: "The open-source Agent OS for solo founders",
  },
  other: {
    "theme-color": "#0a0a0f",
  },
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
