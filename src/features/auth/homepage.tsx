import Link from "next/link";
import { SectionLink } from "./section-link";
import ArrowRightIcon from "@atlaskit/icon/core/arrow-right";
import ArrowDownIcon from "@atlaskit/icon/core/arrow-down";
import CheckMarkIcon from "@atlaskit/icon/core/check-mark";
import { UserAvatar } from "@/shared/user-avatar";
import { PublicLayout } from "./public-layout";
import { AuthButton } from "./auth-link";
import { BoardFeatures, HowItWorks, ActionSection, FrequentlyAskedQuestions, FinalCallToAction } from "./homepage-sections";

import BoardPreview from "./board-preview";

function FloatingWorkspace() {
  return <div className="landing-demo-scene" id="workspace">
    <div className="landing-demo-backdrop" aria-hidden="true" />
    <section className="landing-demo-window" aria-label="Sample retrospective illustration">
      <div className="landing-demo-chrome"><span className="landing-window-dots" aria-hidden="true"><i /><i /><i /></span><span>retrospace / your team’s next chapter</span></div>
      <div className="landing-demo-heading"><div><span className="landing-demo-eyebrow">TEAM WORKSPACE</span><h2>Sprint retrospective</h2></div><div className="landing-demo-avatars" aria-label="Example team members">{["Ava Chen", "Marco Silva", "Priya Patel"].map(name => <UserAvatar key={name} name={name} />)}</div></div>
      <div className="landing-demo-toolbar"><span><span className="landing-demo-status-dot" />A space for every perspective</span><span>Sample board</span></div>
      <div className="landing-real-board"><BoardPreview /></div>
    </section>
    <div className="landing-floating-note"><span><CheckMarkIcon label="" size="small" /></span><div>A clearer way forward.</div></div>
  </div>;
}

export function Homepage() {
  return <PublicLayout title="Make room for a better sprint">
    <main className="landing-main">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="landing-hero-copy"><span className="landing-kicker"><span />A thoughtful space for team retrospectives</span><h1 id="hero-title">Make room for<br /><span>a better sprint.</span></h1><p>Reflect on the wins. Talk through the challenges. Turn your team’s ideas into a clear next step.</p>
          <div className="landing-actions"><AuthButton large>Create your account <ArrowRightIcon label="" size="small" /></AuthButton><SectionLink id="how-it-works" className="landing-how-link">How it works <ArrowDownIcon label="" size="small" /></SectionLink></div>
          <Link className="landing-guest-create" href="/?create=1">Or create a retro as a guest →</Link>
        </div>
        <FloatingWorkspace />
      </section>
      <HowItWorks />
      <BoardFeatures />
      <ActionSection />
      <FrequentlyAskedQuestions />
      <FinalCallToAction />
    </main>
  </PublicLayout>;
}
