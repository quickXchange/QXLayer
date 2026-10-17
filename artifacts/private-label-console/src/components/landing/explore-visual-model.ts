/** Editable concept rows may be shorter than the initial sample dataset. */
export function cardPresentation(rows: readonly (readonly string[])[]) {
  return {
    lastFour: rows[0]?.[1]?.slice(-4) || '0000',
    primaryHolder: rows[0]?.[0] || 'Sample cardholder',
    secondaryHolder: rows[2]?.[0] || rows[0]?.[0] || 'Sample cardholder',
  };
}
