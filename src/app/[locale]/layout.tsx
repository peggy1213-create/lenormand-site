import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale, getTranslations, getMessages } from "next-intl/server";
import Script from "next/script";
import { routing } from "@/i18n/routing";
import { BASE_URL, buildAlternates, localizedUrl } from "@/lib/seo";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import PostHogProvider from "@/components/PostHogProvider";
import PostHogPageView from "@/components/PostHogPageView";
import GoogleAnalyticsPageView from "@/components/GoogleAnalyticsPageView";
import ClarityProvider from "@/components/ClarityProvider";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#314b29",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  const ogLocale = locale === "zh-TW" ? "zh_TW" : "en_US";
  const alternateLocales = routing.locales
    .filter((l) => l !== locale)
    .map((l) => (l === "zh-TW" ? "zh_TW" : "en_US"));
  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: t("title"),
      template: `%s · ${t("title")}`,
    },
    description: t("tagline"),
    manifest: "/manifest.json",
    alternates: buildAlternates(locale),
    openGraph: {
      title: t("title"),
      description: t("tagline"),
      url: localizedUrl(locale),
      siteName: t("title"),
      locale: ogLocale,
      alternateLocale: alternateLocales,
      type: "website",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: t("title"),
    },
    icons: {
      icon: [
        { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: "/icons/apple-touch-icon.png",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=Cormorant+SC:wght@400;500;600&family=Pinyon+Script&family=Alegreya+Sans:wght@300;400;500;700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
        {locale === "zh-TW" && (
          <>
            <link
              rel="preload"
              href="/fonts/SweiSpringCJKtc-Regular.woff2"
              as="font"
              type="font/woff2"
              crossOrigin="anonymous"
            />
            <link
              rel="preload"
              href="/fonts/SweiSpringCJKtc-Bold.woff2"
              as="font"
              type="font/woff2"
              crossOrigin="anonymous"
            />
          </>
        )}
      </head>
      <body style={{ margin: 0 }}>
        <PostHogProvider>
          <NextIntlClientProvider messages={messages}>
            <PostHogPageView />
            <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
              <Header />
              <div style={{ flex: 1 }}>{children}</div>
              <Footer />
              <LanguageSwitcher />
            </div>
          </NextIntlClientProvider>
          <ServiceWorkerRegister />
          <ClarityProvider />
        </PostHogProvider>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-0Q82SZMP7L"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-0Q82SZMP7L', { send_page_view: false });
          `}
        </Script>
        <GoogleAnalyticsPageView />
      </body>
    </html>
  );
}
