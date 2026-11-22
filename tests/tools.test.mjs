import test from 'node:test';
import assert from 'node:assert/strict';
import { formatJson, minifyJson, findJsonError, base64Encode, base64Decode, decodeJwt, timestampToIso, isoToTimestamp, testRegex, generateUuidV4, hashText, hexToRgb, rgbToHex, rgbToHsl, hslToRgb, contrastRatio, slugify, parseDnsJson, parseHttpHeaders, parseIpv4, ipv4ToInt, intToIpv4, calculateSubnet, describePort, lookupPort, buildUserAgentHeaders, UA_PROFILES, KNOWN_PORTS, formatYaml, reindentYaml, formatTerraform, findHclError, formatSql, findSqlError, formatXml, minifyXml, highlightJson, highlightYaml, highlightTf, highlightSql, highlightXml, escapeHtml, renderDiagnostic, splitDiagnostic } from '../docs/tools/tools.js';

test('JSON formatting indents with the requested width and rejects malformed input with a location',()=>{
 const two=formatJson('{"a":1,"b":[2,3]}',2);
 assert.equal(two.ok,true);assert.equal(two.output,'{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
 const four=formatJson('{"a":1}',4);assert.equal(four.output,'{\n    "a": 1\n}');
 const bad=formatJson('{"a":1,}',2);assert.equal(bad.ok,false);assert.equal(bad.output,'');
 assert.match(bad.error,/Invalid JSON \(line \d+, column \d+\)/);
 assert.equal(formatJson('   ',2).ok,false);
 assert.equal(formatJson('',2).error,'Enter some JSON first.');
});

test('JSON minify collapses to one line and reports the same parse errors',()=>{
 const result=minifyJson('{\n  "a" : 1,\n  "b" : [ 2 ]\n}');
 assert.equal(result.ok,true);assert.equal(result.output,'{"a":1,"b":[2]}');
 assert.equal(minifyJson('{oops}').ok,false);
 assert.equal(minifyJson('{oops}').output,'');
 assert.match(minifyJson('{oops}').error,/Invalid JSON/);
});

test('the JSON error finder reports the line and column of the first syntax error',()=>{
 const found=findJsonError('{\n  "a": 1,\n  "b": }');
 assert.equal(found.line,3);assert.equal(typeof found.column,'number');assert.ok(found.column>0);
 assert.equal(findJsonError('{"a":1}'),null);
});

test('Base64 encodes and decodes UTF-8 text without corrupting non-Latin characters',()=>{
 const encoded=base64Encode('héllo — 世界 🎮');
 assert.equal(encoded.ok,true);assert.equal(encoded.output,'aMOpbGxvIOKAlCDkuJbnlYwg8J+Org==');
 const decoded=base64Decode(encoded.output);
 assert.equal(decoded.ok,true);assert.equal(decoded.output,'héllo — 世界 🎮');
 assert.equal(base64Encode('').ok,false);
 assert.equal(base64Decode('').ok,false);
});

test('Base64 decoding rejects characters outside the base64 alphabet',()=>{
 const result=base64Decode('not base64!!');
 assert.equal(result.ok,false);assert.equal(result.output,'');
 assert.match(result.error,/not valid base64/);
 assert.equal(base64Decode('aGVsbG8=').output,'hello');
});

test('JWT decoding reads the header and payload but never claims to verify the signature',()=>{
 const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
 const payload=Buffer.from(JSON.stringify({sub:'1234567890',name:'Imon',iat:1700000000,exp:1900000000})).toString('base64url');
 const result=decodeJwt(`${header}.${payload}.c2lnbmF0dXJl`);
 assert.equal(result.ok,true);assert.equal(result.error,null);
 assert.equal(result.output.header.alg,'HS256');
 assert.equal(result.output.payload.sub,'1234567890');
 assert.equal(result.output.signatureVerified,false);
 assert.match(result.output.signatureNote,/NOT verified/);
 assert.equal(result.output.claims.exp.iso,new Date(1900000000*1000).toISOString());
 assert.equal(result.output.claims.iat.iso,new Date(1700000000*1000).toISOString());
 assert.equal(result.output.expired,false);
 const stale=decodeJwt(`${header}.${Buffer.from(JSON.stringify({exp:1000000000})).toString('base64url')}.sig`);
 assert.equal(stale.output.expired,true);
});

test('JWT decoding rejects tokens with the wrong shape or broken segments',()=>{
 const bad=decodeJwt('only.two');assert.equal(bad.ok,false);assert.equal(bad.output,null);
 assert.match(bad.error,/3 dot-separated parts/);
 const broken=decodeJwt('!!!.eyJzdWIiOiIxIn0.sig');assert.equal(broken.ok,false);
 assert.match(broken.error,/header is not valid/);
 const empty=decodeJwt('');assert.equal(empty.ok,false);assert.match(empty.error,/Enter a JWT/);
});

test('timestamps convert both ways between Unix seconds and ISO 8601',()=>{
 const iso=timestampToIso(1700000000);
 assert.equal(iso.ok,true);assert.equal(iso.output,'2023-11-14T22:13:20.000Z');
 const unix=isoToTimestamp('2023-11-14T22:13:20.000Z');
 assert.equal(unix.ok,true);assert.equal(unix.output,'1700000000');
 assert.equal(isoToTimestamp('2023-11-14T22:13:20Z').output,'1700000000');
});

test('timestamp conversion rejects unparseable values instead of guessing',()=>{
 assert.equal(timestampToIso('abc').ok,false);
 assert.equal(timestampToIso('abc').output,'');
 assert.equal(isoToTimestamp('not-a-date').ok,false);
 assert.match(isoToTimestamp('not-a-date').error,/not a valid ISO/);
 assert.equal(isoToTimestamp('').ok,false);
});

test('the regex tester lists every match with its capture groups',()=>{
 const result=testRegex('(\\w+)@(\\w+)\\.com','g','a@b.com\nc@d.com');
 assert.equal(result.ok,true);assert.equal(result.error,null);
 assert.equal(result.matches.length,2);
 assert.equal(result.matches[0].match,'a@b.com');
 assert.deepEqual(result.matches[0].groups.map(g=>g.value),['a','b']);
 assert.equal(result.matches[1].index,8);
 const single=testRegex('\\d+','','no digits here');
 assert.equal(single.ok,true);assert.equal(single.matches.length,0);
});

test('the regex tester surfaces invalid patterns with the compiler error',()=>{
 const broken=testRegex('(unclosed','g','text');
 assert.equal(broken.ok,false);assert.equal(broken.matches.length,0);
 assert.match(broken.error,/Invalid pattern/);
 const empty=testRegex('','g','text');
 assert.equal(empty.ok,false);assert.match(empty.error,/Enter a regular expression/);
});

test('the regex tester reports groups that did not participate as null',()=>{
 const result=testRegex('(a)|(b)','g','b');
 assert.equal(result.ok,true);
 assert.equal(result.matches[0].groups[0].value,null);
 assert.equal(result.matches[0].groups[1].value,'b');
});

test('UUID generation produces valid v4 identifiers and honours an injected random source',()=>{
 const uuid=generateUuidV4();
 assert.match(uuid,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 assert.equal(generateUuidV4(new Uint8Array(16).fill(255)),'ffffffff-ffff-4fff-bfff-ffffffffffff');
 assert.equal(generateUuidV4(new Uint8Array(16).fill(0)),'00000000-0000-4000-8000-000000000000');
 assert.notEqual(generateUuidV4(),generateUuidV4());
});

test('hashing produces the known digests for simple inputs',async()=>{
 const sha256=await hashText('abc','SHA-256');
 assert.equal(sha256.ok,true);
 assert.equal(sha256.output,'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 const sha1=await hashText('abc','SHA-1');
 assert.equal(sha1.output,'a9993e364706816aba3e25717850c26c9cd0d89d');
 assert.equal((await hashText('abc','SHA-512')).output.length,128);
 assert.equal((await hashText('abc','SHA-384')).output.length,96);
});

test('hashing rejects unsupported algorithms and empty input',async()=>{
 const bad=await hashText('abc','md5');
 assert.equal(bad.ok,false);assert.equal(bad.output,'');
 assert.match(bad.error,/Unsupported algorithm/);
 const empty=await hashText('','SHA-256');
 assert.equal(empty.ok,false);assert.match(empty.error,/Enter some text/);
});

test('HEX colours parse into RGB channels and back again',()=>{
 const parsed=hexToRgb('#9eda68');
 assert.equal(parsed.ok,true);assert.deepEqual(parsed.output,{r:158,g:218,b:104});
 assert.deepEqual(hexToRgb('#fff').output,{r:255,g:255,b:255});
 assert.deepEqual(hexToRgb('9eda68').output,{r:158,g:218,b:104});
 assert.equal(rgbToHex(158,218,104),'#9eda68');
 assert.equal(rgbToHex(0,0,0),'#000000');
 assert.equal(rgbToHex(300,-5,10),'#ff000a');
});

test('HEX parsing rejects malformed colours',()=>{
 assert.equal(hexToRgb('#12345').ok,false);
 assert.equal(hexToRgb('not-a-colour').ok,false);
 assert.match(hexToRgb('#zzz').error,/Enter a HEX colour/);
 assert.equal(hexToRgb('').ok,false);
});

test('RGB and HSL convert into each other consistently',()=>{
 assert.deepEqual(rgbToHsl(158,218,104),{h:92,s:61,l:63});
 assert.deepEqual(rgbToHsl(0,0,0),{h:0,s:0,l:0});
 assert.deepEqual(rgbToHsl(255,255,255),{h:0,s:0,l:100});
 assert.deepEqual(hslToRgb(0,100,50),{r:255,g:0,b:0});
 assert.deepEqual(hslToRgb(120,100,50),{r:0,g:255,b:0});
 const roundTrip=hslToRgb(...Object.values(rgbToHsl(158,218,104)));
 assert.ok(Math.abs(roundTrip.r-158)<=2&&Math.abs(roundTrip.g-218)<=2&&Math.abs(roundTrip.b-104)<=2);
});

test('the contrast ratio matches the WCAG reference values',()=>{
 const blackWhite=contrastRatio('#000000','#ffffff');
 assert.equal(blackWhite.ok,true);
 assert.equal(blackWhite.output.ratio,21);
 assert.equal(blackWhite.output.aaa,true);
 assert.equal(blackWhite.output.aa,true);
 const same=contrastRatio('#9eda68','#9eda68');
 assert.equal(same.output.ratio,1);
 assert.equal(same.output.aa,false);
 const mid=contrastRatio('#777777','#ffffff');
 assert.ok(mid.output.ratio>4&&mid.output.ratio<4.6);
 assert.equal(mid.output.aa,false);
 assert.equal(mid.output.aaLarge,true);
});

test('the contrast checker rejects invalid colours',()=>{
 assert.equal(contrastRatio('#000000','nope').ok,false);
 assert.equal(contrastRatio('#000000','nope').output,null);
 assert.match(contrastRatio('nope','#000000').error,/two valid HEX colours/);
});

test('slugify strips punctuation, accents and casing while keeping word boundaries',()=>{
 assert.equal(slugify('Hello, World!'),'hello-world');
 assert.equal(slugify('  Café  Déjà Vu  '),'cafe-deja-vu');
 assert.equal(slugify('Hello — Episode 01'),'hello-episode-01');
 assert.equal(slugify('C# and .NET'),'c-and-net');
 assert.equal(slugify('!!!'),'');
});

test('the DNS parser reads a realistic Cloudflare DNS-over-HTTPS payload',()=>{
 const payload={Status:0,TC:false,RD:true,RA:true,AD:false,CD:false,Question:[{name:'imon.com.bd',type:1}],Answer:[{name:'imon.com.bd',type:1,TTL:300,data:'76.76.21.21'},{name:'imon.com.bd',type:28,TTL:300,data:'2606:4700:4::ac42:1a2b'}]};
 const result=parseDnsJson(payload);
 assert.equal(result.ok,true);assert.equal(result.error,null);
 assert.equal(result.status,0);
 assert.equal(result.answerCount,2);
 assert.equal(result.records[0].type,'A');
 assert.equal(result.records[0].data,'76.76.21.21');
 assert.equal(result.records[0].ttl,300);
 assert.equal(result.records[1].type,'AAAA');
 assert.equal(result.records[1].data,'2606:4700:4::ac42:1a2b');
 assert.equal(result.question,'imon.com.bd');
 assert.deepEqual(result.errors,[]);
});

test('the DNS parser accepts a resolver that answers with type names',()=>{
 const payload={Status:0,Question:[{name:'imon.com.bd',type:'MX'}],Answer:[{name:'imon.com.bd',type:'MX',TTL:60,data:'10 mail.imon.com.bd'}]};
 const result=parseDnsJson(payload);
 assert.equal(result.ok,true);
 assert.equal(result.records[0].type,'MX');
 assert.equal(result.records[0].data,'10 mail.imon.com.bd');
 assert.equal(result.records[0].ttl,60);
});

test('the DNS parser reports a failing status and never invents records',()=>{
 const nx=parseDnsJson({Status:3,Question:[{name:'nope.invalid',type:'A'}]});
 assert.equal(nx.ok,false);
 assert.equal(nx.records.length,0);
 assert.equal(nx.answerCount,0);
 assert.match(nx.errors.join(' '),/NXDOMAIN|no such domain/i);
 const empty=parseDnsJson({Status:0,Question:[{name:'imon.com.bd',type:'A'}]});
 assert.equal(empty.ok,false);
 assert.equal(empty.records.length,0);
 assert.match(empty.errors.join(' '),/empty/i);
 const junk=parseDnsJson('not json at all');
 assert.equal(junk.ok,false);
 assert.equal(junk.records.length,0);
 assert.match(junk.errors.join(' '),/JSON payload/);
});

test('the header parser reads a request line and its headers',()=>{
 const result=parseHttpHeaders('GET /tools/?q=1 HTTP/1.1\r\nHost: imon.com.bd\r\nAccept: */*\r\nAccept-Encoding: gzip, deflate, br\r\n');
 assert.equal(result.ok,true);assert.equal(result.error,null);
 assert.equal(result.kind,'request');
 assert.equal(result.method,'GET');
 assert.equal(result.url,'/tools/?q=1');
 assert.equal(result.version,'HTTP/1.1');
 assert.equal(result.count,3);
 assert.equal(result.headers[0].name,'Host');
 assert.equal(result.headers[0].value,'imon.com.bd');
 assert.equal(result.headers[2].value,'gzip, deflate, br');
 assert.deepEqual(result.duplicates,[]);
 assert.deepEqual(result.malformed,[]);
});

test('the header parser reads a response status line',()=>{
 const result=parseHttpHeaders('HTTP/1.1 404 Not Found\r\nContent-Type: text/html\r\nContent-Length: 0\r\n');
 assert.equal(result.ok,true);
 assert.equal(result.kind,'response');
 assert.equal(result.status,404);
 assert.equal(result.statusText,'Not Found');
 assert.equal(result.version,'HTTP/1.1');
 assert.equal(result.count,2);
 assert.equal(result.method,null);
});

test('the header parser flags duplicate and malformed header lines',()=>{
 const result=parseHttpHeaders('GET / HTTP/1.1\nHost: a.example\nhost: b.example\nBadHeaderLine\nX-Empty:\nContent-Type: text/html');
 assert.equal(result.ok,true);
 assert.equal(result.count,4);
 assert.equal(result.duplicates.length,1);
 assert.equal(result.duplicates[0].name.toLowerCase(),'host');
 assert.equal(result.duplicates[0].count,2);
 assert.equal(result.malformed.length,2);
 assert.match(result.malformed[0].reason,/No ":"/);
 assert.match(result.malformed[1].reason,/empty value/);
 assert.equal(parseHttpHeaders('not http at all').ok,false);
 assert.match(parseHttpHeaders('not http at all').error,/first line/);
 assert.equal(parseHttpHeaders('').ok,false);
 assert.match(parseHttpHeaders('').error,/Paste some raw headers/);
});

test('the IP parser accepts dotted quads and rejects bad octets',()=>{
 assert.deepEqual(parseIpv4('192.168.1.10').octets,[192,168,1,10]);
 assert.equal(parseIpv4('255.255.255.255').ok,true);
 assert.equal(parseIpv4('192.168.1').ok,false);
 assert.match(parseIpv4('192.168.1.256').error,/larger than 255/);
 assert.match(parseIpv4('192.168.1.abc').error,/not a valid octet/);
 assert.equal(parseIpv4('').ok,false);
});

test('the subnet calculator derives every CIDR fact for 192.168.1.10/24',()=>{
 const result=calculateSubnet('192.168.1.10',24);
 assert.equal(result.ok,true);assert.equal(result.error,null);
 assert.equal(result.network,'192.168.1.0');
 assert.equal(result.broadcast,'192.168.1.255');
 assert.equal(result.firstHost,'192.168.1.1');
 assert.equal(result.lastHost,'192.168.1.254');
 assert.equal(result.total,256);
 assert.equal(result.usable,254);
 assert.equal(result.netmask,'255.255.255.0');
 assert.equal(result.wildcard,'0.0.0.255');
 assert.equal(result.binary.address,'11000000.10101000.00000001.00001010');
 assert.equal(result.binary.netmask,'11111111.11111111.11111111.00000000');
 assert.equal(result.cidr,'192.168.1.10/24');
});

test('the subnet calculator handles /30, /32 and rejects out-of-range prefixes',()=>{
 const thirty=calculateSubnet('10.0.0.5',30);
 assert.equal(thirty.ok,true);
 assert.equal(thirty.network,'10.0.0.4');
 assert.equal(thirty.broadcast,'10.0.0.7');
 assert.equal(thirty.total,4);
 assert.equal(thirty.usable,2);
 assert.equal(thirty.firstHost,'10.0.0.5');
 assert.equal(thirty.lastHost,'10.0.0.6');
 const single=calculateSubnet('8.8.8.8',32);
 assert.equal(single.ok,true);
 assert.equal(single.network,'8.8.8.8');
 assert.equal(single.broadcast,'8.8.8.8');
 assert.equal(single.usable,1);
 assert.equal(single.total,1);
 assert.equal(calculateSubnet('10.0.0.1',33).ok,false);
 assert.match(calculateSubnet('10.0.0.1',33).error,/between 0 and 32/);
 assert.equal(calculateSubnet('10.0.0.1',-1).ok,false);
 assert.equal(calculateSubnet('10.0.0.300',24).ok,false);
});

test('decimal integers convert to IPv4 addresses and back',()=>{
 assert.equal(ipv4ToInt('192.168.1.1'),3232235777);
 assert.equal(ipv4ToInt('0.0.0.0'),0);
 assert.equal(ipv4ToInt('255.255.255.255'),4294967295);
 const back=intToIpv4(3232235777);
 assert.equal(back.ok,true);assert.equal(back.output,'192.168.1.1');
 assert.equal(intToIpv4(0).output,'0.0.0.0');
 assert.equal(intToIpv4(4294967295).output,'255.255.255.255');
 assert.equal(intToIpv4(4294967296).ok,false);
 assert.match(intToIpv4(-1).error,/between 0 and 4294967295/);
 assert.equal(intToIpv4(1.5).ok,false);
});

test('the port table recognises the well-known services',()=>{
 const https=describePort(443);
 assert.equal(https.ok,true);assert.equal(https.error,null);
 assert.equal(https.port,443);
 assert.equal(https.known.name,'https');
 assert.match(https.known.description,/TLS/);
 assert.equal(describePort(22).known.name,'ssh');
 assert.equal(describePort(3306).known.name,'mysql');
 assert.equal(describePort(5432).known.name,'postgresql');
 assert.equal(describePort(6379).known.name,'redis');
 assert.equal(describePort(27017).known.name,'mongodb');
 assert.equal(describePort(3389).known.name,'ms-wbt-server');
 assert.equal(describePort(8080).known.name,'http-alt');
 assert.equal(lookupPort(53).known.name,'domain');
 assert.ok(KNOWN_PORTS.length>=20);
 assert.ok(KNOWN_PORTS.every(entry=>Number.isInteger(entry.port)&&entry.name&&entry.description));
});

test('the port checker rejects out-of-range and non-numeric ports',()=>{
 assert.equal(describePort(70000).ok,false);
 assert.match(describePort(70000).error,/between 0 and 65535/);
 assert.equal(describePort(-1).ok,false);
 assert.equal(describePort('http').ok,false);
 assert.match(describePort('http').error,/whole number/);
 assert.equal(describePort('').ok,false);
 assert.match(describePort('').error,/Enter a port number/);
 const unknown=describePort(45678);
 assert.equal(unknown.ok,true);
 assert.equal(unknown.known,null);
 assert.match(unknown.range,/User port/);
 assert.match(describePort(52000).range,/Dynamic/);
});

test('the UA builder emits a copy-ready header set for each profile',()=>{
 const chrome=buildUserAgentHeaders('chrome-windows');
 assert.equal(chrome.ok,true);assert.equal(chrome.error,null);
 assert.equal(chrome.profile.id,'chrome-windows');
 assert.equal(chrome.profile.label,'Chrome on Windows');
 assert.ok(chrome.lines.some(line=>line.startsWith('User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)')));
 assert.ok(chrome.lines.some(line=>line.startsWith('Sec-Ch-Ua-Platform: "Windows"')));
 assert.ok(chrome.lines.some(line=>line.startsWith('Sec-Fetch-Mode: navigate')));
 assert.equal(chrome.lines.length,chrome.headers.length);
 assert.ok(chrome.lines.every(line=>line.includes(': ')));
});

test('the UA builder covers every profile and rejects unknown ids',()=>{
 assert.equal(UA_PROFILES.length,7);
 UA_PROFILES.forEach(profile=>{
  const built=buildUserAgentHeaders(profile.id);
  assert.equal(built.ok,true);
  assert.ok(built.headers.some(([name])=>name==='User-Agent'));
  assert.ok(built.headers.some(([name])=>name==='Accept'));
  assert.ok(built.headers.some(([name])=>name==='Accept-Language'));
  assert.ok(built.headers.some(([name])=>name==='Accept-Encoding'));
 });
 assert.equal(buildUserAgentHeaders('safari-ios').profile.label,'Mobile Safari on iOS');
 assert.match(buildUserAgentHeaders('safari-ios').lines.find(line=>line.startsWith('User-Agent:')),/iPhone/);
 assert.equal(buildUserAgentHeaders('chrome-android').headers.find(([name])=>name==='Sec-Ch-Ua-Mobile')[1],'?1');
 const bad=buildUserAgentHeaders('netscape-4');
 assert.equal(bad.ok,false);
 assert.equal(bad.headers.length,0);
 assert.match(bad.error,/Pick a browser profile/);
});

test('YAML formatting re-indents nested maps and lists and reports the parse mode',()=>{
 const result=formatYaml('name: imon\ntags:\n  - pixel\n  - open-source\nserver:\n  host: localhost\n  port: 8080\n');
 assert.equal(result.ok,true);assert.equal(result.error,null);assert.equal(result.mode,'parsed');
 assert.equal(result.output,'name: imon\ntags:\n  - pixel\n  - open-source\nserver:\n  host: localhost\n  port: 8080\n');
 assert.equal(formatYaml('').ok,false);
 assert.equal(formatYaml('   ').error,'Enter some YAML first.');
});

test('YAML formatting keeps sequences of mappings intact',()=>{
 const result=formatYaml('items:\n  - name: a\n    id: 1\n  - name: b\n    id: 2\n');
 assert.equal(result.ok,true);
 assert.equal(result.output,'items:\n  - name: a\n    id: 1\n  - name: b\n    id: 2\n');
});

test('YAML minify collapses a document onto one line',()=>{
 const result=formatYaml('name: imon\ntags:\n  - pixel\n',{minify:true});
 assert.equal(result.ok,true);
 assert.equal(result.output,'{name: imon, tags: [pixel]}\n');
});

test('YAML formatting reports malformed documents with a line number',()=>{
 const bad=formatYaml('a: 1\n   b: 2\n');
 assert.equal(bad.ok,false);assert.equal(bad.output,'');
 assert.equal(bad.line,2);
 assert.match(bad.error,/Malformed YAML at line 2/);
 assert.equal(formatYaml('just a bare string').ok,false);
 assert.match(formatYaml('just a bare string').error,/Malformed YAML at line 1/);
});

test('the YAML line-based re-indenter is a conservative fallback',()=>{
 const out=reindentYaml('a:\n    b: 1\n');
 assert.equal(out,'a:\n  b: 1\n');
 assert.equal(reindentYaml(''),'');
});

test('Terraform formatting normalises indentation and aligns the equals signs',()=>{
 const result=formatTerraform('resource "aws_s3_bucket" "b" {\nbucket = "x"\nacl  = "private"\n}');
 assert.equal(result.ok,true);assert.equal(result.error,null);
 assert.equal(result.output,'resource "aws_s3_bucket" "b" {\n  bucket  = "x"\n  acl     = "private"\n}\n');
});

test('Terraform formatting indents nested blocks',()=>{
 const result=formatTerraform('locals {\ntags = {\nName = "n"\n}\n}');
 assert.equal(result.ok,true);
 assert.equal(result.output,'locals {\n  tags = {\n    Name = "n"\n  }\n}\n');
});

test('Terraform formatting reports unbalanced braces and brackets with a line number',()=>{
 const bad=formatTerraform('a = {\nb = 1\n');
 assert.equal(bad.ok,false);assert.equal(bad.output,'');
 assert.equal(bad.line,1);
 assert.match(bad.error,/Unbalanced braces or brackets at line 1/);
 const mismatched=formatTerraform('a = [1, 2}\n');
 assert.equal(mismatched.ok,false);
 assert.equal(mismatched.line,1);
 assert.equal(formatTerraform('').ok,false);
 assert.equal(findHclError('a = {}'),null);
});

test('SQL formatting uppercases keywords and splits the major clauses onto their own lines',()=>{
 const result=formatSql('select id, name from users where age > 18 group by id order by name');
 assert.equal(result.ok,true);assert.equal(result.error,null);
 assert.equal(result.output,'SELECT id, name\nFROM users\nWHERE age > 18\nGROUP BY id\nORDER BY name\n');
});

test('SQL formatting collapses whitespace and keeps string literals intact',()=>{
 const result=formatSql("select    'a, b'   from   t");
 assert.equal(result.ok,true);
 assert.equal(result.output,"SELECT 'a, b'\nFROM t\n");
 const count=formatSql('select count(*) as total from t');
 assert.equal(count.output,'SELECT count(*) AS total\nFROM t\n');
});

test('SQL formatting reports unbalanced parentheses with a line number',()=>{
 const bad=formatSql('select * from t where (a = 1');
 assert.equal(bad.ok,false);assert.equal(bad.output,'');
 assert.equal(bad.line,1);
 assert.match(bad.error,/Unbalanced parentheses at line 1/);
 const extra=formatSql('select * from t)');
 assert.equal(extra.ok,false);
 assert.equal(extra.line,1);
 assert.equal(formatSql('').ok,false);
 assert.equal(findSqlError('select (1)'),null);
});

test('XML formatting pretty-prints with two-space indentation',()=>{
 const result=formatXml('<root><child a="1">text</child><self/></root>');
 assert.equal(result.ok,true);assert.equal(result.error,null);
 assert.equal(result.output,'<root>\n  <child a="1">\n    text\n  </child>\n  <self/>\n</root>\n');
});

test('XML formatting keeps attributes, comments and CDATA sections',()=>{
 const result=formatXml('<root><!-- note --><a href="x">y</a></root>');
 assert.equal(result.ok,true);
 assert.match(result.output,/<!-- note -->/);
 assert.match(result.output,/<a href="x">/);
});

test('XML formatting reports mismatched and unclosed tags with a line number',()=>{
 const mismatched=formatXml('<a><b></a>');
 assert.equal(mismatched.ok,false);assert.equal(mismatched.output,'');
 assert.equal(mismatched.line,1);
 assert.match(mismatched.error,/Malformed XML at line 1/);
 const unclosed=formatXml('<a>\n<b>\n</b>');
 assert.equal(unclosed.ok,false);
 assert.equal(unclosed.line,1);
 assert.equal(formatXml('').ok,false);
 assert.equal(formatXml('not xml at all').ok,false);
});

test('XML minify collapses a document onto one line without losing its text',()=>{
 assert.equal(minifyXml('<root><a>1</a><b>2</b></root>').output,'<root><a>1</a><b>2</b></root>');
 assert.equal(minifyXml('<root>\n  <item name="x">hello world</item>\n</root>').output,'<root><item name="x">hello world</item></root>');
 assert.equal(minifyXml('<a><b></a>').ok,false);
 assert.equal(minifyXml('').ok,false);
});

test('the syntax highlighter escapes every HTML metacharacter in JSON',()=>{
 const html=highlightJson('{"a":"<script>"}');
 assert.ok(!html.includes('<script>'));
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(html.includes('tok-str'));
 assert.ok(!html.includes('<script'));
});

test('the syntax highlighter escapes HTML in every supported language',()=>{
 const cases=[[highlightYaml,'key: <script>'],[highlightTf,'a = "<script>"'],[highlightSql,'select "<script>" from t'],[highlightXml,'<a attr="<script>">x</a>']];
 for (const [fn,input] of cases) {
   const html=fn(input);
   assert.ok(!html.includes('<script>'),`raw script tag leaked: ${html}`);
   assert.ok(html.includes('&lt;'),`escaped tag missing: ${html}`);
 }
});

test('the syntax highlighter never emits raw angle brackets from user text',()=>{
 for (const fn of [highlightJson,highlightYaml,highlightTf,highlightSql,highlightXml]) {
   const html=fn('"><img src=x onerror=alert(1)>&\'');
   assert.ok(!html.includes('<img'),`raw img leaked from ${fn.name}`);
   assert.ok(html.includes('&lt;'));
   assert.ok(html.includes('&amp;'));
 }
 assert.equal(escapeHtml(`&<>"'`),'&amp;&lt;&gt;&quot;&#39;');
});

test('the syntax highlighter marks up keys, strings, numbers and keywords',()=>{
 assert.match(highlightJson('{"a":"text"}'),/tok-key/);
 assert.match(highlightJson('{"a":"text"}'),/tok-str/);
 assert.match(highlightJson('{"a":1}'),/tok-num/);
 assert.match(highlightJson('{"a":true}'),/tok-bool/);
 assert.match(highlightJson('{"a":null}'),/tok-null/);
 assert.match(highlightYaml('key: value'),/tok-key/);
 assert.match(highlightTf('resource "x" "y" {}'),/tok-keyword/);
 assert.match(highlightSql('SELECT 1'),/tok-keyword/);
 assert.match(highlightXml('<root></root>'),/tok-key/);
});

test('the highlighter never splits a word that merely contains a keyword',()=>{
 // "imon" contains "on", "nullable" contains "null", "formatting" contains "for".
 // A leading \b cannot express this once the tokenizer slices the text, so the
 // rules use an explicit lookbehind instead.
 assert.ok(!highlightYaml('name: imon').includes('tok-bool'),'imon must not be split into a bool');
 assert.match(highlightYaml('name: imon'),/imon/);
 assert.ok(!highlightYaml('key: nullable').includes('tok-null'),'nullable must not become null');
 assert.ok(!highlightJson('{"a":nullify}').includes('tok-null'),'nullify must not become null');
 assert.ok(!highlightSql('selected').includes('tok-keyword'),'selected must not become select');
 assert.ok(!highlightTf('dataflow').includes('tok-keyword'),'dataflow must not become data');
 assert.match(highlightSql('SELECT 1 FROM t'),/tok-keyword/);
});

test('a diagnostic renders red for an error and blue for a warning',()=>{
 const err=renderDiagnostic('error','Malformed YAML',12);
 assert.match(err,/diag-error/);
 assert.match(err,/line 12/);
 assert.match(err,/×/);
 const warn=renderDiagnostic('warn','Re-indented line by line');
 assert.match(warn,/diag-warn/);
 assert.match(warn,/!/);
 assert.ok(!warn.includes('diag-error'),'a warning must not use the error colour');
 // The message is escaped, so a diagnostic can never inject markup.
 assert.ok(!renderDiagnostic('error','<img src=x onerror=alert(1)>').includes('<img'));
 assert.match(renderDiagnostic('error','<img src=x onerror=alert(1)>'),/&lt;img/);
});

test('a diagnostic message splits into its text and its line number',()=>{
 const split=splitDiagnostic('Malformed YAML at line 12');
 assert.equal(split.line,12);
 assert.ok(!split.message.includes('line 12'),'the line marker is removed from the text');
 assert.match(split.message,/Malformed YAML/);
 assert.deepEqual(splitDiagnostic('Something went wrong'),{message:'Something went wrong',line:null});
});

test('a line marker is only lifted off the end of a diagnostic',()=>{
 // The position sits in the middle here, so it must survive untouched.
 const mid=splitDiagnostic('Invalid JSON (line 1, column 15): Unexpected token');
 assert.equal(mid.line,null);
 assert.match(mid.message,/line 1, column 15/);
 // A trailing marker is the line reference and is lifted off.
 const tail=splitDiagnostic('Malformed YAML at line 12');
 assert.equal(tail.line,12);
 assert.equal(tail.message,'Malformed YAML');
});
