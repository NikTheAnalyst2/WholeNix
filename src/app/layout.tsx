import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "wholenix — your complete self system",
  description: "Dashboard, finance, habits, learning, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head />
      <body>
        <div aria-hidden className="hidden"
          dangerouslySetInnerHTML={{
            __html: `<script>try{const t=localStorage.getItem('wholenix-theme');const m=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(!t&&m))document.documentElement.classList.add('dark')}catch(e){}</script>`,
          }}
          suppressHydrationWarning
        />
        <ThemeProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-x-auto p-4 pt-20 lg:pt-4 lg:pl-4">
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
