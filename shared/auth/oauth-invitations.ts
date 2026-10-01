export function assertInvitationIdentity(
  invitedEmail: string,
  identity: { email: string | null; emailVerified: boolean },
) {
  if (!identity.email || !identity.emailVerified) {
    throw new Error("The provider must return a verified email address.");
  }
  if (identity.email.trim().toLowerCase() !== invitedEmail.trim().toLowerCase()) {
    throw new Error("Use the account that matches the invitation email.");
  }
}
