export async function runPreSignInSignOut({
  livePreview,
  hasBearer,
  requestSignOut,
  clearToken,
}) {
  if (livePreview && hasBearer) {
    await requestSignOut();
    clearToken();
    return;
  }

  if (!livePreview && typeof requestSignOut === "function") {
    try {
      await requestSignOut();
    } catch {
      // keep the sign-in flow moving for local bootstrapping
    }
  }

  if (typeof clearToken === "function") clearToken();
}

export async function runSignOut({
  livePreview,
  hasBearer,
  requestSignOut,
  clearToken,
  redirect,
}) {
  if (livePreview && hasBearer) {
    try {
      await requestSignOut();
    } catch {
      // let caller handle user feedback if server rejects
    }
  }

  if (typeof clearToken === "function") clearToken();
  if (typeof redirect === "function") redirect();
}
