"use client";

import { Metadata } from "next";
import { Inter } from "next/font/google";
import { Provider } from "react-redux";
import { store } from "@/lib/store/store";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <link rel="icon" href="/icon-192.png" type="image/png" />
        <link rel="shortcut icon" href="/icon-192.png" type="image/png" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="Andrual - AI-powered chat interface for intelligent conversations. Access your company's knowledge base through natural language interactions."
        />
        <meta
          property="og:description"
          content="Andrual - AI-powered chat interface for intelligent conversations. Access your company's knowledge base through natural language interactions."
        />
        <meta property="og:title" content="Andrual" />
        <meta property="og:type" content="website" />
        <title>Andrual</title>
      </head>
      <body className={inter.className}>
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem={false}
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </QueryClientProvider>
        </Provider>
      </body>
    </html>
  );
}
