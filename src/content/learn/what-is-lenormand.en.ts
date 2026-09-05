// Long-form prose for /learn/what-is-lenormand. Scaffolded structure only —
// the prose itself is supplied separately, not authored here.

export type WhatIsLenormandSection = {
  heading: string;
  body: string[]; // paragraphs
};

export type WhatIsLenormandContent = {
  intro: string[]; // opening paragraphs, no heading
  sections: WhatIsLenormandSection[]; // expected: how it differs from Tarot, deck history
};

export const WHAT_IS_LENORMAND: WhatIsLenormandContent = {
  intro: [],
  sections: [],
};
