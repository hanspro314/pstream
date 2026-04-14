import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#E50914",
};

export const metadata: Metadata = {
  title: "PStream — Stream. Discover. Enjoy.",
  description:
    "Uganda's premier movie streaming platform. Watch thousands of movies and series in HD quality. New releases added daily.",
  keywords: [
    "PStream",
    "streaming",
    "movies",
    "Uganda",
    "African movies",
    "entertainment",
    "online streaming",
  ],
  authors: [{ name: "PStream" }],
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '1024x1024', type: 'image/png' },
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    title: "PStream — Stream. Discover. Enjoy.",
    description: "Uganda's premier movie streaming platform.",
    type: "website",
    siteName: "PStream",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#E50914" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PStream" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <ServiceWorkerRegister />
      </head>
      <body
        className={`${inter.variable} antialiased bg-[#0A0A0A] text-white`}
      >
        {children}
      </body>
    </html>
  );
}
