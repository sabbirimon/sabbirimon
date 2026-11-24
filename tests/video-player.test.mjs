import test from 'node:test';
import assert from 'node:assert/strict';
import {parseVideo} from '../docs/watch/video.js';

test('YouTube watch, share and mobile links converge on privacy-enhanced embeds',()=>{
  for(const link of ['youtube.com/watch?v=M7lc1UVf-VE','https://youtu.be/M7lc1UVf-VE','https://m.youtube.com/shorts/M7lc1UVf-VE','www.youtube.com/live/M7lc1UVf-VE']){
    const video=parseVideo(link+'\n');
    assert.equal(video.original,'https://www.youtube.com/watch?v=M7lc1UVf-VE');
    assert.equal(new URL(video.embed).origin,'https://www.youtube-nocookie.com');
  }
  assert.equal(new URL(parseVideo('youtu.be/M7lc1UVf-VE?t=1h2m3s').embed).searchParams.get('start'),'3723');
});

test('Bilibili links retain the part and start time, with autoplay off',()=>{
  const video=parseVideo('https://m.bilibili.com/video/BV1B7411m7LV/?p=2&t=80&tracking=x');
  assert.equal(video.original,'https://www.bilibili.com/video/BV1B7411m7LV?p=2&t=80');
  const params=new URL(video.embed).searchParams;
  assert.equal(params.get('p'),'2'); assert.equal(params.get('autoplay'),'0');
  assert.equal(parseVideo('av123').original,'https://www.bilibili.com/video/av123');
  assert.equal(new URL(parseVideo('bilibili.com/bangumi/play/ep456').embed).searchParams.get('episodeId'),'456');
  assert.equal(parseVideo('BV1B7411m7LV').provider,'Bilibili');
});

test('unsupported domains, paths, credentials and non-video IDs never become iframe URLs',()=>{
  for(const link of ['','b23.tv/xyz','https://example.com/video/BV1B7411m7LV','https://www.youtube.com.example.com/watch?v=M7lc1UVf-VE','https://user@youtube.com/watch?v=M7lc1UVf-VE','https://www.youtube.com/@sabbirimon','javascript:alert(1)','https://youtu.be/nope','https://player.bilibili.com/player.html?aid=xyz']){
    assert.equal(parseVideo(link),null,link);
  }
});
