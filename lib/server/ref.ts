import { randomBytes } from "node:crypto";

// No 0/O/1/I to keep codes easy to read aloud on the phone.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function consentRef(): string {
  const bytes = randomBytes(8);
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]);
  return `OD-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}
