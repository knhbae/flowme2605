/** A revoked session may return 403 on retry. Never treat an arbitrary 403/404 as successful revocation. */
export async function isConfirmedAlphaLogout(response: Response): Promise<boolean> {
  if (response.ok || response.status === 401) return true;
  if (response.status !== 403) return false;
  try {
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object') return false;
    // Current versioned Auth responses use code; older raw responses use error_code.
    const code = 'code' in body && typeof body.code === 'string' ? body.code
      : 'error_code' in body && typeof body.error_code === 'string' ? body.error_code : null;
    return code === 'session_not_found';
  } catch { return false; }
}
