import type { Metadata } from "next";
import { Geist, Geist_Mono, Onest, Noto_Sans_Arabic, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/Toast";
import { PageTransition } from "@/components/PageTransition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const onest = Onest({
  variable: "--onest",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const arabic = Noto_Sans_Arabic({
  variable: "--arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

const bebasNeue = Bebas_Neue({
  variable: "--bebas",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "EFA Players",
  description: "Egyptian Football Association — Player Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${onest.variable} ${arabic.variable} ${bebasNeue.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ToastProvider>
            <PageTransition>
              {children}
            </PageTransition>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
