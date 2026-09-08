"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";
import {
  getCertifications,
  getEducation,
  getProjects,
  getWorkExperience,
  saveCertifications,
  saveEducation,
  saveProjects,
  saveWorkExperience,
} from "@/lib/api";
import { useAsync } from "@/lib/api/use-async";
import type { ProfileEntry } from "@/lib/feed-mock";

/* ===========================================================================
 * Add, edit and remove the rows that make up a profile: education, work,
 * projects, certifications.
 *
 * One component for all four, because they are the same shape with different
 * words on the labels — and because onboarding and settings must never drift
 * into two different ideas of what "add a job" means. Onboarding renders these
 * to get a new account started; settings renders the same ones forever after.
 *
 * Every field is optional except the first. Somebody filling this in at signup
 * should be able to put down "QA Tester" and move on.
 * ========================================================================= */

export type DetailKind = "education" | "experience" | "projects" | "certifications";

type FieldName = "title" | "organization" | "dates" | "description" | "skills";

type Spec = {
  heading: string;
  addLabel: string;
  blurb: string;
  fields: {
    name: FieldName;
    label: string;
    placeholder: string;
    multiline?: boolean;
  }[];
};

const SPECS: Record<DetailKind, Spec> = {
  education: {
    heading: "Education",
    addLabel: "Add education",
    blurb: "Where you studied, if you did. Plenty of people here didn't.",
    fields: [
      {
        name: "title",
        label: "Qualification",
        placeholder: "Bachelor's in Business Studies",
      },
      {
        name: "organization",
        label: "Institution",
        placeholder: "Tribhuvan University",
      },
      { name: "dates", label: "Years", placeholder: "2012–2016" },
    ],
  },
  experience: {
    heading: "Work experience",
    addLabel: "Add a role",
    blurb: "What you have done, most recent first.",
    fields: [
      { name: "title", label: "Role", placeholder: "Engineering Lead" },
      {
        name: "organization",
        label: "Organisation",
        placeholder: "Cedar Gate",
      },
      { name: "dates", label: "Years", placeholder: "2021–Present" },
      {
        name: "description",
        label: "What you did",
        placeholder: "One line is plenty.",
        multiline: true,
      },
    ],
  },
  projects: {
    heading: "Projects",
    addLabel: "Add a project",
    blurb: "Things you built. The write-up matters more than the pixels.",
    fields: [
      {
        name: "title",
        label: "Project",
        placeholder: "Internal analytics dashboard",
      },
      { name: "organization", label: "Where", placeholder: "Cedar Gate" },
      { name: "dates", label: "When", placeholder: "2021" },
      {
        name: "description",
        label: "What it was",
        placeholder: "What you built and who used it.",
        multiline: true,
      },
      {
        name: "skills",
        label: "Built with",
        placeholder: "React, TypeScript, PostgreSQL",
      },
    ],
  },
  certifications: {
    heading: "Certifications",
    addLabel: "Add a certification",
    blurb: "Only if you have them. Nobody here is counting.",
    fields: [
      {
        name: "title",
        label: "Certification",
        placeholder: "AWS Certified Solutions Architect",
      },
      {
        name: "organization",
        label: "Issuer",
        placeholder: "Amazon Web Services",
      },
      { name: "dates", label: "Year", placeholder: "2023" },
    ],
  },
};

/* ---------------------------------------------------------------------------
 * The wired-up version.
 *
 * Reads its section through lib/api and writes it straight back on every
 * change. Both callers use this one — settings and onboarding step 3 — so a
 * job added during signup and a job added a month later travel exactly the
 * same path.
 *
 * Saving as you go, rather than behind a Save button, is deliberate: these are
 * discrete rows, and losing a typed-out role to a button nobody pressed is the
 * worst outcome for a form most people did not want to fill in anyway.
 * ------------------------------------------------------------------------- */

const READERS: Record<DetailKind, (id: string) => Promise<ProfileEntry[]>> = {
  education: getEducation,
  experience: getWorkExperience,
  projects: getProjects,
  certifications: getCertifications,
};

const WRITERS: Record<DetailKind, (id: string, rows: ProfileEntry[]) => Promise<void>> = {
  education: saveEducation,
  experience: saveWorkExperience,
  projects: saveProjects,
  certifications: saveCertifications,
};

export function ProfileDetailSection({
  kind,
  profileId,
  compact = false,
}: {
  kind: DetailKind;
  profileId: string;
  compact?: boolean;
}) {
  const { toast } = useToast();
  const { data, setData } = useAsync<ProfileEntry[]>(
    () => READERS[kind](profileId),
    [],
    [kind, profileId],
  );

  return (
    <DetailEditor
      kind={kind}
      entries={data}
      compact={compact}
      onChange={(next) => {
        setData(next);
        void WRITERS[kind](profileId, next).then(() => toast("Saved"));
      }}
    />
  );
}

