import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
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
  themeColor: "#0A0A0A",
};

export const metadata: Metadata = {
  title: "PStream — Stream. Discover. Enjoy.",
  description:
    "Uganda's premier movie streaming platform. Watch thousands of movies and series in HD quality. New releases daily for just UGX 2,000/week.",
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
    apple: '/favicon.png',
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${inter.variable} antialiased bg-[#0A0A0A] text-white`}
      >
        {children}
      </body>
    </html>
  );
}
