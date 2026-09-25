import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createIntlMiddleware(routing);

export const config = {
  matcher: ["/", "/(en|zh-TW)/:path*", "/((?!api|_next|.*\\..*).*)"],
};
