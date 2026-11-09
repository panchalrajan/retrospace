"use client";

import { useState } from "react";
import AvatarGroup, { type AvatarProps } from "@atlaskit/avatar-group";
import Lozenge from "@atlaskit/lozenge";
import { Drawer } from "@atlaskit/drawer/drawer";
import { DrawerCloseButton } from "@atlaskit/drawer/drawer-close-button";
import { DrawerContent } from "@atlaskit/drawer/drawer-content";
import { MenuListItem } from "@atlaskit/navigation-system/top-nav-items";
import { UserAvatar } from "@/shared/user-avatar";
import mockAttendance from "@/features/navigation/mock-retro-attendance.json";

const attendees = mockAttendance.attendees;
const activeAttendees = attendees.filter((attendee) => attendee.presence === "active");
const leftAttendees = attendees.filter((attendee) => attendee.presence === "left");
const participantNames = attendees.map((attendee) => attendee.name);

const participantAvatars = attendees.map(({ name }) => ({
  key: name,
  name,
  children: <UserAvatar name={name} />,
}));

function formatJoinedAt(joinedAt: string): string {
  const joinedTime = new Date(joinedAt);
  const timeLabel = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(joinedTime);
  return `Joined ${timeLabel}`;
}

function ParticipantAvatar({ children }: AvatarProps) {
  return <>{children}</>;
}

export function RetroParticipantGroup() {
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);

  return (
    <MenuListItem>
      <span
        className="retro-nav-participant-group"
        role="group"
        tabIndex={0}
        aria-label={`Company attendance, ${participantNames.length} people`}
        onClick={() => setIsAttendanceOpen(true)}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            setIsAttendanceOpen(true);
          }
        }}
      >
        <Lozenge appearance="default">
          <AvatarGroup
            appearance="stack"
            avatar={ParticipantAvatar}
            borderColor="color-mix(in srgb, var(--ds-surface) 88%, transparent)"
            data={participantAvatars}
            isTooltipDisabled
            label="Retro participants"
            maxCount={4}
            onAvatarClick={() => setIsAttendanceOpen(true)}
            onMoreClick={() => setIsAttendanceOpen(true)}
            size="small"
            testId="retro-participant-group"
          />
        </Lozenge>
      </span>

      <Drawer
        isOpen={isAttendanceOpen}
        enterFrom="left"
        width="medium"
        label="Company attendance"
        onClose={() => setIsAttendanceOpen(false)}
        testId="company-attendance-drawer"
      >
        <DrawerContent>
          <section className="company-attendance">
            <header className="company-attendance-header">
              <DrawerCloseButton label="Close attendance" />
              <div>
                <h2>Company attendance</h2>
                <p>{participantNames.length} people invited to this retro</p>
              </div>
            </header>
            <AttendanceSection title="Active users" attendees={activeAttendees} />
            <AttendanceSection title="Left the retro" attendees={leftAttendees} />
          </section>
        </DrawerContent>
      </Drawer>
    </MenuListItem>
  );
}

function AttendanceSection({
  title,
  attendees: sectionAttendees,
}: {
  title: string;
  attendees: typeof attendees;
}) {
  if (!sectionAttendees.length) return null;

  return (
    <section className="company-attendance-section" aria-label={title}>
      <h3>{title}<span>{sectionAttendees.length}</span></h3>
      <ul className="company-attendance-list">
        {sectionAttendees.map((attendee) => (
          <li key={attendee.name} className="company-attendance-person">
            <UserAvatar name={attendee.name} />
            <span className="company-attendance-person-details">
              <span className="company-attendance-name">{attendee.name}</span>
              <time className="company-attendance-time" dateTime={attendee.joinedAt}>
                {formatJoinedAt(attendee.joinedAt)}
              </time>
            </span>
            <Lozenge appearance={attendee.presence === "active" ? "success" : "default"}>
              {attendee.presence === "active" ? "Active" : "Left"}
            </Lozenge>
          </li>
        ))}
      </ul>
    </section>
  );
}
