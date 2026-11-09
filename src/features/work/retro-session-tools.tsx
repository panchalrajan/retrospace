"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import Button from "@atlaskit/button/button";
import ModalDialog, { ModalTitle } from "@atlaskit/modal-dialog";
import TextArea from "@atlaskit/textarea";
import Textfield from "@atlaskit/textfield";
import ClockIcon from "@atlaskit/icon/core/clock";
import DownloadIcon from "@atlaskit/icon/core/download";
import ShareIcon from "@atlaskit/icon/core/share";
import { MenuListItem } from "@atlaskit/navigation-system/top-nav-items";
import mockAttendance from "@/features/navigation/mock-retro-attendance.json";
import { RetroModalActions, RetroModalBody, RetroModalFooter, RetroModalHeader } from "@/shared/design-system/retro-modal-parts";
import mockActionItems from "./mock-action-items.json";

type ActionItem = (typeof mockActionItems)[number];
type ExportItem = {
  key: string;
  title: string;
  createdBy: string;
  status: string;
  description?: string;
  votes: string[];
  comments?: { author: string; text: string }[];
};

const TIMER_STORAGE_KEY = "retrospace.timer.v1";
const useHydrationLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
export const RetroTimerDurationContext = createContext<[number, (minutes: number) => void]>([15, () => {}]);
const attendees = mockAttendance.attendees;
const initialSessionDate = mockAttendance.sessionStartedAt;

function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function formatSessionDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function describeAttendance(attendee: (typeof attendees)[number]): string {
  const joinedAt = new Date(attendee.joinedAt);
  const sessionStart = new Date(initialSessionDate);
  const joined = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(joinedAt);
  const minutesLate = Math.max(0, Math.floor((joinedAt.getTime() - sessionStart.getTime()) / 60_000));
  const arrival = minutesLate === 0 ? "on time" : `${minutesLate} min late`;
  const leftAt = attendee.presence === "left" && attendee.leftAt
    ? `, left at ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(attendee.leftAt))}`
    : "";
  return `- ${attendee.name} — joined ${joined}, ${arrival}${leftAt}`;
}

function makeMarkdown({
  sprint,
  owner,
  items,
  actionItems,
  durationMinutes,
}: {
  sprint: string;
  owner: string;
  items: ExportItem[];
  actionItems: ActionItem[];
  durationMinutes: number;
}): string {
  const active = attendees.filter((attendee) => attendee.presence === "active");
  const left = attendees.filter((attendee) => attendee.presence === "left");
  const itemSections = items.map((item) => {
    const votes = item.votes.length ? ` · ${item.votes.length} vote${item.votes.length === 1 ? "" : "s"}` : "";
    const comments = item.comments?.length ? ` · ${item.comments.length} comment${item.comments.length === 1 ? "" : "s"}` : "";
    return `### ${item.status} — ${item.key}\n\n${item.title}\n\n- Owner: ${item.createdBy}${votes}${comments}${item.description ? `\n- Details: ${item.description}` : ""}`;
  });
  const actionRows = actionItems.map((item) => `- [${item.done ? "x" : " "}] **${item.title}** — ${item.owner || "Unassigned"} (due ${item.dueDate || "No due date"})`);

  return [
    `# ${sprint} Retrospective`,
    "",
    `- **Sprint:** ${sprint}`,
    `- **Owner:** ${owner || "Unassigned"}`,
    `- **Date and time:** ${formatSessionDate(initialSessionDate)}`,
    `- **Duration:** ${formatTimer(durationMinutes * 60)} (planned)`,
    "",
    "## Attendance",
    `### Participated (${active.length})`,
    ...(active.length ? active.map(describeAttendance) : ["None"]),
    `### Left early (${left.length})`,
    ...(left.length ? left.map(describeAttendance) : ["None"]),
    "",
    "## Retro items",
    ...(itemSections.length ? itemSections : ["No retro items recorded."]),
    "",
    "## Action items",
    ...(actionRows.length ? actionRows : ["No action items recorded."]),
    "",
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character).replace(/\n/g, "<br>");
}

