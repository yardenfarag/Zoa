import type { Metadata } from "next"
import { Roboto, Manrope } from "next/font/google"
import { Shell } from "@/components/layout/Shell"
import "./globals.css"

const roboto = Roboto({
  subsets: ["latin"],
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
      className={`${roboto.variable} ${manrope.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
