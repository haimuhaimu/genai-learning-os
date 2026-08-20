import { strategyCaseCatalog, type CaseCatalogItem, type CaseId } from './caseCatalog'

export type CaseRegistryItem = CaseCatalogItem<CaseId>
export const strategyCaseRegistry: readonly CaseRegistryItem[] = strategyCaseCatalog
export const strategyCaseSpecs = new Map(strategyCaseCatalog.flatMap((item) => item.spec ? [[item.id, item.spec] as const] : []))
export function getStrategyCase(caseId?: string) { return strategyCaseSpecs.get(caseId as CaseId) }
export function getRegistryCase(caseId: CaseId) { return strategyCaseCatalog.find((item) => item.id === caseId) }

export { caseIds, caseRouteMap, centerCaseCatalog, decisionMathCaseCatalog, decisionMathCaseIds, flagshipCaseIds, frontierCaseIds, frontierRouteIds, routeIds, type CaseId } from './caseCatalog'
