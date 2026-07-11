import { describe, it, expect } from 'vitest';
import { NODES, EDGES, NON_EDGES, DOMAINS, DOMAIN_ORDER } from '@/admin/systemsMapData';
// eslint-disable-next-line import/no-relative-packages
import markets from '../../data/balance/markets.json';

describe('systems map data — structural integrity', () => {
  it('every node id is unique', () => {
    const ids = NODES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every node belongs to a declared domain, in DOMAIN_ORDER', () => {
    const domainIds = new Set(DOMAINS.map((d) => d.id));
    expect(domainIds.size).toBe(DOMAIN_ORDER.length);
    for (const node of NODES) {
      expect(domainIds.has(node.domain)).toBe(true);
    }
  });

  it('every edge id is unique', () => {
    const ids = EDGES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every edge's from/to reference existing node ids", () => {
    const nodeIds = new Set(NODES.map((n) => n.id));
    for (const edge of EDGES) {
      expect(nodeIds.has(edge.from), `edge ${edge.id} has unknown "from": ${edge.from}`).toBe(true);
      expect(nodeIds.has(edge.to), `edge ${edge.id} has unknown "to": ${edge.to}`).toBe(true);
    }
  });

  it('every edge has a non-empty formula and ref', () => {
    for (const edge of EDGES) {
      expect(edge.formula.length, `edge ${edge.id} formula empty`).toBeGreaterThan(0);
      expect(edge.ref.length, `edge ${edge.id} ref empty`).toBeGreaterThan(0);
    }
  });

  it('every edge has at least one value entry, and every value has a non-empty label', () => {
    for (const edge of EDGES) {
      expect(edge.values.length, `edge ${edge.id} has no values`).toBeGreaterThan(0);
      for (const v of edge.values) {
        expect(v.label.length, `edge ${edge.id} has a value with empty label`).toBeGreaterThan(0);
      }
    }
  });

  it('every hardcoded-flagged edge has at least one value whose ref contains a file path', () => {
    const filePathPattern = /\.(ts|tsx|json)/;
    for (const edge of EDGES) {
      if (!edge.hardcoded) continue;
      const hardcodedValues = edge.values.filter((v) => v.source === 'hardcoded');
      expect(hardcodedValues.length, `edge ${edge.id} flagged hardcoded but has no hardcoded values`).toBeGreaterThan(0);
      const hasFileRef = hardcodedValues.some((v) => v.ref && filePathPattern.test(v.ref));
      expect(hasFileRef, `edge ${edge.id} hardcoded value(s) missing a file:line ref`).toBe(true);
    }
  });

  it('the "hardcoded" flag is consistent with the presence of a hardcoded value', () => {
    for (const edge of EDGES) {
      const anyHardcoded = edge.values.some((v) => v.source === 'hardcoded');
      expect(edge.hardcoded, `edge ${edge.id}.hardcoded flag mismatches its values`).toBe(anyHardcoded);
    }
  });

  it('non-edges reference existing node ids', () => {
    const nodeIds = new Set(NODES.map((n) => n.id));
    for (const ne of NON_EDGES) {
      expect(nodeIds.has(ne.from), `non-edge ${ne.id} has unknown "from": ${ne.from}`).toBe(true);
      expect(nodeIds.has(ne.to), `non-edge ${ne.id} has unknown "to": ${ne.to}`).toBe(true);
      expect(ne.claim.length).toBeGreaterThan(0);
      expect(ne.evidence.length).toBeGreaterThan(0);
    }
  });

  it('at least one live-config edge actually resolves its value from the imported balance JSON (spot-check quality_weight)', () => {
    const qualityEdge = EDGES.find((e) => e.id === 'e-quality-streams-base');
    expect(qualityEdge).toBeTruthy();
    const qualityWeightValue = qualityEdge!.values.find((v) => v.label === 'quality_weight');
    expect(qualityWeightValue).toBeTruthy();
    expect(qualityWeightValue!.source).toBe('live');
    expect(qualityWeightValue!.value).toBe(
      (markets as any).market_formulas.streaming_calculation.quality_weight,
    );
  });

  it('node ids used across the whole dataset stay within the declared node list (no invented nodes)', () => {
    const nodeIds = new Set(NODES.map((n) => n.id));
    const referenced = new Set<string>();
    EDGES.forEach((e) => {
      referenced.add(e.from);
      referenced.add(e.to);
    });
    NON_EDGES.forEach((ne) => {
      referenced.add(ne.from);
      referenced.add(ne.to);
    });
    Array.from(referenced).forEach((id) => {
      expect(nodeIds.has(id), `referenced node id "${id}" is not declared in NODES`).toBe(true);
    });
  });
});