export function DetailEditor({
  kind,
  entries,
  onChange,
  compact = false,
}: {
  kind: DetailKind;
  entries: ProfileEntry[];
  onChange: (entries: ProfileEntry[]) => void;
  /** Onboarding uses the tighter version; settings gets the full headings. */
  compact?: boolean;
}) {
  const spec = SPECS[kind];
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  function save(entry: ProfileEntry, index: number | null) {
    const next = [...entries];
    if (index === null) next.push(entry);
    else next[index] = entry;
    onChange(next);
    setEditing(null);
    setAdding(false);
  }

  return (
    <section className={compact ? "" : "card p-5"}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={compact ? "font-display text-lg font-semibold" : "eyebrow"}>
          {spec.heading}
        </h3>
        {entries.length > 0 ? (
          <span className="text-ink-faint text-xs">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        ) : null}
      </div>

      {entries.length === 0 && !adding ? (
        <p className="text-ink-soft mt-1.5 text-sm">{spec.blurb}</p>
      ) : null}

      {entries.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {entries.map((entry, index) =>
            editing === index ? (
              <li key={`${entry.title}-${index}`}>
                <EntryForm
                  spec={spec}
                  initial={entry}
                  onSave={(next) => save(next, index)}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li
                key={`${entry.title}-${index}`}
                className="border-line flex items-start gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{entry.title}</p>
                  {entry.organization || entry.dates ? (
                    <p className="text-ink-soft mt-0.5 text-xs">
                      {entry.organization}
                      {entry.organization && entry.dates ? " · " : null}
                      {entry.dates}
                    </p>
                  ) : null}
                  {entry.skills?.length ? (
                    <p className="text-ink-faint mt-1 text-xs">{entry.skills.join(", ")}</p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setEditing(index);
                  }}
                  className="text-ink-soft hover:text-ink text-xs font-semibold transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onChange(entries.filter((_, i) => i !== index))}
                  className="text-ink-faint hover:text-crimson text-xs font-semibold transition-colors"
                >
                  Remove
                </button>
              </li>
            ),
          )}
        </ul>
      ) : null}

      {adding ? (
        <div className="mt-3">
          <EntryForm
            spec={spec}
            onSave={(next) => save(next, null)}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setAdding(true);
          }}
          className="btn btn-paper btn-sm mt-3"
        >
          <PlusGlyph />
          {spec.addLabel}
        </button>
      )}
    </section>
  );
}

/**
 * The fields for one row.
 *
 * Deliberately NOT a <form> element. Onboarding step 3 renders these inside
 * the wizard's own form, and a form inside a form is invalid HTML: the Save
 * button ends up submitting the outer one, which in this case finished
 * onboarding and navigated away mid-typing. Enter is wired up by hand instead,
 * so the keyboard behaviour survives the change.
 */
function EntryForm({
  spec,
  initial,
  onSave,
  onCancel,
}: {
  spec: Spec;
  initial?: ProfileEntry;
  onSave: (entry: ProfileEntry) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<FieldName, string>>({
    title: initial?.title ?? "",
    organization: initial?.organization ?? "",
    dates: initial?.dates ?? "",
    description: initial?.description ?? "",
    skills: initial?.skills?.join(", ") ?? "",
  });

  const titleField = spec.fields[0];
  const canSave = values.title.trim().length > 0;

  function save() {
    if (!canSave) return;

    const skills = values.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    onSave({
      title: values.title.trim(),
      organization: values.organization.trim() || undefined,
      dates: values.dates.trim() || undefined,
      description: values.description.trim() || undefined,
      skills: skills.length > 0 ? skills : undefined,
      thumbnail: initial?.thumbnail,
    });
  }

  /* Enter saves from any single-line field, the way a form would have. Escape
     backs out. The description box keeps Enter for line breaks. */
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key !== "Enter") return;
    if ((event.target as HTMLElement).tagName === "TEXTAREA") return;
    event.preventDefault();
    save();
  }

  return (
    <div onKeyDown={onKeyDown} className="border-line rounded-lg border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {spec.fields.map((field) => (
          <div
            key={field.name}
            className={field.multiline || field.name === titleField.name ? "sm:col-span-2" : ""}
          >
            <label className="field-label" htmlFor={`${spec.heading}-${field.name}`}>
              {field.label}
              {field.name === titleField.name ? null : (
                <span className="text-ink-faint ml-1.5 font-medium normal-case">optional</span>
              )}
            </label>
            {field.multiline ? (
              <textarea
                id={`${spec.heading}-${field.name}`}
                className="field min-h-20 resize-y text-sm"
                placeholder={field.placeholder}
                value={values[field.name]}
                onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
              />
            ) : (
              <input
                id={`${spec.heading}-${field.name}`}
                className="field text-sm"
                placeholder={field.placeholder}
                value={values[field.name]}
                onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={save} disabled={!canSave} className="btn btn-primary btn-sm">
          Save
        </button>
        <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
