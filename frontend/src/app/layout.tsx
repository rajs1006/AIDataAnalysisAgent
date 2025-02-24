"use client";

import { Inter } from "next/font/google";
import { Provider } from "react-redux";
import { store } from "@/lib/store/store";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { AuthInitializer } from "@/components/auth/auth-init";
import "./globals.css";


const inter = Inter({ subsets: ["latin"] });

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="Document Management System powered by AI"
        />
        <meta name="theme-color" content="#2C5530" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="AI Document Management" />
        <meta
          property="og:description"
          content="Intelligent document management and organization powered by AI"
        />
        <title>AI Document Management</title>
      </head>
      <body
        className={`${inter.className} bg-[#F5F5F0] text-[#1A331E]`}
        suppressHydrationWarning={true}
      >
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <AuthInitializer />
            {children}
            <Toaster />
          </QueryClientProvider>
        </Provider>

        <div id="modal-root" />
        <div id="tooltip-root" />
        <div id="popover-root" />
      </body>
    </html>
  );
}
