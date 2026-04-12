import type { Severity } from "../types.js";

export interface AsciiArt {
  art: string;
  comment: string;
  label: string;
}

const CRITICAL_ART = `
       _____________________________
      |  ___________________________|
      | |        WELCOME            |
      | |       HACKERS!!           |
      | |___________________________|
      |                 ___         |
  ____|____            |   | <--    |
 /         \\    ___    |   |  OPEN! |
/   (o) (o) \\  |   |   ---|        |
|     ___    | | W |       |   >>>  |
|    /   \\   | |   |       |  >>>   |
|   |     |  | |___|       |   >>>  |
|___|     |__|_____________|________|
////                           /////
`.trim();

const HIGH_ART = `
       _____________________________
      |  ___________________________|
      | |                           |
      | |___________________________|
      |                 ___    ___  |
  ____|____            | . |  |   | |
 /         \\    ___    | . |--|   | |
/   (-) (-) \\  |   |   |  /   |  | |
|     ___    | | W |    | /  * |  | |
|    /   \\   | |   |    |/    *|  | |
|   |     |  | |___|   /  *  * |  | |
|___|     |__|______/_/________|__|_|
////                           /////
`.trim();

const MEDIUM_ART = `
       _____________________________
      |  ___________________________|
      | |                           |
      | |___________________________|
      |                 ___    [  ] |
  ____|____            |   |  [    ]|
 /         \\    ___    |   |  [ UNL|
/   (o) (-)\\   |   |   |---|  [OCK!|
|     ___   |  | W |   |   |  [  ] |
|    / ~ \\  |  |   |   |   |  [  ] |
|   |     | |  |___|   | o |       |
|___|     |_|__________|___|_______|
////                           /////
`.trim();

const LOW_ART = `
       _____________________________
      |  ___________________________|
      | |                           |
      | |___________________________|
      |                 ___    [==] |
  ____|____            |   |  [==] |
 /         \\    ___    |   |  [==] |
/   (;) (;) \\  |   |   |---|  [==] |
|     ___    | | W |   |   |  [==] |
|    / ~ \\   | |   |   |   |  [==] |
|   |     |  | |___|   | o |       |
|___|     |__|_________|___|_______|
////                           /////
`.trim();

const HEADER_ART = `
  ____  _____ _   _  _  __    _    _   _
 / ___|| ____| \\ | || |/ /   / \\  | \\ | |
| |  _ |  _| |  \\| || ' /   / _ \\ |  \\| |
| |_| || |___| |\\  || . \\  / ___ \\| |\\  |
 \\____||_____|_| \\_||_|\\_\\/_/   \\_\\_| \\_|

  -- omae no ie no genkan aiteru zo --
`.trim();

const ART_MAP: Record<Severity, AsciiArt> = {
  critical: {
    art: CRITICAL_ART,
    comment: "omae no repo, maruhadaka jyan",
    label: "CRITICAL",
  },
  high: {
    art: HIGH_ART,
    comment: "hacker ga nozoitemasu ga daijoubu desuka",
    label: "HIGH",
  },
  medium: {
    art: MEDIUM_ART,
    comment: "mado no kagi shime wasurete masu yo",
    label: "MEDIUM",
  },
  low: {
    art: LOW_ART,
    comment: "maa... ii desu kedo ne",
    label: "LOW",
  },
};

export function getArt(severity: Severity): AsciiArt {
  return ART_MAP[severity];
}

export function getHeaderArt(): string {
  return HEADER_ART;
}
