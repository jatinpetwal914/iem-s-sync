export const TIME_SIGNATURE_OPTIONS = ["4/4", "3/4", "5/4", "6/8", "7/8"] as const;

export type TimeSignatureOption = (typeof TIME_SIGNATURE_OPTIONS)[number];
