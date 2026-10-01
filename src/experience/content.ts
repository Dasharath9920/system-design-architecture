import type { ArchitectureNode, Scenario, ScenarioStep } from '../architectures/types';
import type { Activity, SemanticPacket, StepVisual } from './types';

const packets: Record<string, SemanticPacket> = {
  social: 'post',
  chat: 'message',
  video: 'segment',
  ride: 'location',
  commerce: 'json',
  search: 'query',
  files: 'chunk',
  music: 'segment',
  gaming: 'input',
  payments: 'transaction',
};
const payloads: Record<string, string> = {
  social: 'post C · viewer 42',
  chat: 'Hello 👋',
  video: 'segment 01 · 1080p',
  ride: 'driver B · GPS',
  commerce: 'order 1042',
  search: 'distributed systems',
  files: 'chunk 01 · sha256',
  music: 'audio · segment 01',
  gaming: 'input #42 · →',
  payments: 'USD 125.00 · intent 42',
};
const pace: Record<string, number> = {
  request: 1350,
  event: 1550,
  read: 1950,
  write: 2100,
  'cache-hit': 900,
  'cache-miss': 1600,
  media: 2400,
  replication: 1400,
  ack: 1100,
  telemetry: 1000,
};
const latency: Record<string, number> = {
  request: 12,
  event: 8,
  read: 38,
  write: 62,
  'cache-hit': 3,
  'cache-miss': 9,
  media: 45,
  replication: 18,
  ack: 6,
  telemetry: 2,
};
type Cue = Partial<StepVisual>;
const client = (state: string, node = 'rw-client') => ({ node, state });
/** Authored story cues live with content, never in a company-specific renderer. */
const cues: Record<string, Record<string, Cue>> = {
  social: {
    'Request next page': { sourceState: client('loading') },
    'Look up candidates': {
      packet: 'key',
      payload: 'timeline:user_42',
      arrival: 'read',
      caption: 'LOOKUP',
    },
    'Cache hit': { arrival: 'hit', caption: 'HIT', packet: 'rows' },
    'Cache miss': { arrival: 'miss', caption: 'MISS', hold: 650 },
    'Rank eligible candidates': {
      arrival: 'rank',
      caption: 'C · A · E',
      payload: 'A B C D E',
      hold: 700,
    },
    'Fill candidate cache': { arrival: 'write', caption: 'SET' },
    'Return feed page': { client: client('feed'), packet: 'post' },
    'Publish post': { sourceState: client('publishing') },
    'Post accepted': { client: client('posted') },
    'Choose fanout on read': { arrival: 'fanout', caption: '100M → READ', hold: 700 },
    'Update follower timelines': { arrival: 'fanout', caption: 'FANOUT ON WRITE' },
  },
  chat: {
    'Send message ID': { sourceState: client('sending'), packet: 'message' },
    'Persist message': { arrival: 'write', caption: 'COMMITTED' },
    'Accepted acknowledgment': { client: client('sent'), packet: 'ack' },
    'Deliver live message': { client: client('received', 'rw-recipient'), packet: 'message' },
    'Delivery receipt': { client: client('delivered'), packet: 'ack' },
    'Recipient offline': {
      client: client('offline', 'rw-recipient'),
      arrival: 'degraded',
      caption: 'OFFLINE',
    },
    'Fetch missed history': { arrival: 'read', caption: 'RESUME CURSOR' },
    'Apply recovered messages': { client: client('received', 'rw-recipient'), packet: 'message' },
    'Recovered delivery receipt': { client: client('delivered'), packet: 'ack' },
    'Apply and deduplicate': { client: client('received', 'rw-recipient') },
    'Deliver to recipient': { client: client('received', 'rw-recipient') },
    'Sync sender’s devices': { client: client('sent') },
    'Consumer falls behind': { arrival: 'enqueue', caption: 'CONSUMER LAG', hold: 700 },
  },
  video: {
    'Start playback': { sourceState: client('loading'), packet: 'request' },
    'Return manifest and URLs': {
      client: client('manifest'),
      packet: 'json',
      payload: 'manifest.mpd',
    },
    'Request media segment': { packet: 'key', payload: 'segment 01' },
    'Cold edge: fill from origin': { arrival: 'miss', caption: 'MISS → ORIGIN', hold: 650 },
    'Cache the segment': { arrival: 'buffer', caption: 'EDGE WARMED', burst: 3 },
    'Stream playable bytes': {
      arrival: 'buffer',
      burst: 4,
      client: client('playing'),
      caption: 'BUFFER READY',
    },
    'Adapt to lower bitrate': {
      arrival: 'buffer',
      burst: 3,
      client: client('adaptive'),
      payload: 'segment 05 · 720p',
      caption: '1080p → 720p',
    },
    'Resume playback': { arrival: 'buffer', burst: 3, client: client('playing') },
    'Upload source video': { sourceState: client('uploading'), packet: 'chunk' },
    'Publish manifest': { client: client('ready'), packet: 'json', caption: 'READY TO PLAY' },
  },
  ride: {
    'Request a ride': { sourceState: client('searching'), packet: 'request' },
    'Find nearby drivers': { arrival: 'match', caption: 'A · B · C', payload: 'pickup cell' },
    'Score candidates': { arrival: 'match', caption: 'B · LOWEST ETA', hold: 650 },
    'Offer the ride': { client: client('offer', 'rw-driver') },
    'Commit assignment': { arrival: 'write', caption: 'ASSIGNED ONCE' },
    'Confirm pickup': { client: client('matched'), packet: 'ack' },
    'Send timestamped GPS': {
      packet: 'location',
      burst: 3,
      sourceState: client('moving', 'rw-driver'),
    },
    'Refresh live position': { arrival: 'match', caption: 'POSITION UPDATED' },
    'Update rider map': { client: client('moving'), packet: 'location' },
    'Send payment status': { client: client('complete') },
  },
  commerce: {
    'Submit checkout key': {
      sourceState: client('ordering'),
      packet: 'json',
      payload: 'order 1042 · key',
    },
    'Reserve stock': { arrival: 'write', caption: 'RESERVED' },
    'Authorize payment': { arrival: 'authorize', caption: 'AUTHORIZATION', packet: 'transaction' },
    'Order confirmed': { client: client('confirmed'), packet: 'ack' },
    'Schedule fulfillment': { arrival: 'fanout', caption: 'FULFILL ASYNC' },
    'Report unavailable stock': { client: client('unavailable') },
    'Release reservation': { arrival: 'write', caption: 'RELEASED', phase: 'RECOVERY', hold: 700 },
    'Checkout canceled safely': { client: client('canceled') },
    'Return product cards': { client: client('products') },
    'Return cart state': { client: client('cart') },
  },
  search: {
    'Submit query': { sourceState: client('searching'), packet: 'query' },
    'Search partition A': { arrival: 'read', caption: 'SHARD A', payload: 'query → A' },
    'Search partition B': { arrival: 'read', caption: 'SHARD B', payload: 'query → B' },
    'Merge candidates A': { arrival: 'merge', caption: '2 / 4 RESULTS', packet: 'rows' },
    'Merge candidates B': { arrival: 'merge', caption: '4 / 4 RESULTS', packet: 'rows' },
    'Return ranked results': { client: client('results'), packet: 'rows' },
    'Return cached results': { client: client('results'), arrival: 'hit', caption: 'HIT' },
    'Return safe suggestions': { client: client('suggestions') },
  },
  files: {
    'Chunk and hash': {
      sourceState: client('uploading'),
      arrival: 'chunks',
      caption: '01 · 02 · 03 · 04 · 05',
      hold: 700,
    },
    'Check missing blocks': {
      arrival: 'deduplicate',
      caption: '02 + 05 ALREADY STORED',
      payload: 'hashes 01…05',
      hold: 700,
    },
    'Return upload plan': { client: client('deduplicated'), packet: 'json' },
    'Upload missing bytes directly': {
      packet: 'chunk',
      burst: 3,
      arrival: 'chunks',
      caption: 'UPLOAD 01 · 03 · 04',
    },
    'Commit file version': {
      arrival: 'write',
      caption: 'VERSION COMMITTED',
      client: client('uploaded'),
    },
    'Notify another device': { client: client('changes', 'rw-device'), packet: 'event' },
    'Verify and apply': { client: client('synced', 'rw-device'), arrival: 'reconcile' },
    'Report conflict resolution': { client: client('conflict', 'rw-device'), arrival: 'reconcile' },
  },
  music: {
    'Request track playback': { sourceState: client('loading'), packet: 'request' },
    'Return authorized audio URL': { client: client('manifest'), packet: 'json' },
    'Stream audio': {
      arrival: 'buffer',
      caption: 'AUDIO BUFFER READY',
      burst: 4,
      client: client('playing'),
    },
    'Render playlist': { client: client('playlist'), packet: 'rows' },
    'Return discovery rows': { client: client('recommendations'), packet: 'rows', arrival: 'rank' },
  },
  gaming: {
    'Join matchmaking queue': { sourceState: client('matching'), packet: 'request' },
    'Return session endpoint': { client: client('joining'), packet: 'json' },
    'Connect to game transport': {
      client: client('joined'),
      packet: 'input',
      caption: 'SESSION CONNECTED',
    },
    'Send sequenced input': {
      sourceState: client('predicted'),
      packet: 'input',
      burst: 3,
      caption: 'INPUT #42',
      arrival: 'predict',
    },
    'Advance authoritative tick': {
      arrival: 'reconcile',
      caption: 'SERVER TICK #42',
      packet: 'state',
    },
    'Reconcile local prediction': {
      client: client('reconciled'),
      arrival: 'reconcile',
      packet: 'state',
      burst: 3,
      caption: 'CORRECTED',
    },
    'Replicate to nearby player': {
      client: client('replicated', 'rw-peer'),
      arrival: 'replicate',
      packet: 'state',
      burst: 3,
    },
    'Recover a delayed snapshot': {
      client: client('reconciled'),
      arrival: 'reconcile',
      caption: 'NEWER SNAPSHOT',
    },
    'Confirm progression': { client: client('saved') },
  },
  payments: {
    'Submit payment key': { sourceState: client('validating'), packet: 'transaction' },
    'Claim or replay the key': {
      arrival: 'write',
      caption: 'ONE LOGICAL EFFECT',
      payload: 'idem:key_42',
    },
    'Evaluate the attempt': { arrival: 'authorize', caption: 'RISK CHECK' },
    'Request authorization': { arrival: 'authorize', caption: 'PROCESSOR PENDING' },
    'Return authorization status': {
      client: client('authorized'),
      packet: 'ack',
      caption: 'AUTHORIZED · NOT CAPTURED',
    },
    'Authorization accepted': {
      arrival: 'authorize',
      caption: 'AUTHORIZED · NOT CAPTURED',
    },
    'Authorization reply missing': {
      client: client('pending'),
      arrival: 'degraded',
      caption: 'OUTCOME UNKNOWN',
      hold: 800,
    },
    'Recover authorization result': {
      arrival: 'authorize',
      caption: 'ORIGINAL ATTEMPT',
    },
    'Record confirmed capture': {
      client: client('captured'),
      arrival: 'ledger',
      caption: 'DR 125.00 = CR 125.00',
      hold: 700,
    },
    'Record confirmed refund': {
      client: client('refunded'),
      arrival: 'ledger',
      caption: 'REFUND ENTRY',
      hold: 700,
    },
    'Record resolved settlement': {
      client: client('settled'),
      arrival: 'ledger',
      caption: 'SETTLED · AUDITED',
      hold: 700,
    },
    'Notify merchant': { arrival: 'enqueue', caption: 'SIGNED WEBHOOK', packet: 'event' },
  },
};

