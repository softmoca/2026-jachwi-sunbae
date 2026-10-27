import { authHandlers } from './authHandlers';
import { checklistHandlers } from './checklistHandlers';
import { goodPriceHandlers } from './goodPriceHandlers';
import { mapHandlers } from './mapHandlers';
import { propertyChecklistHandlers } from './propertyChecklistHandlers';
import { propertyHandlers } from './propertyHandlers';

export const createHandlers = (usesGoodPriceServer = false) => [
  ...authHandlers,
  ...propertyHandlers,
  ...checklistHandlers,
  ...propertyChecklistHandlers,
  ...mapHandlers,
  ...(usesGoodPriceServer ? [] : goodPriceHandlers),
];

export const handlers = createHandlers();
