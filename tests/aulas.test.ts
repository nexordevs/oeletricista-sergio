import { test } from "node:test";
import assert from "node:assert/strict";
import { embedUrl, canWatch } from "../src/lib/aulas";

test("links do YouTube viram player sem cookies", () => {
  const e = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1";
  for (const u of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ", "https://youtube.com/shorts/dQw4w9WgXcQ", "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10"]) assert.equal(embedUrl(u), e, u);
});
test("Vimeo (inclusive não listado com hash) e Panda Video", () => {
  assert.equal(embedUrl("https://vimeo.com/123456789"), "https://player.vimeo.com/video/123456789");
  assert.equal(embedUrl("https://vimeo.com/123456789/abcdef1234"), "https://player.vimeo.com/video/123456789?h=abcdef1234");
  assert.equal(embedUrl("https://player-vz-abc123.tv.pandavideo.com.br/embed/?v=0a1b2c3d-1111-2222"), "https://player-vz-abc123.tv.pandavideo.com.br/embed/?v=0a1b2c3d-1111-2222");
});
test("links de outros sites, http ou malformados são recusados", () => {
  for (const u of ["http://youtube.com/watch?v=dQw4w9WgXcQ", "https://evil.com/embed/x", "javascript:alert(1)", "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/watch?v=<script>", "nada"]) assert.equal(embedUrl(u), null, u);
});
test("regras de acesso aos cursos", () => {
  assert.equal(canWatch("FREE", { isAdmin: false, activePlan: false }), true);
  assert.equal(canWatch("SUBSCRIBERS", { isAdmin: false, activePlan: false }), false);
  assert.equal(canWatch("SUBSCRIBERS", { isAdmin: false, activePlan: true }), true);
  assert.equal(canWatch("PAID", { isAdmin: false, activePlan: true }), false);
  assert.equal(canWatch("PAID", { isAdmin: true, activePlan: false }), true);
});
