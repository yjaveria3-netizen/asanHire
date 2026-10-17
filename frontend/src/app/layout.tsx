import type { Metadata, Viewport } from "next";
import { Roboto_Slab } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const slab = Roboto_Slab({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-slab",
  display: "swap",
  fallback: ["Rockwell", "Rockwell Nova", "Clarendon", "Georgia", "serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    template: "%s | asanHire",
    default: "asanHire",
  },
  description: "AI Hiring Workflow & Proctoring Orchestration. AI Recommends, Human Decides.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "asanHire | AI Hiring Workflow & Proctoring Orchestration",
    description: "AI Recommends, Human Decides. End-to-end recruitment with human sovereignty.",
    url: "/",
    siteName: "asanHire",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "asanHire logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "asanHire | AI Hiring Workflow & Proctoring Orchestration",
    description: "AI Recommends, Human Decides. End-to-end recruitment with human sovereignty.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#1E201E",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${slab.variable}`}>
      <body className="min-h-screen bg-[#1E201E] text-[#D9DADF] selection:bg-[#DD700B] selection:text-[#1E201E]">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
