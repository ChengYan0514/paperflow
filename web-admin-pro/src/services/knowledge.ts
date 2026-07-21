import { request } from '@umijs/max';

export type SignCategory = 'positive' | 'negative' | 'null' | 'mixed';

export type CausalGraphOverview = {
  totalClaimRecords: number;
  totalStandardClaims: number;
  totalPapers: number;
  totalNodes: number;
  totalEdges: number;
  graphNodes: number;
  graphEdges: number;
  graphMinRepetition: number;
};

export type CausalGraphSummary = {
  overview: CausalGraphOverview;
  subfields: string[];
  methods: string[];
  datasetVersion?: {
    versionName?: string | null;
    refreshedAt?: string | null;
  } | null;
};

export type CausalGraphNode = {
  id: string;
  label: string;
  occurrences: number;
  dominantSubfield?: string | null;
  asCauseCount: number;
  asEffectCount: number;
};

export type CausalGraphEdge = {
  claimId?: number | null;
  source: string;
  target: string;
  recordCount: number;
  paperCount: number;
  diversity: number;
  disagreement: number;
  dominantSign?: string | null;
  dominantSignCategory: SignCategory;
  signBreakdown: Record<string, number>;
};

export type CausalGraphData = {
  nodes: CausalGraphNode[];
  edges: CausalGraphEdge[];
};

export type CausalClaim = {
  recordId: number;
  workId: string;
  title?: string | null;
  publicationYear?: number | null;
  sourceId?: string | null;
  sourceName?: string | null;
  topicName?: string | null;
  subfieldName?: string | null;
  claimId?: number | null;
  claim?: string | null;
  cause?: string | null;
  effect?: string | null;
  causeStandard: string;
  effectStandard: string;
  signOfImpact?: string | null;
  signCategory: SignCategory;
  typeOfRelationship?: string | null;
  causalInferenceMethod?: string | null;
  evidenceMethodOtherDescription?: string | null;
  isMainContribution?: boolean | null;
  levelOfTentativeness?: string | null;
  sourcesOfExogenousVariation?: string | null;
  statisticalSignificance?: string | null;
  causeScore?: number | null;
  effectScore?: number | null;
  evidence?: string | null;
};

export type CausalNodeDetail = {
  node: CausalGraphNode;
  subfieldCounts: Record<string, number>;
  yearCounts: Record<string, number>;
  totalClaims: number;
  outgoing: CausalGraphEdge[];
  incoming: CausalGraphEdge[];
};

export type CausalEdgeDetail = {
  edge: CausalGraphEdge;
  stats: {
    spreadSubfield: number;
    spreadTopic: number;
    spreadTime: number;
    methods: string[];
  };
  claims: CausalClaim[];
};

export type CausalPaperDetail = {
  paper: {
    workId: string;
    title?: string | null;
    publicationYear?: number | null;
    sourceId?: string | null;
    sourceName?: string | null;
    topicName?: string | null;
    subfieldName?: string | null;
  };
  claims: CausalClaim[];
  paperGraph: CausalGraphData;
};

export type CausalPaperSummary = {
  workId: string;
  claimRecordCount: number;
  standardClaimCount: number;
  variableCount: number;
  hasCausalClaims: boolean;
};

export type CausalFieldItem = {
  subfield: string;
  topic: string;
  claimRecordCount: number;
  paperCount: number;
  variableCount: number;
};

export type CausalFieldAnalysis = {
  items: CausalFieldItem[];
  insights: {
    methodCounts: { name: string; count: number }[];
    topVariables: { name: string; count: number }[];
    topRelations: {
      cause: string;
      effect: string;
      claimRecordCount: number;
      paperCount: number;
      methodCount: number;
    }[];
  };
};

export type CausalNodeSearchResult = {
  variable: string;
  occurrences: number;
};

export type CausalPaperSearchResult = {
  workId: string;
  title?: string | null;
  publicationYear?: number | null;
  sourceName?: string | null;
  claimRecordCount: number;
};

async function getJson<T>(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return request<T>(`${path}${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
}

export function getCausalSummary() {
  return getJson<CausalGraphSummary>('/api/knowledge/causal-graph/summary');
}

export function getCausalGraph(params?: URLSearchParams) {
  return getJson<CausalGraphData>('/api/knowledge/causal-graph/graph', params);
}

export function getCausalNode(variable: string) {
  return getJson<CausalNodeDetail>(
    `/api/knowledge/causal-graph/nodes/${encodeURIComponent(variable)}`,
  );
}

export function getCausalEdge(cause: string, effect: string) {
  const params = new URLSearchParams({ cause, effect });
  return getJson<CausalEdgeDetail>('/api/knowledge/causal-graph/edges', params);
}

export function getCausalClaim(claimId: number) {
  return getJson<CausalEdgeDetail>(`/api/knowledge/causal-graph/claims/${claimId}`);
}

export function getCausalPaper(workId: string) {
  return getJson<CausalPaperDetail>(`/api/knowledge/causal-graph/papers/${workId}`);
}

export function getCausalPaperSummary(workId: string) {
  return getJson<CausalPaperSummary>(`/api/knowledge/causal-graph/papers/${workId}/summary`);
}

export function getCausalFields() {
  return getJson<CausalFieldAnalysis>('/api/knowledge/causal-graph/fields');
}

export function searchCausalNodes(q: string, limit = 10) {
  const params = new URLSearchParams({ q, limit: String(limit) });
  return getJson<CausalNodeSearchResult[]>('/api/knowledge/causal-graph/search/nodes', params);
}

export function searchCausalTerms(q: string, limit = 10) {
  const params = new URLSearchParams({ q, limit: String(limit) });
  return getJson<string[]>('/api/knowledge/causal-graph/search/terms', params);
}

export function searchCausalPapers(q: string, limit = 10) {
  const params = new URLSearchParams({ q, limit: String(limit) });
  return getJson<CausalPaperSearchResult[]>('/api/knowledge/causal-graph/search/papers', params);
}
