"use client";

import { useActionState, useState } from "react";
import { completeOnboarding } from "@/app/actions/onboarding";
import { FormError } from "@/components/auth-forms";
import { ProfileDetailSection } from "@/components/detail-editor";
import type { ActionState } from "@/app/actions/professional";
import type { NicheRow, OnboardingGoal, SelfDescription } from "@/lib/database.types";

/* ===========================================================================
 * The one onboarding, in three steps.
 *
 * Everyone who signs up sees exactly this — there is no learner version and no
 * professional version. Step 1 asks who you are without letting the answer
 * decide anything, step 2 asks what you want, and step 3 offers the four
 * profile sections — education, work, projects, certifications — as quick-add
 * fields. Step 3 gates nothing: every row in it is optional and every one can
 * be added later in settings.
 *
 * Step 3 renders the same components the settings page does, deliberately.
 * Filling something in during signup and filling it in a month later must not
 * be two different forms with two different ideas of what a job is.
 *
 * Steps 1 and 2 are held in the browser and submit once, at the end. Step 3
 * writes as you go through lib/api, because it is a list of discrete rows
 * rather than one answer, and because it must be revisitable from settings
 * without a second code path.
 * ========================================================================= */

const STEPS = ["About", "Goals", "Your details"] as const;

const DESCRIPTIONS: { value: SelfDescription; label: string; note: string }[] = [
  {
    value: "professional",
    label: "Working professional",
    note: "You do this for a living, whatever stage you are at.",
  },
  {
    value: "student",
    label: "Student",
    note: "Studying, or just out and working out the next step.",
  },
  {
    value: "looking",
    label: "Just looking around for now",
    note: "No plan yet, and that is a fine place to start.",
  },
];

const GOAL_CHOICES: {
  key: string;
  goals: OnboardingGoal[];
  label: string;
  note: string;
}[] = [
  {
    key: "answers",
    goals: ["answers"],
    label: "Get real answers from people in the field",
    note: "Ask the things nobody puts in a job description.",
  },
  {
    key: "share",
    goals: ["share"],
    label: "Share what I know and help others",
    note: "Answer the questions you once had yourself.",
  },
  {
    key: "both",
    goals: ["answers", "share"],
    label: "Both",
    note: "Most people end up here eventually.",
  },
];

/** Fields that are not open yet. Shown so the shape of the thing is honest. */
const COMING_SOON = ["Medicine", "Law", "Design", "Civil service", "Finance", "Academia"];

export type OnboardingDefaults = {
  displayName: string;
  selfDescription: SelfDescription | null;
  goals: OnboardingGoal[];
  nicheIds: string[];
  /** Already applied? Then the LinkedIn field is a status line, not an input. */
  linkedinSubmitted: boolean;
};

