import type { DiagramModel } from '../domain/er-model';
import type { ConceptualStyle } from './chen-types';
import { detectConceptualStyle as detectTicketingConceptualStyle } from './chen-ticketing';
import { buildGenericConceptualStyle } from './generic-conceptual-style';

export function buildConceptualStyle(model: DiagramModel): ConceptualStyle {
  return detectTicketingConceptualStyle(model) ?? buildGenericConceptualStyle(model);
}
