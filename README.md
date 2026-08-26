# mcp-hgnc

HGNC (HUGO Gene Nomenclature Committee) MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

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

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/hgnc/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Hgnc data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
