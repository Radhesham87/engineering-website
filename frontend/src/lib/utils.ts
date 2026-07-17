export const EXAMS = ["MH-CET", "JEE-Main"];

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
