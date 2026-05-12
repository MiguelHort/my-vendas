"use client";

import { useEffect } from "react";
import Script from "next/script";
import { useState } from "react";
import { getCookiePreferences } from "@/components/CookieBanner";

const CLARITY_ID = "v99obi3143";

export default function ClarityLoader() {
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

  useEffect(() => {
    const update = () => {
      const prefs = getCookiePreferences();
      setAnalyticsAllowed(prefs?.analytics === true);
    };
    update();
    window.addEventListener("cookie-consent-change", update);
    return () => window.removeEventListener("cookie-consent-change", update);
  }, []);

  if (!analyticsAllowed) return null;

  return (
    <Script
      id="microsoft-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_ID}");
        `,
      }}
    />
  );
}
