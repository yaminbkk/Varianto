import type { AuthService } from './auth'

/**
 * Calls `onChanged` when the signed-in user is no longer `signedInAs`: another account signed
 * in, or the user signed out, possibly in another tab. The app should then reload, because its
 * stores were built for the old user. Returns a function that stops watching.
 */
export function watchSession(
  auth: Pick<AuthService, 'onChange'>,
  signedInAs: string | undefined,
  onChanged: () => void,
): () => void {
  return auth.onChange((user) => {
    if (user?.id !== signedInAs) onChanged()
  })
}
