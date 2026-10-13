import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { extractYouTubeVideoId, getYouTubeEmbedUrl, isValidYouTubeInput } from '../src/utils/youtube.ts';

describe('YouTube Utils - URL Parsing & Embed Generation', () => {
  test('1. Extracts 11-character video ID from standard watch?v= URL', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const id = extractYouTubeVideoId(url);
    assert.equal(id, 'dQw4w9WgXcQ');
  });

  test('2. Extracts 11-character video ID from youtu.be URL with ?si= tracking parameter', () => {
    const url = 'https://youtu.be/M3_se7ktuZU?si=H5B-Lv8FClOfuZ2t';
    const id = extractYouTubeVideoId(url);
    assert.equal(id, 'M3_se7ktuZU');
  });

  test('3. Extracts 11-character video ID from YouTube /shorts/ URL', () => {
    const url = 'https://www.youtube.com/shorts/dQw4w9WgXcQ';
    const id = extractYouTubeVideoId(url);
    assert.equal(id, 'dQw4w9WgXcQ');

    const shortsWithParams = 'https://www.youtube.com/shorts/M3_se7ktuZU?feature=share';
    const id2 = extractYouTubeVideoId(shortsWithParams);
    assert.equal(id2, 'M3_se7ktuZU');
  });

  test('4. Preserves bare 11-character video ID', () => {
    const rawId1 = 'dQw4w9WgXcQ';
    assert.equal(extractYouTubeVideoId(rawId1), 'dQw4w9WgXcQ');

    const rawId2 = 'M3_se7ktuZU';
    assert.equal(extractYouTubeVideoId(rawId2), 'M3_se7ktuZU');
  });

  test('5. Returns null for invalid or unparseable strings', () => {
    assert.equal(extractYouTubeVideoId(''), null);
    assert.equal(extractYouTubeVideoId('   '), null);
    assert.equal(extractYouTubeVideoId(null), null);
    assert.equal(extractYouTubeVideoId(undefined), null);
    assert.equal(extractYouTubeVideoId('not-a-youtube-url'), null);
    assert.equal(extractYouTubeVideoId('https://vimeo.com/12345678'), null);
    assert.equal(extractYouTubeVideoId('https://google.com'), null);
    assert.equal(extractYouTubeVideoId('toolongvideoidentifiervalue1234567'), null);
  });

  test('6. getYouTubeEmbedUrl returns privacy-preserving youtube-nocookie.com URL', () => {
    const videoId = 'M3_se7ktuZU';
    const embedUrl = getYouTubeEmbedUrl(videoId);
    assert.ok(embedUrl.startsWith('https://www.youtube-nocookie.com/embed/M3_se7ktuZU'));
    assert.ok(embedUrl.includes('rel=0'));
    assert.ok(embedUrl.includes('modestbranding=1'));
  });

  test('7. isValidYouTubeInput correctly validates inputs', () => {
    assert.equal(isValidYouTubeInput('https://youtu.be/M3_se7ktuZU?si=H5B-Lv8FClOfuZ2t'), true);
    assert.equal(isValidYouTubeInput(''), true); // empty allowed for optional videos
    assert.equal(isValidYouTubeInput('invalid-video-string'), false);
  });
});
