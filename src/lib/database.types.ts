/**
 * Hand-maintained mirror of the SQL in supabase/migrations, in the same shape
 * the Supabase CLI emits. Once the project is linked you can replace this file
 * wholesale with:
 *
 *   npx supabase gen types typescript --linked > src/lib/database.types.ts
 *
 * Keep the exported aliases at the bottom if you do — the app imports those.
 */

/* ---------------------------------------------------------------------------
 * Onboarding vocabulary. These are text columns with check constraints rather
 * than pg enums — adding an option later should not need a type migration.
 * ------------------------------------------------------------------------- */

/** "What best describes you right now?" Descriptive; nothing branches on it. */
export type SelfDescription = "professional" | "student" | "looking";

/** "What are you hoping to get here?" Both = both entries present. */
export type OnboardingGoal = "answers" | "share";

/** Which prompt step 3 offered, and which one they answered. */
export type FirstActionKind = "question" | "intro";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      niches: {
        Row: {
          id: string;
          slug: string;
          name: string;
          tagline: string | null;
          description: string | null;
          emoji: string | null;
          accent: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          tagline?: string | null;
          description?: string | null;
          emoji?: string | null;
          accent?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          slug?: string;
          name?: string;
          tagline?: string | null;
          description?: string | null;
          emoji?: string | null;
          accent?: string;
          is_active?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };

      users: {
        Row: {
          id: string;
          email: string;
          role: Database["public"]["Enums"]["user_role"];
          full_name: string | null;
          avatar_url: string | null;
          onboarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: Database["public"]["Enums"]["user_role"];
          full_name?: string | null;
          avatar_url?: string | null;
          onboarded?: boolean;
        };
        // Only these three are grantable to the `authenticated` role — see
        // supabase/migrations/*_rls.sql. Role changes go through the RPCs.
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
          onboarded?: boolean;
        };
        Relationships: [];
      };

      user_niches: {
        Row: {
          user_id: string;
          niche_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          niche_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          niche_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_niches_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_niches_niche_id_fkey";
            columns: ["niche_id"];
            isOneToOne: false;
            referencedRelation: "niches";
            referencedColumns: ["id"];
          },
        ];
      };

      onboarding_responses: {
        Row: {
          user_id: string;
          self_description: SelfDescription | null;
          goals: OnboardingGoal[];
          first_action_kind: FirstActionKind | null;
          first_action_text: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          self_description?: SelfDescription | null;
          goals?: OnboardingGoal[];
          first_action_kind?: FirstActionKind | null;
          first_action_text?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          self_description?: SelfDescription | null;
          goals?: OnboardingGoal[];
          first_action_kind?: FirstActionKind | null;
          first_action_text?: string | null;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_responses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      professional_profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          headline: string | null;
          bio: string | null;
          linkedin_url: string;
          niche_id: string | null;
          verification_status: Database["public"]["Enums"]["verification_status"];
          founding_member: boolean;
          links: Json;
          reviewed_at: string | null;
          reviewed_by: string | null;
          review_note: string | null;
          created_at: string;
          updated_at: string;
        };
        // verification_status / founding_member / reviewed_* are intentionally
        // absent: no client role has the column grant for them.
        Insert: {
          user_id: string;
          display_name: string;
          linkedin_url: string;
          headline?: string | null;
          bio?: string | null;
          niche_id?: string | null;
          links?: Json;
        };
        Update: {
          display_name?: string;
          headline?: string | null;
          bio?: string | null;
          linkedin_url?: string;
          niche_id?: string | null;
          links?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "professional_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "professional_profiles_niche_id_fkey";
            columns: ["niche_id"];
            isOneToOne: false;
            referencedRelation: "niches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "professional_profiles_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      spaces: {
        Row: {
          id: string;
          professional_id: string;
          slug: string;
          headline: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          professional_id: string;
          slug: string;
          headline?: string | null;
        };
        Update: {
          headline?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "spaces_professional_id_fkey";
            columns: ["professional_id"];
            isOneToOne: true;
            referencedRelation: "professional_profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      posts: {
        Row: {
          id: string;
          space_id: string;
          author_id: string;
          content: string;
          kind: string;
          post_type: Database["public"]["Enums"]["post_type"];
          hidden_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          space_id: string;
          author_id: string;
          content: string;
          kind?: string;
          post_type?: Database["public"]["Enums"]["post_type"];
          hidden_at?: string | null;
        };
        Update: {
          content?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          post_id: string;
          author_id: string;
          content: string;
        };
        Update: {
          content?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      flags: {
        Row: {
          id: string;
          reporter_id: string;
          post_id: string | null;
          comment_id: string | null;
          reason: string | null;
          status: Database["public"]["Enums"]["flag_status"];
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_note: string | null;
          created_at: string;
        };
        Insert: {
          reporter_id: string;
          post_id?: string | null;
          comment_id?: string | null;
          reason?: string | null;
        };
        Update: { reason?: string | null };
        Relationships: [
          {
            foreignKeyName: "flags_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      dhog_awards: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          weight: number;
          note: string | null;
          awarded_by: string | null;
          created_at: string;
        };
        /** Admin-only, through the award_dhog() RPC. No client insert grant. */
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "dhog_awards_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      reactions: {
        Row: {
          id: string;
          user_id: string;
          post_id: string | null;
          comment_id: string | null;
          type: Database["public"]["Enums"]["reaction_type"];
          receiver_id: string | null;
          /**
           * Resolved by a trigger at insert. NOT selectable by anon or
           * authenticated — the grant names columns and leaves these two out,
           * so the arithmetic behind a total stays unreadable. Present here
           * because this file mirrors the table, not the grant.
           */
          giver_weight_tier: Database["public"]["Enums"]["dhog_giver_tier"] | null;
          weight: number;
          created_at: string;
        };
        /** Weight columns are absent on purpose: no client may set them. */
        Insert: {
          user_id: string;
          post_id?: string | null;
          comment_id?: string | null;
          type?: Database["public"]["Enums"]["reaction_type"];
        };
        Update: {
          type?: Database["public"]["Enums"]["reaction_type"];
        };
        Relationships: [
          {
            foreignKeyName: "reactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reactions_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reactions_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
        ];
      };

      follows: {
        Row: {
          follower_id: string;
          professional_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          professional_id: string;
          created_at?: string;
        };
        Update: {
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_professional_id_fkey";
            columns: ["professional_id"];
            isOneToOne: false;
            referencedRelation: "professional_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };

    /**
     * Both are plain views, computed on read — no materialised views and no
     * caching until there is traffic that needs it. They aggregate columns the
     * caller cannot select, which works because the views are not
     * security_invoker: totals are public, the arithmetic is not.
     */
    Views: {
      /** Never decays. The credential on a profile. */
      dhog_lifetime: {
        Row: { user_id: string | null; dhog: number | null };
        Relationships: [];
      };
      /** Rolling seven days. The only thing the leaderboard reads. */
      dhog_weekly: {
        Row: { user_id: string | null; dhog: number | null };
        Relationships: [];
      };
      dhog_ledger: {
        Row: { user_id: string | null; amount: number | null; created_at: string | null };
        Relationships: [];
      };
    };

    Functions: {
      is_admin: {
        Args: { p_uid?: string };
        Returns: boolean;
      };
      approve_professional: {
        Args: { p_profile_id: string };
        Returns: Database["public"]["Tables"]["professional_profiles"]["Row"];
      };
      reject_professional: {
        Args: { p_profile_id: string; p_note?: string | null };
        Returns: Database["public"]["Tables"]["professional_profiles"]["Row"];
      };
      slugify: { Args: { v: string }; Returns: string };
      unique_space_slug: { Args: { p_base: string }; Returns: string };
      founding_cohort_size: { Args: Record<PropertyKey, never>; Returns: number };
    };

    Enums: {
      user_role: "student" | "professional" | "admin";
      verification_status: "pending" | "verified" | "rejected";
      reaction_type: "helpful";
      post_type: "question" | "career_story" | "opportunity" | "discussion";
      dhog_giver_tier:
        | "verified_same_niche"
        | "verified_other_niche"
        | "unverified"
        | "no_weight";
      flag_status: "open" | "actioned" | "dismissed";
    };

    CompositeTypes: { [_ in never]: never };
  };
};

/* ---------------------------------------------------------------------------
 * Aliases the app imports.
 * ------------------------------------------------------------------------- */

type Tables = Database["public"]["Tables"];

export type UserRole = Database["public"]["Enums"]["user_role"];
export type VerificationStatus = Database["public"]["Enums"]["verification_status"];
export type ReactionType = Database["public"]["Enums"]["reaction_type"];
export type PostKind = "post" | "intro";

export type NicheRow = Tables["niches"]["Row"];
export type UserRow = Tables["users"]["Row"];
export type ProfessionalProfileRow = Tables["professional_profiles"]["Row"];
export type SpaceRow = Tables["spaces"]["Row"];
export type PostRow = Tables["posts"]["Row"];
export type CommentRow = Tables["comments"]["Row"];
export type ReactionRow = Tables["reactions"]["Row"];
export type FollowRow = Tables["follows"]["Row"];
export type UserNicheRow = Tables["user_niches"]["Row"];
export type OnboardingResponseRow = Tables["onboarding_responses"]["Row"];
export type FlagRow = Tables["flags"]["Row"];
export type DhogAwardRow = Tables["dhog_awards"]["Row"];

export type DbPostType = Database["public"]["Enums"]["post_type"];
export type DhogGiverTier = Database["public"]["Enums"]["dhog_giver_tier"];
export type FlagStatus = Database["public"]["Enums"]["flag_status"];

/** What the anon/authenticated roles are actually allowed to select. */
export type PublicUser = Omit<UserRow, "email">;

/** Shape of professional_profiles.links */
export type ProfileLink = { label: string; url: string };

/** Narrow the jsonb `links` column into something renderable. */
export function parseProfileLinks(value: Json | null | undefined): ProfileLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const { label, url } = entry as Record<string, unknown>;
    if (typeof url !== "string" || !url) return [];
    return [{ label: typeof label === "string" && label ? label : url, url }];
  });
}