export function OnboardingWizard({
  niches,
  defaults,
  profileId,
}: {
  niches: NicheRow[];
  defaults: OnboardingDefaults;
  /**
   * Whose profile step 3 is filling in. Passed rather than looked up so the
   * detail editors are addressing exactly the account this form is for.
   */
  profileId: string;
}) {
  const [step, setStep] = useState(1);

  const [displayName, setDisplayName] = useState(defaults.displayName);
  const [selfDescription, setSelfDescription] = useState<SelfDescription | null>(
    defaults.selfDescription,
  );
  const [linkedin, setLinkedin] = useState("");
  const [linkedinError, setLinkedinError] = useState<string | null>(null);

  const [goals, setGoals] = useState<OnboardingGoal[]>(defaults.goals);
  const [nicheIds, setNicheIds] = useState<string[]>(
    defaults.nicheIds.length > 0 ? defaults.nicheIds : niches.map((niche) => niche.id).slice(0, 1),
  );

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    completeOnboarding,
    {},
  );

  function goToStep2() {
    if (displayName.trim().length < 2) return;
    if (linkedin.trim() && !linkedin.toLowerCase().includes("linkedin.com")) {
      setLinkedinError("That should look like linkedin.com/in/your-name.");
      return;
    }
    setLinkedinError(null);
    setStep(2);
  }

  return (
    <form action={formAction}>
      <ProgressBar step={step} />

      {/* Every value is carried here, so a field that has scrolled off into a
          previous step is still part of the one submission at the end. */}
      <input type="hidden" name="display_name" value={displayName} />
      {selfDescription ? (
        <input type="hidden" name="self_description" value={selfDescription} />
      ) : null}
      <input type="hidden" name="linkedin_url" value={linkedin} />
      {goals.map((goal) => (
        <input key={goal} type="hidden" name="goal" value={goal} />
      ))}
      {nicheIds.map((id) => (
        <input key={id} type="hidden" name="niche_id" value={id} />
      ))}

      {step === 1 ? (
        <StepPanel
          title="First, the basics."
          intro="Two questions and one optional link. None of it locks you into anything."
        >
          <div>
            <label className="field-label" htmlFor="name">
              The name you want shown
            </label>
            <input
              id="name"
              className="field"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
              placeholder="Sujata Maharjan"
            />
          </div>

          <fieldset className="mt-7">
            <legend className="field-label">What best describes you right now?</legend>
            <div className="mt-1 grid gap-2.5">
              {DESCRIPTIONS.map((option) => (
                <ChoiceCard
                  key={option.value}
                  selected={selfDescription === option.value}
                  onClick={() =>
                    setSelfDescription(selfDescription === option.value ? null : option.value)
                  }
                  label={option.label}
                  note={option.note}
                />
              ))}
            </div>
            <p className="text-ink-faint mt-2.5 text-xs leading-relaxed">
              This is just so we know who is here. It does not change what you can do, and you can
              answer questions or ask them whichever one you pick.
            </p>
          </fieldset>

          <div className="border-line mt-7 border-t pt-6">
            <label className="field-label" htmlFor="linkedin">
              Add LinkedIn to get verified
              <span className="text-ink-faint ml-2 font-medium normal-case">Optional</span>
            </label>

            {defaults.linkedinSubmitted ? (
              <p className="card-soft text-ink-soft p-4 text-sm leading-relaxed">
                You have already sent us a LinkedIn URL — it is with a human now. Nothing else to do
                here.
              </p>
            ) : (
              <>
                <input
                  id="linkedin"
                  className="field"
                  value={linkedin}
                  onChange={(event) => setLinkedin(event.target.value)}
                  placeholder="linkedin.com/in/your-name"
                  inputMode="url"
                />
                <p className="text-ink-faint mt-2 text-xs leading-relaxed">
                  Open to everyone, whatever you picked above. A person reads it and decides —
                  usually a day or two. Skipping is completely fine; you can add it later.
                </p>
                {linkedinError ? <FormError message={linkedinError} /> : null}
              </>
            )}
          </div>

          <StepFooter>
            <button
              type="button"
              onClick={goToStep2}
              disabled={displayName.trim().length < 2}
              className="btn btn-primary"
            >
              Continue
            </button>
          </StepFooter>
        </StepPanel>
      ) : null}

      {step === 2 ? (
        <StepPanel
          title="What are you hoping to get here?"
          intro="Pick whichever is closest. It decides what we suggest next, nothing more."
        >
          <div className="grid gap-2.5">
            {GOAL_CHOICES.map((choice) => (
              <ChoiceCard
                key={choice.key}
                selected={sameGoals(goals, choice.goals)}
                onClick={() => setGoals(choice.goals)}
                label={choice.label}
                note={choice.note}
              />
            ))}
          </div>

          <fieldset className="border-line mt-7 border-t pt-6">
            <legend className="field-label">What are you here for?</legend>
            <div className="mt-1 flex flex-wrap gap-2.5">
              {niches.map((niche) => {
                const selected = nicheIds.includes(niche.id);
                return (
                  <button
                    key={niche.id}
                    type="button"
                    onClick={() =>
                      setNicheIds(
                        selected
                          ? nicheIds.filter((id) => id !== niche.id)
                          : [...nicheIds, niche.id],
                      )
                    }
                    aria-pressed={selected}
                    className={`chip text-sm transition-colors ${
                      selected ? "border-line bg-selected text-on-selected" : "hover:border-line"
                    }`}
                  >
                    <span aria-hidden>{niche.emoji}</span>
                    {niche.name}
                  </button>
                );
              })}
              {COMING_SOON.map((label) => (
                <span key={label} className="chip text-ink-faint border-dashed text-sm">
                  {label}
                </span>
              ))}
            </div>
            <p className="text-ink-faint mt-2.5 text-xs">
              Tech is the only one live right now. More niches coming soon.
            </p>
          </fieldset>

          <StepFooter>
            <button type="button" onClick={() => setStep(1)} className="btn btn-paper">
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={goals.length === 0}
              className="btn btn-primary"
            >
              Continue
            </button>
          </StepFooter>
        </StepPanel>
      ) : null}

      {step === 3 ? (
        <StepPanel
          title="Now the part people actually read."
          intro="Your education, work, projects and certifications. All of it is optional, all of it saves as you type, and all of it can be changed later in settings."
        >
          <div className="space-y-7">
            <ProfileDetailSection kind="education" profileId={profileId} compact />
            <div className="border-line border-t pt-7">
              <ProfileDetailSection kind="experience" profileId={profileId} compact />
            </div>
            <div className="border-line border-t pt-7">
              <ProfileDetailSection kind="projects" profileId={profileId} compact />
            </div>
            <div className="border-line border-t pt-7">
              <ProfileDetailSection kind="certifications" profileId={profileId} compact />
            </div>
          </div>

          <StepFooter>
            <button type="button" onClick={() => setStep(2)} className="btn btn-paper">
              Back
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? "One moment…" : "Finish"}
            </button>
          </StepFooter>

          <p className="text-ink-faint mt-4 text-xs leading-relaxed">
            Leaving this whole step empty is fine — nothing here gates anything, and your profile
            will tell you it is empty when you want to come back to it.
          </p>
        </StepPanel>
      ) : null}

      {state.error ? <FormError message={state.error} /> : null}
    </form>
  );
}

