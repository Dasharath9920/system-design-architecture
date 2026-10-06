import { ScanLine } from 'lucide-react';
import { matchXRay } from './registry';
import { useXRay } from './state';
export function XRayAction({
  conceptId,
  sourceId,
  label,
  layer,
  children,
}: {
  conceptId: string;
  sourceId?: string;
  label?: string;
  layer?: string;
  children?: React.ReactNode;
}) {
  const id = matchXRay(conceptId, label);
  if (!id) return null;
  return (
    <button
      className="xray-entry"
      onClick={() => useXRay.getState().open(id, layer, sourceId, label)}
    >
      <ScanLine size={14} />
      {children || 'X-Ray · Open internals'}
    </button>
  );
}
