import {
  EXAM_TYPES as RICH_EXAM_TYPES,
  SECTIONS as RICH_SECTIONS,
  FORMATS as RICH_FORMATS,
  DIFFICULTIES as RICH_DIFFICULTIES,
} from "./generate-constants";

/** Derived simple arrays for filter UIs that don't need rich metadata.
 *  Source of truth lives in generate-constants.ts — edit there. */

export const EXAM_TYPES = RICH_EXAM_TYPES.map(({ id, name }) => ({ id, name }));

export const SECTIONS = RICH_SECTIONS.map(({ id, name }) => ({ id, name }));

export const FORMATS = RICH_FORMATS.map(({ id }) => id);

export const DIFFICULTIES = RICH_DIFFICULTIES.map((label, index) => ({
  value: index + 1,
  label,
}));
