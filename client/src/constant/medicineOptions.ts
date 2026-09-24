export const MEDICINE_CATEGORIES = [
  'categoryTablets',
  'categoryCapsules',
  'categorySyrups',
  'categoryInjections',
  'categoryOintments',
  'categoryDrops',
  'categoryPowders',
  'categorySupplies',
  'categoryOther',
] as const;

export const MEDICINE_UNITS = [
  'unitPiece',
  'unitTablet',
  'unitBox',
  'unitBottle',
  'unitStrip',
  'unitVial',
  'unitPack',
  'unitTube',
  'unitMl',
  'unitGram',
] as const;

export const PURCHASE_TYPES = ['CASH', 'CREDIT'] as const;

export type PurchaseType = (typeof PURCHASE_TYPES)[number];
