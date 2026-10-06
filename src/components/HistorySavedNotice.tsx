"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";

// Subtitle on the history page. Signed-in users get the cross-device wording;
// anonymous users get the device-only wording.
export default function HistorySavedNotice({ style }: { style?: CSSProperties }) {
  const h = useTranslations("history");
  const { user } = useAuth();
  return <p style={style}>{user ? h("savedNoticeSynced") : h("savedNotice")}</p>;
}
