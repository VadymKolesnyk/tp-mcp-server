import { z } from "zod";

export const CardKindEnum = z.enum(["UserStory", "Bug", "Feature", "Task", "Epic"]);
export type CardKind = z.infer<typeof CardKindEnum>;

export const CustomFieldInput = z.object({
  name: z
    .string()
    .min(1)
    .describe("Custom field name exactly as shown in TP, e.g. 'Release Notes'"),
  value: z
    .union([z.string(), z.number(), z.boolean(), z.null()])
    .describe(
      "Value to set. For RichText/Text fields pass an HTML or plain string; for Number fields pass a number; for DropDown pass the option string; pass null to clear."
    ),
});
export type CustomFieldValue = z.infer<typeof CustomFieldInput>;

export const TpQueryInput = {
  entityType: z.string().describe("TP entity name, e.g. UserStory, Bug, Project, Release"),
  where: z.string().optional().describe("TP where-clause, e.g. \"EntityState.Name eq 'Open'\""),
  include: z.array(z.string()).optional().describe("Fields/collections to include, e.g. ['Id','Name','Project']"),
  take: z.number().int().positive().max(1000).optional().default(25),
  skip: z.number().int().nonnegative().optional(),
  orderBy: z.string().optional(),
  orderByDesc: z.string().optional(),
};

export const TpGetCardInput = {
  id: z.number().int().positive().describe("Card numeric ID"),
  kind: CardKindEnum.optional().describe("Optional entity kind hint. If omitted, looks up via /General"),
  includeImages: z.boolean().optional().default(true).describe("Download inline images from description"),
  includeComments: z.boolean().optional().default(false),
  includeRawHtml: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Append the raw HTML of the description (and comments, when includeComments is true) so the caller can preserve existing formatting before tp_update_card. Defaults to false (plain text only)."
    ),
};

export const TpSearchCardsInput = {
  kind: CardKindEnum,
  where: z.string().optional(),
  search: z.string().optional().describe("Free-text search across Name (translates to where Name contains)"),
  projectId: z.number().int().positive().optional(),
  releaseId: z.number().int().positive().optional(),
  stateName: z.string().optional().describe("EntityState.Name filter, e.g. 'Open', 'Done'"),
  assignedUserId: z.number().int().positive().optional(),
  take: z.number().int().positive().max(200).optional().default(25),
  skip: z.number().int().nonnegative().optional(),
};

export const TpCreateCardInput = {
  kind: CardKindEnum,
  name: z.string().min(1),
  description: z.string().optional(),
  projectId: z.number().int().positive(),
  teamId: z.number().int().positive().optional(),
  assignedUserId: z.number().int().positive().optional(),
  featureId: z.number().int().positive().optional(),
  releaseId: z.number().int().positive().optional(),
  tags: z.string().optional().describe("Comma-separated tag list"),
  customFields: z
    .array(CustomFieldInput)
    .optional()
    .describe(
      "Custom fields to set on the new card, e.g. [{name:'Release Notes', value:'...'}]. Names must match TP exactly."
    ),
};

export const TpUpdateCardInput = {
  kind: CardKindEnum,
  id: z.number().int().positive(),
  name: z.string().optional(),
  description: z.string().optional(),
  stateId: z.number().int().positive().optional(),
  stateName: z.string().optional().describe("Resolves to EntityState by name"),
  assignedUserId: z.number().int().positive().optional(),
  releaseId: z.number().int().positive().optional(),
  tags: z.string().optional(),
  customFields: z
    .array(CustomFieldInput)
    .optional()
    .describe(
      "Custom fields to set, e.g. [{name:'Release Notes', value:'<p>...</p>'}]. Names must match TP exactly (case-sensitive); RichText fields accept HTML. Use tp_get_card / tp_query with include ['CustomFields'] to see available field names."
    ),
};

export const TpListCommentsInput = {
  entityId: z.number().int().positive(),
  includeImages: z.boolean().optional().default(true),
  take: z.number().int().positive().max(100).optional().default(25),
};

export const TpAddCommentInput = {
  entityId: z.number().int().positive(),
  description: z.string().min(1).describe("Comment body. HTML is accepted."),
};

export const TpListAttachmentsInput = {
  entityId: z.number().int().positive(),
};

export const TpGetAttachmentInput = {
  attachmentId: z.number().int().positive(),
};

export const TpCurrentReleasesInput = {
  projectId: z.number().int().positive().optional(),
  ownerId: z.number().int().positive().optional().describe("Defaults to TP_OWNER_ID env"),
  teamId: z.number().int().positive().optional().describe("Defaults to TP_TEAM_ID env"),
};

export const TpReleaseItemsInput = {
  releaseId: z.number().int().positive(),
  kind: z.enum(["UserStory", "Bug", "Feature"]).optional().default("UserStory"),
  stateName: z.string().optional(),
  take: z.number().int().positive().max(500).optional().default(100),
};

export const TpMetaListInput = {
  search: z.string().optional(),
  take: z.number().int().positive().max(200).optional().default(50),
};
