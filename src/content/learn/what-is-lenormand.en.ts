// Long-form prose for /learn/what-is-lenormand.

export type ParagraphBlock = { kind: "p"; lead?: string; text: string };
export type ListItem = { lead?: string; text: string };
export type ListBlock = { kind: "list"; items: ListItem[] };
export type Block = ParagraphBlock | ListBlock;

export type WhatIsLenormandSection = {
  heading: string;
  body: Block[];
};

export type WhatIsLenormandContent = {
  intro: string[]; // opening paragraphs, no heading
  sections: WhatIsLenormandSection[];
};

export const WHAT_IS_LENORMAND: WhatIsLenormandContent = {
  intro: [],
  sections: [
    {
      heading: "A deck of thirty-six plain pictures",
      body: [
        {
          kind: "p",
          text: "Lenormand is a cartomancy deck of 36 cards. Each one shows a single ordinary thing: a rider, a ship, a house, a tree, a dog, a key, a fish. There is no elaborate symbolism to decode and no hidden layer of meaning. A card called Letter means a letter. A card called Mountain means an obstacle.",
        },
        {
          kind: "p",
          text: "That plainness is the point. The whole system is built on small, fixed, unambiguous meanings that combine into statements, in much the way that ordinary words combine into sentences. A reader who knows all 36 meanings knows the vocabulary. Everything after that is grammar.",
        },
      ],
    },
    {
      heading: "Where it comes from",
      body: [
        {
          kind: "p",
          text: "The deck did not begin as a fortune-telling tool. In 1799, a publisher in Nuremberg issued a parlour game called Das Spiel der Hoffnung, the Game of Hope: 36 numbered cards laid out as a track, with players moving counters along it according to dice. The images were the ones still in use today. The rules included a short note that the cards could also be used for telling fortunes, which turned out to be the part that lasted.",
        },
        {
          kind: "p",
          text: "The name came later, and from someone else entirely. Marie Anne Lenormand was a Parisian cardreader of considerable fame who worked through the Revolution and the Napoleonic years, and who was said to have read for Joséphine de Beauharnais. She had nothing to do with this deck. After her death in 1843, publishers attached her name to 36-card decks because it sold them, and the label stuck. The deck is sometimes called Petit Lenormand for that reason, to distinguish it from a larger and unrelated deck also sold under her name.",
        },
        {
          kind: "p",
          text: "So the tradition is roughly two centuries old, German in origin, French only by marketing, and named after a woman who never used it. Worth knowing, because it explains why the system feels so unmystical. It was designed to be legible to people playing a board game.",
        },
      ],
    },
    {
      heading: "Three things that define how it works",
      body: [
        {
          kind: "p",
          lead: "Meanings are literal",
          text: "The cards describe things, situations, and people in fairly concrete terms. Fox is self-interest, or employment. Ring is an agreement. Coffin is an ending. There is no requirement to meditate on a card to reach its meaning, and no expectation that it will mean something different for each reader.",
        },
        {
          kind: "p",
          lead: "Meaning is made between cards, not inside them",
          text: "This is the largest single thing to absorb. A card on its own says very little. Clouds is confusion, but confusion about what? Fox is self-interest, but whose, and directed at what? The answer comes from the card next to it. Two cards make one statement, not two, and reading them as a list of separate meanings produces nothing useful.",
        },
        {
          kind: "p",
          lead: "There are no reversals",
          text: "A card that lands upside down is simply turned the right way up. The deck has no inverted meanings, and none are needed, because tone comes from the surrounding cards instead. A difficult card beside a bright one reads differently from the same card beside another difficult one.",
        },
        {
          kind: "p",
          text: "Many decks also carry a small playing-card inset in the corner, a legacy of the deck's origin. Some readers use these as an additional layer. Most do not, and nothing in the core system depends on them.",
        },
      ],
    },
    {
      heading: "How it differs from Tarot",
      body: [
        {
          kind: "p",
          text: "The two are often shelved together and are not much alike.",
        },
        {
          kind: "p",
          text: "Tarot has 78 cards across major and minor arcana, a deep symbolic vocabulary, and a tradition of reading a single card at length. Its strength is psychological and reflective. One card can hold an entire conversation, and two readers may draw quite different things from the same image, legitimately.",
        },
        {
          kind: "p",
          text: "Lenormand has 36 cards, no arcana structure, and almost nothing to say about any single card in isolation. It does not reward meditation on an image. It rewards accumulating combinations. Where Tarot asks what a card evokes, Lenormand asks what two cards state together.",
        },
        {
          kind: "p",
          text: "The practical consequences:",
        },
        {
          kind: "list",
          items: [
            {
              lead: "Answers tend to be more concrete",
              text: "Lenormand is better suited to “what is happening here” than to “what does this mean for my inner life”.",
            },
            {
              lead: "Meanings are more standardised",
              text: "Two experienced Lenormand readers will usually agree on what Ring plus Key says. Two Tarot readers might reasonably differ on the Hermit.",
            },
            {
              lead: "Learning curve is shaped differently",
              text: "The 36 meanings are quick to learn and the combinations take a long time. Tarot is roughly the reverse.",
            },
            {
              lead: "Intuition plays a different role",
              text: "In Lenormand it works within a fixed vocabulary rather than replacing it.",
            },
          ],
        },
        {
          kind: "p",
          text: "Neither approach is better. They answer different kinds of question, and a reader who expects one to behave like the other will find both frustrating.",
        },
      ],
    },
    {
      heading: "What it is good at, and what it is not",
      body: [
        {
          kind: "p",
          text: "Lenormand handles practical, situational questions well: what is going on, what is influencing it, what is likely to follow. It is direct, and it will describe an unwelcome situation without softening it.",
        },
        {
          kind: "p",
          text: "It is less suited to open-ended reflection, spiritual enquiry, or questions about meaning and purpose. Asked “what should I learn from this”, it tends to produce something oddly flat. It is also poor at questions the reader has not actually formed. A vague question produces a vague line, and no amount of skill recovers that.",
        },
        {
          kind: "p",
          text: "It cannot tell anyone their future, and a reader who presents it as though it can is doing something other than reading.",
        },
      ],
    },
  ],
};