/* --- Pieces -------------------------------------------------------------- */

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div
        className="flex gap-2"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={step}
        aria-valuetext={`Step ${step} of ${STEPS.length}: ${STEPS[step - 1]}`}
      >
        {STEPS.map((label, index) => (
          <span
            key={label}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index < step ? "bg-crimson" : "bg-ink/15"
            }`}
          />
        ))}
      </div>
      <p className="eyebrow mt-3">
        Step {step} of {STEPS.length} · {STEPS[step - 1]}
      </p>
    </div>
  );
}

function StepPanel({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-3xl sm:text-4xl">{title}</h1>
      <p className="text-ink-soft mt-3 leading-relaxed">{intro}</p>
      <div className="card mt-7 p-6 sm:p-7">{children}</div>
    </div>
  );
}

function StepFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-line mt-7 flex flex-wrap items-center gap-3 border-t pt-6">
      {children}
    </div>
  );
}

function ChoiceCard({
  selected,
  onClick,
  label,
  note,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  note: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-xl border-2 p-4 text-left transition-all ${
        selected
          ? "border-crimson bg-crimson-wash shadow-[3px_3px_0_0_var(--color-crimson)]"
          : "border-line bg-snow hover:border-line"
      }`}
    >
      <span className="font-display block leading-tight font-semibold">{label}</span>
      <span className="text-ink-soft mt-1 block text-sm leading-relaxed">{note}</span>
    </button>
  );
}

function sameGoals(a: OnboardingGoal[], b: OnboardingGoal[]) {
  return a.length === b.length && b.every((goal) => a.includes(goal));
}
