/** An `ilike` pattern for a text anywhere in a value, with its own `%`, `_` and `\` as plain characters. */
export const containing = (text: string) => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
