import type { Metadata } from "next"
import { Cinzel_Decorative, Manrope } from "next/font/google"
import { Shell } from "@/components/layout/Shell"
import "./globals.css"

const cinzelDecorative = Cinzel_Decorative({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-heading",
})

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "Zoa",
  description: "Zoa — Microbiological Archive",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${cinzelDecorative.variable} ${manrope.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
