import type { ArchitectureLayout } from '../layout/architecture';
import type { CompanyArchitecture } from '../architectures/types';

/** Separate media delivery from control without changing node identity or column ownership. */
export function storyLayout(
  base: ArchitectureLayout,
  architecture: CompanyArchitecture,
  enabled: boolean,
): ArchitectureLayout {
  if (!enabled || !['video', 'music', 'ride'].includes(architecture.familyId)) return base;
  const lower = new Set(
    architecture.familyId === 'ride'
      ? ['rw-driver', 'rw-ingest', 'rw-geo', 'rw-price']
      : ['rw-cdn', 'rw-storage'],
  );
  const groups = new Map<number, string[]>();
  for (const n of architecture.nodes) {
    if (n.positionHint === 6) continue;
    const x = base.positions[n.id].x;
    groups.set(x, [...(groups.get(x) || []), n.id]);
  }
  const rows = Math.max(
    ...[...groups.values()].map((ids) => ids.filter((id) => !lower.has(id)).length),
  );
  const lowerY = 40 + rows * 128 + 22;
  const positions = { ...base.positions };
  for (const ids of groups.values()) {
    let top = 0,
      bottom = 0;
    for (const id of ids)
      positions[id] = {
        ...base.positions[id],
        y: lower.has(id) ? lowerY + bottom++ * 128 : 40 + top++ * 128,
      };
  }
  const bottom =
    lowerY +
    Math.max(1, ...[...groups.values()].map((ids) => ids.filter((id) => lower.has(id)).length)) *
      128;
  for (const n of architecture.nodes.filter((n) => n.positionHint === 6))
    positions[n.id] = { ...base.positions[n.id], y: bottom + 55 };
  const bands = base.bands.map((b) =>
    b.id === 'operations'
      ? { ...b, y: bottom + 20, height: 140 }
      : { ...b, y: 0, height: bottom + 20 },
  );
  return { ...base, positions, bands, height: bottom + 175 };
}
