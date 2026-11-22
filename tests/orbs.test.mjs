import test from 'node:test';
import assert from 'node:assert/strict';
import { ORB_LABELS } from '../docs/orbs.js';
test('orb strip covers the four declared domains',()=>assert.deepEqual(ORB_LABELS,['Cloud','DevOps','5G / RAN','Open source']));
