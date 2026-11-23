import test from 'node:test';
import assert from 'node:assert/strict';
import {phaseForHour,weatherForCode,weatherDescription,IP_PROVIDER_URLS,pickIpPlace} from '../docs/local-context.js';
test('scene phase changes at local-time boundaries, including midnight',()=>{
 for(const hour of [0,4.99,18,23.99])assert.equal(phaseForHour(hour),'twilight');
 for(const hour of [5,9.99])assert.equal(phaseForHour(hour),'morning');
 for(const hour of [10,15.99])assert.equal(phaseForHour(hour),'daylight');
 for(const hour of [16,17.99])assert.equal(phaseForHour(hour),'sunset');
 assert.equal(phaseForHour(24),'twilight');assert.equal(phaseForHour(NaN),'twilight');
});
test('all precipitation codes map to the correct animation, including hail and heavy thunder',()=>{
 const codes={drizzle:[51,53,56,61,80],rain:[55,57,63,66,81],'heavy-rain':[65,67,82],
   'light-snow':[71,77],snow:[73,85],'heavy-snow':[75,86],storm:[95,97],hail:[96,99],
   cloudy:[2,3],fog:[45,48],clear:[0,1,null,999]};
 for(const [kind,values] of Object.entries(codes))for(const code of values)assert.equal(weatherForCode(code),kind);
});
test('no-precipitation mode does not mislabel clouds or fog as clear weather',()=>{
 assert.equal(weatherDescription(3),'Overcast');assert.equal(weatherDescription(45),'Fog');assert.equal(weatherDescription(999),'Weather unavailable');assert.equal(weatherDescription(null),'Weather unavailable');
});
test('IP lookup falls back to a second provider when the first one is blocked',()=>{
 assert.equal(IP_PROVIDER_URLS[0],'https://ipapi.co/json/');
 assert.equal(IP_PROVIDER_URLS[1],'https://freeipapi.com/api/json');
 assert.equal(IP_PROVIDER_URLS.length,2);
});
test('each IP provider maps its own response shape onto latitude, longitude and city',()=>{
 const primary=pickIpPlace(0,{latitude:23.8,longitude:90.4,city:'Dhaka',region:'Dhaka Division'});
 assert.equal(primary.latitude,23.8);assert.equal(primary.longitude,90.4);assert.equal(primary.city,'Dhaka');
 const fallback=pickIpPlace(1,{latitude:23.81,longitude:90.37,cityName:'Dhaka (Mirpur)',regionName:'Dhaka Division'});
 assert.equal(fallback.latitude,23.81);assert.equal(fallback.longitude,90.37);assert.equal(fallback.city,'Dhaka (Mirpur)');
});
test('an IP provider without a city still yields a usable approximate area',()=>{
 assert.equal(pickIpPlace(0,{latitude:23.8,longitude:90.4}).city,undefined);
 assert.equal(pickIpPlace(1,{latitude:23.8,longitude:90.4,regionName:'Dhaka Division'}).city,'Dhaka Division');
});
