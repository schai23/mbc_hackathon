/**
 * Morning Desk - Root Layout
 * 
 * Wraps all pages with providers and global styles.
 */

import type { Metadata } from "next";
import { Providers } from "@/components/Providers";

import "./globals.css";

export const metadata: Metadata = {
    title: "Morning Desk | Your Pocket Analyst",
    description: "Get daily briefings on US politics, crypto, and global policy with Polymarket integration.",
    keywords: ["polymarket", "prediction markets", "crypto", "politics", "analysis"],
    openGraph: {
        title: "Morning Desk",
        description: "Your pocket analyst for prediction markets",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
