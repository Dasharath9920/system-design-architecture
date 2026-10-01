import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flowStepBounds, focusFlowStep } from '../src/experience/flowCamera';

test('flow bounds include all parallel destinations and room for routed edges', () => {
  const bounds = flowStepBounds(['a', 'b', 'c', 'b', 'absent'], {
    a: { x: 0, y: 100 },
    b: { x: 500, y: 0 },
    c: { x: 500, y: 500 },
  })!;
  assert.equal(bounds.x, -40);
  assert.equal(bounds.y, -40);
  assert.ok(bounds.width > 700 && bounds.height > 600);
  assert.equal(flowStepBounds(['absent'], {}), null);
});
test('active interaction uses 76 percent of the limiting dimension with sensible zoom caps', () => {
  const b = { x: 100, y: 100, width: 1000, height: 400 };
  const v = focusFlowStep(b, { width: 1200, height: 700 }, { x: 0, y: 0, zoom: 0.2 })!;
  assert.equal(v.zoom, 0.912);
  assert.equal((b.width * v.zoom) / 1200, 0.76);
  assert.equal(v.x + (b.x + b.width / 2) * v.zoom, 600);
  assert.equal(focusFlowStep(b, { width: 1200, height: 700 }, v), null);
  const close = focusFlowStep(
    { x: 0, y: 0, width: 220, height: 120 },
    { width: 1440, height: 900 },
    { x: 0, y: 0, zoom: 0.2 },
  )!;
  assert.equal(close.zoom, 1.25);
  assert.equal(
    focusFlowStep(
      { x: 0, y: 0, width: 220, height: 120 },
      { width: 1440, height: 900 },
      { x: 0, y: 0, zoom: 0.2 },
      true,
    )!.zoom,
    1.4,
  );
});
test('long-distance mobile interactions fit without a scenario-specific camera coordinate', () => {
  const b = flowStepBounds(['a', 'b'], { a: { x: -300, y: 80 }, b: { x: 2500, y: 650 } })!;
  const v = focusFlowStep(b, { width: 390, height: 430 }, { x: 0, y: 0, zoom: 1 })!;
  assert.ok(v.zoom >= 0.08 && v.zoom < 0.15);
  assert.ok(v.x + b.x * v.zoom >= 0);
  assert.ok(v.x + (b.x + b.width) * v.zoom <= 390);
});
