interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * HGNC (HUGO Gene Nomenclature Committee) MCP.
 *
 * Authoritative human gene symbols, approved names, and cross-references from
 * the HGNC REST API (rest.genenames.org). Resolve an approved symbol to its
 * full record, fuzzy-search names/aliases, or reverse-map an external database
 * id (Entrez, Ensembl, UniProt, OMIM, RefSeq, UCSC) to the canonical HGNC gene.
 * Keyless. The single source of truth for human gene nomenclature.
 */


const BASE = 'https://rest.genenames.org';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

// External-id fields accepted by resolve_xref (a subset of the fetchable fields).
const XREF_FIELDS = [
  'entrez_id',
  'ensembl_gene_id',
  'uniprot_ids',
  'omim_id',
  'refseq_accession',
  'ucsc_id',
] as const;

const tools: McpToolExport['tools'] = [
  {
    name: 'get_gene',
    description:
      "Exact lookup of an approved human gene by its official HGNC symbol — returns the full authoritative record: approved name, locus type, chromosomal location, alias/previous symbols, gene groups, and cross-references (Entrez, Ensembl, UniProt, OMIM, RefSeq, UCSC, CCDS). Use search_genes first if you only have a name fragment or aren't sure of the exact symbol. Keyless.",
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Official HGNC gene symbol, e.g. "BRCA1", "TP53", "EGFR".',
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'search_genes',
    description:
      "Fuzzy search across approved symbols, names, and aliases — e.g. \"breast cancer\", \"p53\", \"tumor protein\". Returns lightweight matches (hgnc_id, symbol, relevance score) ranked by score; call get_gene with a returned symbol for the full record. Keyless.",
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Gene symbol, name fragment, or alias, e.g. "breast cancer", "p53", "kinase".',
        },
        limit: {
          type: 'number',
          description: 'Max matches to return (default 10, max 25).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'resolve_xref',
    description:
      'Reverse-lookup: map an external database id to its canonical HGNC gene. "What gene is Entrez 672?" -> BRCA1. Accepts entrez_id, ensembl_gene_id, uniprot_ids, omim_id, refseq_accession, or ucsc_id and returns the same full record as get_gene. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        id_type: {
          type: 'string',
          enum: [...XREF_FIELDS],
          description:
            'External id namespace: one of entrez_id, ensembl_gene_id, uniprot_ids, omim_id, refseq_accession, ucsc_id.',
        },
        id: {
          type: 'string',
          description:
            'The external id, e.g. entrez "672", ensembl "ENSG00000012048", uniprot "P38398", omim "113705".',
        },
      },
      required: ['id_type', 'id'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'get_gene':
        return getGene(args);
      case 'search_genes':
        return searchGenes(args);
      case 'resolve_xref':
        return resolveXref(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

interface HgncResponse {
  response?: {
    numFound?: number;
    docs?: Array<Record<string, unknown>>;
  };
}

// All HGNC requests MUST send Accept: application/json — without it the API
// returns XML.
async function hgncGet(path: string): Promise<HgncResponse> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  });
  if (!res.ok) {
    throw new Error(`HGNC: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  return (await res.json()) as HgncResponse;
}

// Shared full-record mapper for get_gene + resolve_xref.
function mapGene(doc: Record<string, unknown>): Record<string, unknown> {
  return {
    hgnc_id: doc.hgnc_id,
    symbol: doc.symbol,
    name: doc.name,
    status: doc.status,
    locus_type: doc.locus_type,
    location: doc.location,
    alias_symbols: doc.alias_symbol,
    previous_symbols: doc.prev_symbol,
    gene_groups: doc.gene_group,
    entrez_id: doc.entrez_id,
    ensembl_gene_id: doc.ensembl_gene_id,
    ucsc_id: doc.ucsc_id,
    refseq: doc.refseq_accession,
    uniprot_ids: doc.uniprot_ids,
    omim_id: doc.omim_id,
    ccds_id: doc.ccds_id,
    date_approved: doc.date_approved_reserved,
  };
}

async function getGene(args: Record<string, unknown>): Promise<unknown> {
  const symbol = typeof args.symbol === 'string' ? args.symbol.trim() : '';
  if (!symbol) return { error: 'provide a gene symbol', symbol: args.symbol ?? null };

  const data = await hgncGet(`/fetch/symbol/${encodeURIComponent(symbol)}`);
  const docs = data.response?.docs ?? [];
  if ((data.response?.numFound ?? 0) === 0 || docs.length === 0) {
    return { error: `no approved gene with symbol ${symbol} — try search_genes` };
  }
  return mapGene(docs[0]);
}

async function searchGenes(args: Record<string, unknown>): Promise<unknown> {
  const query = typeof args.query === 'string' ? args.query.trim() : '';
  if (!query) return { error: 'provide a search query', query: args.query ?? null };

  let limit = typeof args.limit === 'number' ? Math.floor(args.limit) : 10;
  if (!Number.isFinite(limit) || limit < 1) limit = 10;
  if (limit > 25) limit = 25;

  const data = await hgncGet(`/search/${encodeURIComponent(query)}`);
  const docs = data.response?.docs ?? [];
  const genes = docs.slice(0, limit).map((d) => ({
    hgnc_id: d.hgnc_id,
    symbol: d.symbol,
    score: d.score,
  }));
  return {
    total: data.response?.numFound ?? 0,
    count: genes.length,
    genes,
  };
}

async function resolveXref(args: Record<string, unknown>): Promise<unknown> {
  const idType = typeof args.id_type === 'string' ? args.id_type.trim() : '';
  const id = typeof args.id === 'string' ? args.id.trim() : '';
  if (!idType || !(XREF_FIELDS as readonly string[]).includes(idType)) {
    return { error: `id_type must be one of: ${XREF_FIELDS.join(', ')}`, id_type: args.id_type ?? null };
  }
  if (!id) return { error: 'provide an id', id: args.id ?? null };

  const data = await hgncGet(`/fetch/${idType}/${encodeURIComponent(id)}`);
  const docs = data.response?.docs ?? [];
  if ((data.response?.numFound ?? 0) === 0 || docs.length === 0) {
    return { error: `no HGNC gene found for ${idType}=${id}` };
  }
  return mapGene(docs[0]);
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
