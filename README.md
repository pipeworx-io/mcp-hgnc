# mcp-hgnc

HGNC (HUGO Gene Nomenclature Committee) MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `get_gene` | Exact lookup of an approved human gene by its official HGNC symbol — returns the full authoritative record: approved name, locus type, chromosomal location, alias/previous symbols, gene groups, and cross-references (Entrez, Ensembl, UniProt, OMIM, RefSeq, UCSC, CCDS). Use search_genes first if you only have a name fragment or aren't sure of the exact symbol. Keyless. |
| `search_genes` | Fuzzy search across approved symbols, names, and aliases — e.g. "breast cancer", "p53", "tumor protein". Returns lightweight matches (hgnc_id, symbol, relevance score) ranked by score; call get_gene with a returned symbol for the full record. Keyless. |
| `resolve_xref` | Reverse-lookup: map an external database id to its canonical HGNC gene. "What gene is Entrez 672?" -> BRCA1. Accepts entrez_id, ensembl_gene_id, uniprot_ids, omim_id, refseq_accession, or ucsc_id and returns the same full record as get_gene. Keyless. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "hgnc": {
      "url": "https://gateway.pipeworx.io/hgnc/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Hgnc data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
