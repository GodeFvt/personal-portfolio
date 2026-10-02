import type { z } from "zod";
import type {
  saveContentDraftSchema,
  saveNavigationDraftSchema,
  publishNavigationSchema,
} from "../schemas/admin-content";
import type {
  createInvitationSchema,
  createRoleSchema,
  updateRoleSchema,
  updateAdminUserSchema,
  providerDraftSchema,
  providerActivationSchema,
  providerDisableSchema,
  oauthStartSchema,
} from "../schemas/admin-security";
import type {
  startMediaUploadSchema,
  completeMediaUploadSchema,
  updateMediaSchema,
} from "../schemas/media";

type ContentDraft = z.input<typeof saveContentDraftSchema>;
// The editor chooses the entity and snapshot separately. Server validation retains
// the discriminated union and verifies that the selected snapshot matches it.
export interface ContentDraftPayload {
  entityType: ContentDraft["entityType"];
  entityId?: string;
  expectedVersion: number;
  snapshot: ContentDraft["snapshot"];
}
export type NavigationDraftPayload = z.input<typeof saveNavigationDraftSchema>;
export type PublishPayload = z.input<typeof publishNavigationSchema>;
export type InvitationPayload = z.input<typeof createInvitationSchema>;
export type CreateRolePayload = z.input<typeof createRoleSchema>;
export type UpdateRolePayload = z.input<typeof updateRoleSchema>;
export type UpdateUserPayload = z.input<typeof updateAdminUserSchema>;
export type ProviderDraftPayload = z.input<typeof providerDraftSchema>;
export type ProviderActivationPayload = z.input<
  typeof providerActivationSchema
>;
export type ProviderDisablePayload = z.input<typeof providerDisableSchema>;
export type OAuthStartPayload = z.input<typeof oauthStartSchema>;
export type MediaUploadPayload = z.input<typeof startMediaUploadSchema>;
export type MediaCompletePayload = z.input<typeof completeMediaUploadSchema>;
export type MediaUpdatePayload = z.input<typeof updateMediaSchema>;
export interface LoginPayload {
  email: string;
  password: string;
}
export interface InvitationPreviewPayload {
  token: string;
}
