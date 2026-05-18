import type { CardKind } from "../schemas.js";

const PLURAL: Record<string, string> = {
  UserStory: "UserStories",
  Bug: "Bugs",
  Feature: "Features",
  Task: "Tasks",
  Epic: "Epics",
  Project: "Projects",
  Team: "Teams",
  Release: "Releases",
  User: "Users",
  Attachment: "Attachments",
  Comment: "Comments",
  General: "Generals",
  EntityState: "EntityStates",
};

export function pluralPath(kind: CardKind | string): string {
  return PLURAL[kind] ?? `${kind}s`;
}
