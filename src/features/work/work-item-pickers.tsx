"use client";
import { useId, useState } from "react";
import Button from "@atlaskit/button/button";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import Popup from "@atlaskit/popup";
import Calendar from "@atlaskit/calendar";
import DateLabelDropdownTrigger from "@atlaskit/date-label/date-label-dropdown-trigger";
import { PopupSelect } from "@atlaskit/select/popup-select";
import { UserAvatar } from "@/shared/user-avatar";
export type AssigneeOption = {
  label: string;
  value: string;
  email?: string;
  custom?: boolean;
};

function getTodayISODate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function OwnerPicker({
  value,
  onChange,
  options,
  currentUser,
}: {
  value: string;
  onChange: (value: string) => void;
  options: AssigneeOption[];
  currentUser: string;
}) {
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const inputId = useId();
  const typedName = assigneeQuery.trim();
  const hasExactMatch = options.some(
    (option) => option.label.trim().toLocaleLowerCase() === typedName.toLocaleLowerCase(),
  );
  const assigneeOptions: AssigneeOption[] = typedName && !hasExactMatch
    ? [...options, { label: typedName, value: typedName, custom: true }]
    : options;
  const selectedAssignee = options.find((option) => option.value === value) ?? {
    label: value,
    value,
  };
  return (
    <div className="action-owner-picker">
      <PopupSelect<AssigneeOption, false>
        inputId={inputId}
        label="Assignee"
        onKeyDown={(event) => {
          if (event.key === "Escape") event.stopPropagation();
        }}
        searchThreshold={0}
        minMenuWidth={300}
        maxMenuWidth={360}
        placeholder="Search people"
        options={assigneeOptions}
        value={selectedAssignee}
        inputValue={assigneeQuery}
        onInputChange={(value, meta) => {
          if (meta.action === "input-change") setAssigneeQuery(value);
          return value;
        }}
        onChange={(option) => {
          if (option) onChange(option.value);
          setAssigneeQuery("");
        }}
        formatOptionLabel={(option, meta) => (
          <span
            className={`action-assignee-option${meta.context === "value" ? " is-selected" : ""}`}
          >
            <UserAvatar name={option.label} />
            <span className="action-assignee-copy">
              <strong>
                {option.label}
                {option.label === currentUser && <small> (Assign to me)</small>}
              </strong>
              {meta.context === "menu" && option.email && (
                <span>{option.email}</span>
              )}
              {meta.context === "menu" && option.custom && (
                <span>Create new assignee</span>
              )}
            </span>
          </span>
        )}
        isClearable={false}
        menuPlacement="auto"
        target={({ ref, onKeyDown, isOpen, ...triggerProps }) => (
          <Button
            {...triggerProps}
            ref={ref}
            onKeyDown={onKeyDown}
            className="action-assignee-trigger"
            isSelected={isOpen}
            appearance="default"
            spacing="compact"
            iconAfter={<ChevronDownIcon label="" size="small" />}
            aria-label={`Assignee: ${selectedAssignee.label}`}
          >
            <span className="action-assignee-option">
              <UserAvatar name={selectedAssignee.label} />
              <span>{selectedAssignee.label}</span>
            </span>
          </Button>
        )}
      />
    </div>
  );
}
export function DueDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const today = getTodayISODate();
  const appearance =
    value && value < today
      ? "danger"
      : value === today
        ? "warning"
        : "neutral";
  return (
    <div className="action-item-date-picker">
      <Popup
        isOpen={open}
        zIndex={700}
        onClose={() => setOpen(false)}
        placement="bottom-start"
        role="dialog"
        label="Choose due date"
        trigger={({ ref, ...triggerProps }) => (
          <span className="action-date-trigger-anchor" ref={ref}>
            <DateLabelDropdownTrigger
              {...triggerProps}
              appearance={appearance}
              label={
                value
                  ? new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                    }).format(new Date(`${value}T12:00:00`))
                  : "Due date"
              }
              isSelected={open}
              aria-haspopup="dialog"
              aria-label={value ? `Due date: ${value}` : "Choose due date"}
              onClick={() => setOpen((open) => !open)}
            />
          </span>
        )}
        content={() => (
          <div className="action-date-calendar">
            <Calendar
              label="Choose due date"
              minDate={today}
              defaultYear={value ? Number(value.slice(0, 4)) : undefined}
              defaultMonth={value ? Number(value.slice(5, 7)) : undefined}
              defaultDay={value ? Number(value.slice(8, 10)) : undefined}
              selected={value ? [value] : []}
              onSelect={({ iso }) => {
                onChange(iso);
                setOpen(false);
              }}
            />
          </div>
        )}
      />
    </div>
  );
}
