import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CARD_BACK_IMAGE } from "@/data/cards";
import styles from "./HomeDeckTeaser.module.css";

export default async function HomeDeckTeaser() {
  const t = await getTranslations("home");
  const back = { backgroundImage: `url('${CARD_BACK_IMAGE}')` };

  return (
    <Link href="/spreads" className={styles.wrap}>
      <div className={`${styles.card} ${styles.cardL}`} style={back} />
      <div className={`${styles.card} ${styles.cardM}`} style={back} />
      <div className={`${styles.card} ${styles.cardR}`} style={back} />
      <div className={styles.caption}>{t("deckCta")}</div>
    </Link>
  );
}