function makeConfluenceHtml({
  sprint,
  owner,
  items,
  actionItems,
  durationMinutes,
}: {
  sprint: string;
  owner: string;
  items: ExportItem[];
  actionItems: ActionItem[];
  durationMinutes: number;
}): string {
  const cellStyle = "border:1px solid #C1C7D0;padding:8px 10px;text-align:left;vertical-align:top;";
  const headerStyle = `${cellStyle}background:#F4F5F7;font-weight:600;`;
  const table = (headers: string[], rows: string[][]) => `<table style="border-collapse:collapse;width:100%;margin:8px 0 20px"><thead><tr>${headers.map((header) => `<th style="${headerStyle}">${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map((row) => `<tr>${row.map((cell) => `<td style="${cellStyle}">${cell || "—"}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${headers.length}" style="${cellStyle}">None</td></tr>`}</tbody></table>`;
  const metadata = table(["Sprint", "Owner", "Session date and time", "Planned duration"], [[
    escapeHtml(sprint),
    escapeHtml(owner || "Unassigned"),
    escapeHtml(formatSessionDate(initialSessionDate)),
    escapeHtml(formatTimer(durationMinutes * 60)),
  ]]);
  const attendance = table(["Participant", "Joined", "Arrival", "Attendance"], attendees.map((attendee) => {
    const joinedAt = new Date(attendee.joinedAt);
    const sessionStart = new Date(initialSessionDate);
    const joined = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(joinedAt);
    const minutesLate = Math.max(0, Math.floor((joinedAt.getTime() - sessionStart.getTime()) / 60_000));
    const arrival = minutesLate ? `${minutesLate} min late` : "On time";
    const presence = attendee.presence === "left" && attendee.leftAt
      ? `Left at ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(attendee.leftAt))}`
      : "Participated";
    return [escapeHtml(attendee.name), escapeHtml(joined), escapeHtml(arrival), escapeHtml(presence)];
  }));
  const retroItems = table(["Retro Event", "Ticket", "Retro item", "Created by", "Votes / comments", "Details"], items.map((item) => [
    escapeHtml(item.status),
    escapeHtml(item.key),
    escapeHtml(item.title),
    escapeHtml(item.createdBy),
    escapeHtml(`${item.votes.length} votes / ${item.comments?.length ?? 0} comments`),
    escapeHtml(item.description || ""),
  ]));
  const actions = table(["Done", "Action item", "Owner", "Due date", "Status"], actionItems.map((item) => [
    item.done ? "☑" : "☐",
    escapeHtml(item.title),
    escapeHtml(item.owner || "Unassigned"),
    escapeHtml(item.dueDate || "No due date"),
    item.done ? "Done" : "To do",
  ]));

  return `<h1>${escapeHtml(sprint)} Retrospective</h1><h2>Session details</h2>${metadata}<h2>Attendance (${attendees.length})</h2>${attendance}<h2>Retro items (${items.length})</h2>${retroItems}<h2>Action items (${actionItems.length})</h2>${actions}`;
}

function TimerDialog({
  isOpen,
  remaining,
  running,
  duration,
  onClose,
  onToggle,
  onReset,
  onTopUp,
}: {
  isOpen: boolean;
  remaining: number;
  running: boolean;
  duration: number;
  onClose: () => void;
  onToggle: () => void;
  onReset: () => void;
  onTopUp: (minutes: number) => void;
}) {
  if (!isOpen) return null;

  return (
    <ModalDialog onClose={onClose} width="small" testId="retro-timer-dialog">
      <RetroModalHeader id="timer" hasCloseButton closeButtonLabel="Close timer"><ModalTitle>{remaining === 0 ? "Time’s up — add time?" : "Retro timer"}</ModalTitle></RetroModalHeader>
      <RetroModalBody id="timer">
        <div className="retro-timer-display" role="timer" aria-live="off">{formatTimer(remaining)}</div>
        <div className="retro-timer-elapsed" aria-live="off"><span>Elapsed</span><strong>{formatTimer(Math.max(0, duration * 60 - remaining))}</strong></div>
        <p className="retro-timer-topup-label">{remaining === 0 ? "Add time to continue" : "Add more time"}</p>
        <div className="retro-timer-presets" aria-label="Add time to timer">
          {[5, 10, 15, 30].map((minutes) => (
            <Button key={minutes} appearance="default" onClick={() => onTopUp(minutes)}>+{minutes} min</Button>
          ))}
        </div>
      </RetroModalBody>
      <RetroModalFooter id="timer">
        <RetroModalActions label="Timer actions">
          <Button appearance="default" onClick={onReset}>Reset</Button>
          <Button appearance="primary" onClick={() => { onToggle(); if (!running && remaining > 0) onClose(); }}>{running ? "Pause" : remaining === 0 ? "Restart" : "Start"}</Button>
        </RetroModalActions>
      </RetroModalFooter>
    </ModalDialog>
  );
}

function ExportDialog({
  isOpen,
  items,
  actionItems,
  durationMinutes,
  onClose,
}: {
  isOpen: boolean;
  items: ExportItem[];
  actionItems: ActionItem[];
  durationMinutes: number;
  onClose: () => void;
}) {
  const [sprint, setSprint] = useState("Sprint 24");
  const [owner, setOwner] = useState("Rajan Panchal");
  const [copyMessage, setCopyMessage] = useState("");
  const [showMarkdownSource, setShowMarkdownSource] = useState(false);
  const markdown = makeMarkdown({ sprint, owner, items, actionItems, durationMinutes });
  const confluenceHtml = makeConfluenceHtml({ sprint, owner, items, actionItems, durationMinutes });

  function downloadMarkdown() {
    const file = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${sprint.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "retro"}-retrospective.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyFormattedForConfluence() {
    try {
      if (navigator.clipboard.write && typeof ClipboardItem !== "undefined") {
        const clipboardItem = new ClipboardItem({
          "text/html": new Blob([confluenceHtml], { type: "text/html" }),
          "text/plain": new Blob([markdown], { type: "text/plain" }),
        });
        await navigator.clipboard.write([clipboardItem]);
        setCopyMessage("Formatted tables copied. Paste them into a Confluence page.");
      } else {
        await navigator.clipboard.writeText(markdown);
        setCopyMessage("Rich clipboard is unavailable. Markdown copied as a fallback.");
      }
    } catch {
      setCopyMessage("Clipboard access is unavailable. Download the Markdown file instead.");
    }
  }

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyMessage("Markdown copied.");
    } catch {
      setCopyMessage("Clipboard access is unavailable. Download the Markdown file instead.");
    }
  }

  if (!isOpen) return null;

  return (
    <ModalDialog onClose={onClose} width="large" testId="retro-export-dialog">
      <RetroModalHeader id="export" hasCloseButton closeButtonLabel="Close export"><ModalTitle>Export retrospective</ModalTitle></RetroModalHeader>
      <RetroModalBody id="export">
        <p className="retro-session-intro">Copy a formatted retrospective with real tables into Confluence, or download Markdown. Nothing is sent to Atlassian.</p>
        <div className="retro-export-meta">
          <label>Sprint<Textfield value={sprint} onChange={(event) => setSprint((event.target as HTMLInputElement).value)} /></label>
          <label>Retro owner<Textfield value={owner} onChange={(event) => setOwner((event.target as HTMLInputElement).value)} /></label>
          <div><span>Session</span><strong>{formatSessionDate(initialSessionDate)}</strong></div>
          <div><span>Attendance</span><strong>{attendees.length} invited · {attendees.filter((person) => person.presence === "active").length} participated</strong></div>
          <div><span>Retro items</span><strong>{items.length}</strong></div>
          <div><span>Action items</span><strong>{actionItems.length}</strong></div>
        </div>
        <div className="retro-export-preview-heading">
          <label className="retro-export-preview-label">Confluence preview</label>
          <Button appearance="subtle" spacing="compact" onClick={() => setShowMarkdownSource((visible) => !visible)}>
            {showMarkdownSource ? "Show formatted preview" : "Show Markdown source"}
          </Button>
        </div>
        {showMarkdownSource
          ? <TextArea className="retro-export-preview" value={markdown} isReadOnly minimumRows={9} aria-label="Markdown export preview" />
          : <div className="retro-confluence-preview" dangerouslySetInnerHTML={{ __html: confluenceHtml }} />}
        {copyMessage && <p className="retro-export-message" role="status">{copyMessage}</p>}
      </RetroModalBody>
      <RetroModalFooter id="export">
        <RetroModalActions label="Export actions">
          <Button appearance="default" onClick={onClose}>Cancel</Button>
          <Button appearance="default" iconBefore={<ShareIcon label="" />} onClick={copyFormattedForConfluence}>Copy formatted</Button>
          <Button appearance="default" onClick={copyMarkdown}>Copy Markdown</Button>
          <Button appearance="primary" iconBefore={<DownloadIcon label="" />} onClick={downloadMarkdown}>Download .md</Button>
        </RetroModalActions>
      </RetroModalFooter>
    </ModalDialog>
  );
}

export function RetroTimer() {
  const [, onDurationChange] = useContext(RetroTimerDurationContext);
  const [timerOpen, setTimerOpen] = useState(false);
  const [duration, setDuration] = useState(15);
  const [remaining, setRemaining] = useState(15 * 60);
  const [running, setRunning] = useState(false);
  const [timerReady, setTimerReady] = useState(false);
  const [expiredPromptDismissed, setExpiredPromptDismissed] = useState(false);
  const isRunning = running && remaining > 0;

  useHydrationLayoutEffect(() => {
    try {
      const saved = window.localStorage.getItem(TIMER_STORAGE_KEY);
      if (saved) {
        const timer = JSON.parse(saved) as { duration?: unknown; remaining?: unknown; running?: unknown; endsAt?: unknown };
        const legacyDefault = timer.running !== true && Number(timer.duration) === 45 && Number(timer.remaining) === 45 * 60;
        const savedDuration = legacyDefault ? 15 : ([15, 30, 45, 60].includes(Number(timer.duration)) ? Number(timer.duration) : 15);
        const savedRemaining = legacyDefault ? 15 * 60 : (typeof timer.remaining === "number" && Number.isFinite(timer.remaining) ? Math.max(0, Math.floor(timer.remaining)) : savedDuration * 60);
        const secondsLeft = timer.running === true && typeof timer.endsAt === "number"
          ? Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000))
          : savedRemaining;
        setDuration(savedDuration);
        onDurationChange(savedDuration);
        setRemaining(secondsLeft);
        setRunning(timer.running === true && secondsLeft > 0);
      }
    } catch {
      // Use the default timer when browser storage is unavailable or invalid.
    }
    setTimerReady(true);
  }, [onDurationChange]);

  useEffect(() => {
    if (!timerReady) return;
    try {
      window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
        duration,
        remaining,
        running: isRunning,
        endsAt: isRunning ? Date.now() + remaining * 1000 : null,
      }));
    } catch {
      // The timer remains usable for this session if storage is unavailable.
    }
  }, [duration, remaining, isRunning, timerReady]);

  useEffect(() => {
    if (!isRunning) return undefined;
    const interval = window.setInterval(() => {
      setRemaining((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning, remaining]);

  function resetTimer() {
    setRunning(false);
    setRemaining(duration * 60);
    setTimerOpen(true);
    setExpiredPromptDismissed(true);
  }

  function topUpTimer(minutes: number) {
    const extraSeconds = minutes * 60;
    setDuration((current) => current + minutes);
    onDurationChange(duration + minutes);
    setRemaining((current) => current + extraSeconds);
    if (remaining === 0) {
      setRunning(false);
      setTimerOpen(true);
    }
    setExpiredPromptDismissed(false);
  }

  return (
    <>
      <MenuListItem>
        <Button className="retro-timer-trigger" appearance="default" spacing="default" iconBefore={<ClockIcon label="" />} aria-expanded={timerOpen} aria-label={`Retro timer, ${formatTimer(remaining)} remaining`} onClick={() => setTimerOpen(true)}>
          Timer · {formatTimer(remaining)}
        </Button>
      </MenuListItem>
      <TimerDialog isOpen={timerOpen || (timerReady && remaining === 0 && !expiredPromptDismissed)} remaining={remaining} running={isRunning} duration={duration} onClose={() => { setTimerOpen(false); if (remaining === 0) setExpiredPromptDismissed(true); }} onToggle={() => { if (remaining === 0) { setRemaining(duration * 60); setRunning(true); setTimerOpen(true); setExpiredPromptDismissed(false); } else { setRunning((value) => !value); setExpiredPromptDismissed(false); } }} onReset={resetTimer} onTopUp={topUpTimer} />
    </>
  );
}

export function RetroSessionTools({ items, actionItems, durationMinutes, exportOpen, onExportOpenChange }: { items: ExportItem[]; actionItems: ActionItem[]; durationMinutes: number; exportOpen: boolean; onExportOpenChange: (open: boolean) => void }) {
  return (
    <ExportDialog isOpen={exportOpen} items={items} actionItems={actionItems} durationMinutes={durationMinutes} onClose={() => onExportOpenChange(false)} />
  );
}
