import { useEffect, useState } from 'react';
import { useExperience } from '../experience/preferences';
export function useReducedMotion() {
  const preference = useExperience((s) => s.motion);
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return preference === 'system' ? reduced : preference !== 'full';
}