export function enrichScenarios(
  family: string,
  scenarios: Scenario[],
  nodes: ArchitectureNode[],
): Scenario[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return scenarios.map((scenario) => {
    const steps = scenario.steps.map((step, index) => {
      const target = byId.get(step.to);
      const cue = cues[family]?.[step.action] || {};
      let packet: SemanticPacket =
        step.edgeType === 'request'
          ? 'request'
          : step.edgeType === 'read'
            ? 'query'
            : step.edgeType === 'write'
              ? 'json'
              : step.edgeType === 'media'
                ? 'segment'
                : step.edgeType === 'ack'
                  ? 'ack'
                  : step.edgeType === 'replication'
                    ? 'state'
                    : step.edgeType === 'telemetry'
                      ? 'telemetry'
                      : 'event';
      let arrival: Activity =
        step.edgeType === 'read'
          ? 'read'
          : step.edgeType === 'write'
            ? 'write'
            : step.edgeType === 'replication'
              ? 'replicate'
              : step.edgeType === 'media'
                ? 'buffer'
                : step.edgeType === 'cache-hit'
                  ? 'hit'
                  : step.edgeType === 'cache-miss'
                    ? 'miss'
                    : 'process';
      if (step.to === 'rw-cache') {
        packet = step.edgeType === 'write' ? 'rows' : 'key';
        arrival = step.edgeType === 'write' ? 'write' : 'read';
      }
      if (step.to === 'rw-events') arrival = 'enqueue';
      else if (step.from === 'rw-events') arrival = 'consume';
      if (step.to === 'rw-rank' || step.to === 'rw-recommend') arrival = 'rank';
      if (step.edgeType === 'request' && index === 0) packet = packets[family] || 'request';
      if (family === 'chat' && step.edgeType === 'event') packet = 'message';
      const visual: StepVisual = {
        packet,
        payload: payloads[family] || 'request 42',
        arrival,
        caption: arrival.toUpperCase(),
        phase:
          step.condition && step.condition !== 'cache-hit' && step.condition !== 'cache-miss'
            ? 'RECOVERY'
            : step.edgeType === 'media'
              ? 'MEDIA'
              : ['event', 'telemetry'].includes(step.edgeType)
                ? 'ASYNC WORK'
                : ['read', 'write'].includes(step.edgeType)
                  ? 'DATA'
                  : 'REQUEST',
        latencyMs: latency[step.edgeType] || 12,
        ...cue,
      };
      const external = step.to === 'rw-processor';
      const duration =
        step.duration !== 2400
          ? step.duration
          : (external ? 2400 : pace[step.edgeType] || 1400) +
            (visual.hold || 0) +
            (step.parallelGroup ? (index % 2) * 160 : 0);
      return {
        ...step,
        duration,
        visual: {
          ...visual,
          latencyMs: external ? 180 : visual.latencyMs,
          ...(target?.category === 'data' && step.condition === 'slow-database'
            ? { latencyMs: 240 }
            : {}),
        },
      };
    });
    return { ...scenario, steps, estimatedDuration: steps.reduce((sum, s) => sum + s.duration, 0) };
  });
}

export function phaseFor(step: ScenarioStep) {
  return step.visual?.phase || 'REQUEST';
}
