export interface LegalDoc {
  /** Page title shown in the header (the document's top-level heading). */
  title: string;
  /** Short line shown under the title, e.g. last-updated date. */
  updated: string;
  /** The document body as Markdown (without the top-level H1). */
  body: string;
}
