#!/usr/bin/env node

/**
 * Aggregate graphify chunk JSONs into a unified knowledge graph.
 * Runs after all 8 chunks have completed semantic extraction.
 * Deduplicates entities and edges, preserves relationships.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GRAPHIFY_OUT = path.join(__dirname, "../graphify-out");
const CHUNK_COUNT = 8;

function loadChunk(n) {
  const file = path.join(GRAPHIFY_OUT, `.graphify_chunk_${n}.json`);
  if (!fs.existsSync(file)) {
    return { nodes: [], edges: [] };
  }
  const content = fs.readFileSync(file, "utf-8");
  try {
    const data = JSON.parse(content);
    return {
      nodes: data.nodes || [],
      edges: data.edges || [],
    };
  } catch (e) {
    console.warn(`Failed to parse chunk ${n}: ${e.message}`);
    return { nodes: [], edges: [] };
  }
}

function deduplicateNodes(allNodes) {
  const map = new Map(); // id -> node
  for (const node of allNodes) {
    const id = node.id;
    if (!map.has(id)) {
      map.set(id, node);
    } else {
      // Merge attributes if both have them
      const existing = map.get(id);
      if (node.attributes && existing.attributes) {
        existing.attributes = { ...existing.attributes, ...node.attributes };
      }
    }
  }
  return Array.from(map.values());
}

function deduplicateEdges(allEdges) {
  const set = new Set();
  const result = [];
  for (const edge of allEdges) {
    const key = `${edge.source}|${edge.target}|${edge.type}`;
    if (!set.has(key)) {
      set.add(key);
      result.push(edge);
    }
  }
  return result;
}

function main() {
  console.log(`Aggregating ${CHUNK_COUNT} graphify chunks...`);

  const allNodes = [];
  const allEdges = [];
  let completedChunks = 0;

  for (let i = 1; i <= CHUNK_COUNT; i++) {
    const chunk = loadChunk(i);
    if (chunk.nodes.length > 0 || chunk.edges.length > 0) {
      allNodes.push(...chunk.nodes);
      allEdges.push(...chunk.edges);
      completedChunks++;
      console.log(
        `  Chunk ${i}: ${chunk.nodes.length} nodes, ${chunk.edges.length} edges`
      );
    } else {
      console.log(`  Chunk ${i}: NOT FOUND (still processing or failed)`);
    }
  }

  if (completedChunks < CHUNK_COUNT) {
    console.warn(
      `\nOnly ${completedChunks}/${CHUNK_COUNT} chunks found. Waiting for background agents to complete.`
    );
    console.warn(
      "Re-run this script after all chunks finish (check graphify-out for .graphify_chunk_*.json files).\n"
    );
    process.exit(1);
  }

  console.log(`\nDeduplicating ${allNodes.length} total nodes...`);
  const uniqueNodes = deduplicateNodes(allNodes);
  console.log(`  Deduplicated to ${uniqueNodes.length} unique nodes`);

  console.log(`Deduplicating ${allEdges.length} total edges...`);
  const uniqueEdges = deduplicateEdges(allEdges);
  console.log(`  Deduplicated to ${uniqueEdges.length} unique edges`);

  const unified = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    chunks: CHUNK_COUNT,
    summary: {
      totalNodes: allNodes.length,
      uniqueNodes: uniqueNodes.length,
      totalEdges: allEdges.length,
      uniqueEdges: uniqueEdges.length,
    },
    nodes: uniqueNodes,
    edges: uniqueEdges,
  };

  const outputFile = path.join(GRAPHIFY_OUT, ".graphify_unified.json");
  fs.writeFileSync(outputFile, JSON.stringify(unified, null, 2));
  console.log(`\nAggregated graph saved to: ${outputFile}`);
  console.log(
    `  ${uniqueNodes.length} entities, ${uniqueEdges.length} relationships`
  );
}

main().catch(console.error);
