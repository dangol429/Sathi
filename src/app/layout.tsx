import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans, Mukta } from "next/font/google";
import { LungtaRail } from "@/components/brand";
import { Kura } from "@/components/kura";
import { LoginModalHost } from "@/components/login-modal";
import { MockAuthProvider } from "@/components/mock-auth";
import { getViewer } from "@/lib/auth";
import { THEME_INIT_SCRIPT, ThemeProvider } from "@/components/theme";
import { ToastProvider } from "@/components/toast";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const mukta = Mukta({
  subsets: ["devanagari", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-mukta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Sathi — Nepal's working professionals, in the open",
    template: "%s · Sathi",
  },
  description:
    "A community where verified working professionals in Nepal answer students and curious learners. Starting with tech.",
};

export const viewport: Viewport = {
  themeColor: "#c8102e",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /*
   * Resolved here, once, and handed down. The auth check happens before a
   * single pixel is rendered, so nothing in the tree ever has to draw an
   * avatar first and find out afterwards whether there is a session behind it.
   * getViewer() is React-cached per request, so the header's own call is free.
   */
  const viewer = await getViewer();

  return (
    /* suppressHydrationWarning: the script below writes data-theme onto <html>
       before React sees it, which is the whole point of running it there. */
    <html
      lang="en"
      className={`${fraunces.variable} ${jakarta.variable} ${mukta.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <ThemeProvider>
          {/* One answer to "is anyone signed in?", for the whole tree. */}
          <MockAuthProvider hasRealSession={Boolean(viewer)}>
            <ToastProvider>
              <LungtaRail />
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
              <LoginModalHost />
              {/* Signed-in only, and it decides that for itself. Mounted here
                  so it survives navigation — a thread you are half-way through
                  typing should not close because you opened a profile. */}
              <Kura />
            </ToastProvider>
          </MockAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
