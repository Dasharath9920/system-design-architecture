import {
  Activity,
  ArrowLeftRight,
  Bell,
  Blocks,
  Box,
  Braces,
  Cable,
  CircleDot,
  Cloud,
  Code2,
  Container,
  Database,
  Fingerprint,
  GitBranch,
  Globe2,
  HardDrive,
  KeyRound,
  Layers3,
  LockKeyhole,
  MessageCircle,
  Monitor,
  Network,
  Radio,
  Route,
  Search,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Users,
  Waypoints,
  Workflow,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
const icons: Record<string, LucideIcon> = {
  activity: Activity,
  bell: Bell,
  box: Box,
  blocks: Blocks,
  cloud: Cloud,
  database: Database,
  globe: Globe2,
  'globe-2': Globe2,
  'hard-drive': HardDrive,
  layers: Layers3,
  lock: LockKeyhole,
  'key-round': KeyRound,
  'message-circle': MessageCircle,
  monitor: Monitor,
  network: Network,
  radio: Radio,
  route: Route,
  search: Search,
  server: Server,
  shield: ShieldCheck,
  workflow: Workflow,
  zap: Zap,
  code: Code2,
  container: Container,
  git: GitBranch,
  'git-branch': GitBranch,
  users: Users,
  smartphone: Smartphone,
  braces: Braces,
  fingerprint: Fingerprint,
  cable: Cable,
  waypoints: Waypoints,
  sliders: SlidersHorizontal,
  'arrow-left-right': ArrowLeftRight,
};
export function Icon({
  name,
  size = 20,
  ...props
}: {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Component = icons[name] || CircleDot;
  return <Component size={size} strokeWidth={1.65} {...props} />;
}
export function UniverseLogo() {
  return (
    <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        <ellipse cx="20" cy="20" rx="17" ry="7" transform="rotate(-35 20 20)" />
        <ellipse cx="20" cy="20" rx="17" ry="7" transform="rotate(35 20 20)" />
      </g>
      <circle cx="20" cy="20" r="3.4" fill="currentColor" />
    </svg>
  );
}
