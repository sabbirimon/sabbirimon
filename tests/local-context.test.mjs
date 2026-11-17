import test from 'node:test';
import assert from 'node:assert/strict';
import {phaseForHour,weatherForCode,weatherDescription} from '../docs/local-context.js';
test('scene phase changes at local-time boundaries, including midnight',()=>{
 for(const hour of [0,4.99,18,23.99])assert.equal(phaseForHour(hour),'twilight');
 for(const hour of [5,9.99])assert.equal(phaseForHour(hour),'morning');
 for(const hour of [10,15.99])assert.equal(phaseForHour(hour),'daylight');
 for(const hour of [16,17.99])assert.equal(phaseForHour(hour),'sunset');
 assert.equal(phaseForHour(24),'twilight');assert.equal(phaseForHour(NaN),'twilight');
});
test('all precipitation codes map to the correct animation, including hail and heavy thunder',()=>{
 for(const code of [51,53,55,56,57,61,63,65,66,67,80,81,82])assert.equal(weatherForCode(code),'rain');
 for(const code of [71,73,75,77,85,86])assert.equal(weatherForCode(code),'snow');
 for(const code of [95,96,97,99])assert.equal(weatherForCode(code),'storm');
 for(const code of [0,1,2,3,45,48,null,999])assert.equal(weatherForCode(code),'clear');
});
test('no-precipitation mode does not mislabel clouds or fog as clear weather',()=>{
 assert.equal(weatherDescription(3),'Overcast');assert.equal(weatherDescription(45),'Fog');assert.equal(weatherDescription(999),'Weather unavailable');assert.equal(weatherDescription(null),'Weather unavailable');
});
