import LinkButton from "@atlaskit/button/link";
import { PublicLayout } from "@/features/auth/public-layout";
export default function NotFoundPage() {
  return <PublicLayout title="Page not found"><main className="not-found-main"><div className="not-found-art" aria-hidden="true"><span className="not-found-card">A wrong turn.<br />A fresh start.</span><span className="not-found-number">404</span></div><span className="public-eyebrow">A LITTLE OFF TRACK</span><h1>This page isn’t on the board.</h1><p>The link may have changed, or the page has moved.<br />Let’s get you back to a familiar space.</p><LinkButton href="/" appearance="primary">Back to Retrospace</LinkButton></main></PublicLayout>;
}
