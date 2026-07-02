const INVALID_JSX_TEXT_ERROR_REGEX =
  /Invalid JSX Element: Expected a React component but received text "([\s\S]*)"/

/**
 * When a user places a JavaScript line comment (`// ...`) as a child *inside*
 * JSX, it isn't treated as a comment. JSX turns it into a literal text node,
 * which @tscircuit/core's reconciler rejects with an opaque
 * `Invalid JSX Element: Expected a React component but received text "..."`
 * error.
 *
 * This detects that specific case and returns an actionable hint so the user
 * can self-diagnose the mistake. Returns null for any other error.
 */
export const getJsxCommentErrorHint = (
  message: string | undefined,
): string | null => {
  if (!message) return null

  const match = message.match(INVALID_JSX_TEXT_ERROR_REGEX)
  if (!match) return null

  // The captured text is the rejected JSX text node. A `//` at the start almost
  // always means a JS line comment was mistakenly used as a JSX child.
  if (!/^\s*\/\//.test(match[1])) return null

  return "This looks like a `//` comment placed inside JSX. JSX children can't be `//` line comments — use a JSX comment `{/* ... */}` instead."
}
