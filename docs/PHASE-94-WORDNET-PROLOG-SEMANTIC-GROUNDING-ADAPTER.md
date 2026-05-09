# Phase 94 - WordNet / Prolog Semantic Grounding Adapter

## Summary

Phase 94 declares WordNet, Prolog, RDF/SPARQL, graph message passing, and
pub/sub as semantic grounding and projection adapters over the OMI CONS
lattice.

This phase does not import a WordNet corpus, start a Prolog runtime, export RDF,
run a GNN, or open decentralized pub/sub. It defines the authority boundary and
adapter vocabulary first.

## Locked Statement

> WordNet and Prolog ground language and logic projections over the OMI CONS
> lattice; they do not define authority.

## Semantic Ladder

```text
raw binary memory
-> CONS pointer embedding
-> S-P-O-M incidence fact
-> WordNet / Prolog grounding
-> graph message passing
-> decentralized pub/sub
-> semantic projection surface
```

The OMI semantic-web layer is not RDF-first, neural-first, or filesystem-first.
It is a receipt-verified CONS incidence lattice that can project into those
surfaces.

## CONS Pointer Bridge

```text
CONS = memory edge
CONS = semantic relation
CONS = incidence boundary
CONS = projection handle
CONS = transportable reference
```

A declared CONS pointer can be read as:

```text
address a points through a boundary frame to address b
```

and as:

```text
subject a is connected to object b by an admissible predicate frame
```

That bridge is what lets Lisp-style CONS, Prolog-style facts, and semantic-web
triples remain projections over the same lower authority.

## Adapter Roles

```text
WordNet = lexical grounding adapter
Prolog  = logic projection adapter
RDF     = semantic web interchange adapter
SPARQL  = semantic web query adapter
SCGNN   = graph message-passing projection
pub/sub = decentralized propagation channel
```

These adapters may ground, query, exchange, weight, or propagate projections.
They do not admit state.

## Authority Boundary

```text
WordNet synset != authority
Prolog fact != authority
RDF triple != authority
GNN activation != authority
pub/sub message != authority

canonical CONS declaration + receipts = authority
```

GNN or SCGNN layers may suggest projection weights. Receipts admit state.

## Non-Goals

Phase 94 does not:

```text
vendor WordNet data
start a Prolog engine
emit RDF/SPARQL exports
define a pub/sub network protocol
run graph neural inference
replace S-P-O-M triangulation
promote lexical or logic adapters into authority
```

Those belong to later adapter and runtime phases.
