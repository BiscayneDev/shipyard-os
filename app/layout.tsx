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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onerror = function(msg, src, line, col, err) {
                document.body.innerHTML = '<div style="padding:2rem;font-family:monospace;color:#e4e4e7;background:#0a0a0f;min-height:100vh">'
                  + '<h1 style="color:#ef4444">JS Error Caught</h1>'
                  + '<pre style="color:#f59e0b;white-space:pre-wrap;margin-top:1rem">' + msg + '</pre>'
                  + '<pre style="color:#71717a;white-space:pre-wrap;margin-top:0.5rem;font-size:12px">Source: ' + src + ':' + line + ':' + col + '</pre>'
                  + '<pre style="color:#71717a;white-space:pre-wrap;margin-top:0.5rem;font-size:12px">' + (err && err.stack ? err.stack : 'No stack') + '</pre>'
                  + '</div>';
                return true;
              };
              window.addEventListener('unhandledrejection', function(e) {
                document.body.innerHTML = '<div style="padding:2rem;font-family:monospace;color:#e4e4e7;background:#0a0a0f;min-height:100vh">'
                  + '<h1 style="color:#ef4444">Unhandled Promise Rejection</h1>'
                  + '<pre style="color:#f59e0b;white-space:pre-wrap;margin-top:1rem">' + (e.reason && e.reason.message ? e.reason.message : String(e.reason)) + '</pre>'
                  + '<pre style="color:#71717a;white-space:pre-wrap;margin-top:0.5rem;font-size:12px">' + (e.reason && e.reason.stack ? e.reason.stack : 'No stack') + '</pre>'
                  + '</div>';
              });
            `,
          }}
        />
      </head>
      <body
        className="antialiased"
        style={{ backgroundColor: "#0a0a0f", color: "#e4e4e7" }}
      >
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  )
}
