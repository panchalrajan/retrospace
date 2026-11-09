import { SectionLink } from "./section-link";
import SearchIcon from "@atlaskit/icon/core/search";
import ClockIcon from "@atlaskit/icon/core/clock";
import PeopleIcon from "@atlaskit/icon/core/people-group";
import BoardIcon from "@atlaskit/icon/core/board";
import CommentIcon from "@atlaskit/icon/core/comment";
import CheckMarkIcon from "@atlaskit/icon/core/check-mark";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import ArrowRightIcon from "@atlaskit/icon/core/arrow-right";
import LightbulbIcon from "@atlaskit/icon/core/lightbulb";
import Lozenge from "@atlaskit/lozenge";
import { UserAvatar } from "@/shared/user-avatar";
import { AuthButton } from "./auth-link";

const steps = [
  { number: "01", title: "Get it all on the board.", text: "Share the wins, the sticking points, and the ideas on your team’s mind.", Icon: LightbulbIcon, tone: "sage", label: "Reflect" },
  { number: "02", title: "Find what matters most.", text: "Vote on what resonates. Add context with comments. Focus the conversation together.", Icon: CommentIcon, tone: "blue", label: "Discuss" },
  { number: "03", title: "Leave with a next step.", text: "Give a good idea an owner and an action. Take something useful into the next sprint.", Icon: CheckMarkIcon, tone: "peach", label: "Improve" },
];
const questions = [
  { question: "What is Retrospace?", answer: "Retrospace is a space for sprint retrospectives: collect reflections, vote on ideas, add comments, and turn a useful conversation into action items." },
  { question: "What can I explore today?", answer: "Create a retrospective, invite your team, and collaborate live. Reflections, votes, comments, and host-managed action items are saved to your shared board." },
  { question: "Do I need an account to create a retro?", answer: "You can create or join a retrospective as a guest using your full name. Log in or create an account to keep your history across devices. The board above is a static illustration." },
  { question: "Can I switch between a board and a table?", answer: "Yes. The workspace includes both board and table views, so you can scan reflections visually or work through them as a list." },
];

const boardFeatures = [
  { Icon: BoardIcon, title: "Board and table views", text: "Switch between visual cards and a structured table." },
  { Icon: CommentIcon, title: "Votes and comments", text: "Vote on ideas and keep comments with each reflection." },
  { Icon: CheckMarkIcon, title: "Action items", text: "Assign owners, set due dates, and track next steps." },
  { Icon: SearchIcon, title: "Search and filters", text: "Find items by keyword, category, or participant." },
  { Icon: ClockIcon, title: "A focused session timer", text: "Timebox discussion with a built-in session timer." },
  { Icon: PeopleIcon, title: "Live team collaboration", text: "See shared updates and who is online in your retrospective." },
];
export function BoardFeatures() {
  return <section className="landing-features" id="features" aria-labelledby="features-title"><div className="landing-section-heading"><span className="public-eyebrow">INSIDE YOUR WORKSPACE</span><h2 id="features-title">The tools behind a useful retro.</h2><p className="landing-features-intro">Everything from the first reflection to the next step.</p></div><div className="landing-features-grid">{boardFeatures.map(({ Icon, title, text }) => <article key={title}><span className="landing-board-feature-icon"><Icon label="" size="small" /></span><h3>{title}</h3><p>{text}</p></article>)}</div></section>;
}

export function HowItWorks() {
  return <section className="landing-workflow" id="how-it-works" aria-labelledby="workflow-title">
    <div className="landing-section-heading"><span className="public-eyebrow">HOW IT WORKS</span><h2 id="workflow-title">A simple rhythm. A stronger team.</h2><p>Less time figuring out the process.<br />More room for the conversation.</p></div>
    <div className="landing-steps">{steps.map(({ number, title, text, Icon, tone, label }) => <article className="landing-step" key={number}>
      <div className="landing-step-top"><span className={`landing-feature-icon landing-feature-icon--${tone}`}><Icon label="" /></span><span className="landing-step-number">{number}</span></div>
      <span className="landing-step-label">{label}</span><h3>{title}</h3><p>{text}</p>
    </article>)}</div>
  </section>;
}

export function ActionSection() {
  return <section className="landing-action-section" aria-labelledby="action-title">
    <div className="landing-action-visual" aria-label="Example action items">
      <div className="landing-action-card"><div className="landing-action-card-header"><span><CheckMarkIcon label="" size="small" />Action items</span><Lozenge>Example</Lozenge></div>
        {[{ title: "Keep a little more time for focused work", person: "Ava Chen", status: "To do" }, { title: "Share a handoff note before the next release", person: "Marco Silva", status: "In progress" }].map(item => <div className="landing-action-row" key={item.title}><span className="landing-action-checkbox" aria-hidden="true" /><div><p>{item.title}</p><span><UserAvatar name={item.person} />{item.person}</span></div><Lozenge appearance={item.status === "To do" ? "default" : "inprogress"}>{item.status}</Lozenge></div>)}
        <div className="landing-action-note"><span className="landing-note-dot" />A good conversation deserves a follow-through.</div>
      </div>
      <span className="landing-action-decoration" aria-hidden="true">A little progress,<br />every sprint.</span>
    </div>
    <div className="landing-action-copy"><span className="public-eyebrow">MORE THAN A BOARD OF THOUGHTS</span><h2 id="action-title">Turn reflection<br /><span>into action.</span></h2><p>Keep reflections and action items together, so a promising idea has a clear next step.</p><ul>{["Reflections and actions, in one place", "An owner for every next step", "Board or table. Your way of working."].map(item => <li key={item}><CheckMarkIcon label="" size="small" />{item}</li>)}</ul><SectionLink id="workspace" className="landing-text-link">Take a look at the workspace <ArrowRightIcon label="" size="small" /></SectionLink></div>
  </section>;
}

export function FrequentlyAskedQuestions() {
  return <section className="landing-faq" id="questions" aria-labelledby="faq-title"><div className="landing-section-heading"><span className="public-eyebrow">A FEW THINGS YOU MIGHT BE WONDERING</span><h2 id="faq-title">Good questions.<br />Straight answers.</h2></div><div className="landing-faq-list">{questions.map(({ question, answer }) => <details key={question} name="retrospace-faq"><summary>{question}<ChevronDownIcon label="" size="small" /></summary><p>{answer}</p></details>)}</div></section>;
}

export function FinalCallToAction() {
  return <section className="landing-final-cta"><span className="public-eyebrow">MAKE SPACE FOR WHAT’S NEXT</span><h2>Make your next retro count.</h2><p>Give your team a place to reflect, regroup, and move forward.</p><AuthButton large>Create your account <ArrowRightIcon label="" size="small" /></AuthButton><span className="landing-final-note">A fresh perspective is a good place to start.</span></section>;
}
