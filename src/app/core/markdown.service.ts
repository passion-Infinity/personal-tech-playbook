import { Injectable } from '@angular/core';
import { Marked, Tokens } from 'marked';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { TocEntry } from './models';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('go', go);
hljs.registerLanguage('java', java);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('python', python);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('yaml', yaml);

export interface RenderedMarkdown {
  html: string;
  toc: TocEntry[];
  hasMermaid: boolean;
}

const COPY_ICON =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugify(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') || 'section'
  );
}

/** Markdown -> HTML with heading anchors (TOC), highlighted code + copy buttons, Mermaid placeholders. */
@Injectable({ providedIn: 'root' })
export class MarkdownService {
  render(markdown: string): RenderedMarkdown {
    const toc: TocEntry[] = [];
    const used = new Map<string, number>();
    let hasMermaid = false;

    const marked = new Marked({ gfm: true });
    marked.use({
      renderer: {
        heading(
          this: { parser: { parseInline(t: Tokens.Generic[]): string } },
          token: Tokens.Heading,
        ) {
          const inner = this.parser.parseInline(token.tokens);
          const base = slugify(token.text);
          const n = used.get(base) ?? 0;
          used.set(base, n + 1);
          const id = n ? `${base}-${n}` : base;
          if (token.depth === 2 || token.depth === 3) {
            toc.push({ id, text: token.text.replace(/[`*_]/g, ''), level: token.depth });
          }
          return `<h${token.depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>${inner}</h${token.depth}>\n`;
        },
        code(token: Tokens.Code) {
          const lang = (token.lang ?? '').trim().split(/\s+/)[0].toLowerCase();
          if (lang === 'mermaid') {
            hasMermaid = true;
            const src = escapeHtml(token.text);
            return `<div class="mermaid-wrap"><pre class="mermaid" data-src="${src}">${src}</pre></div>\n`;
          }
          const known = lang && hljs.getLanguage(lang);
          const body = known
            ? hljs.highlight(token.text, { language: lang, ignoreIllegals: true }).value
            : escapeHtml(token.text);
          const label = escapeHtml(lang || 'text');
          return (
            `<div class="code-block"><div class="code-header"><span>${label}</span>` +
            `<button type="button" class="copy-code" data-copy-code aria-label="Copy code">${COPY_ICON}<span>Copy</span></button></div>` +
            `<pre><code class="hljs language-${label}">${body}</code></pre></div>\n`
          );
        },
        table(this: { parser: { parseInline(t: Tokens.Generic[]): string } }, token: Tokens.Table) {
          const cell = (c: Tokens.TableCell, tag: 'th' | 'td') =>
            `<${tag}${c.align ? ` style="text-align:${c.align}"` : ''}>${this.parser.parseInline(c.tokens)}</${tag}>`;
          const head = `<tr>${token.header.map((c) => cell(c, 'th')).join('')}</tr>`;
          const rows = token.rows
            .map((r) => `<tr>${r.map((c) => cell(c, 'td')).join('')}</tr>`)
            .join('');
          return `<div class="table-wrap"><table><thead>${head}</thead><tbody>${rows}</tbody></table></div>\n`;
        },
        link(this: { parser: { parseInline(t: Tokens.Generic[]): string } }, token: Tokens.Link) {
          const text = this.parser.parseInline(token.tokens);
          const external = /^https?:\/\//.test(token.href);
          const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
          const ext = external ? ' target="_blank" rel="noopener noreferrer"' : '';
          return `<a href="${escapeHtml(token.href)}"${title}${ext}>${text}</a>`;
        },
      },
    });

    const html = marked.parse(markdown, { async: false }) as string;
    return { html, toc, hasMermaid };
  }
}

let mermaidPromise: Promise<typeof import('mermaid').default> | null = null;

/** Lazily load Mermaid (separate chunk, still precached by the service worker) and render diagrams. */
export async function renderMermaid(container: HTMLElement, dark: boolean): Promise<void> {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>('pre.mermaid'));
  if (!nodes.length) return;
  mermaidPromise ??= import('mermaid').then((m) => m.default);
  const mermaid = await mermaidPromise;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: dark ? 'dark' : 'default',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  });
  for (const node of nodes) {
    // Reset to source so diagrams can be re-rendered on theme change.
    const src = node.getAttribute('data-src');
    if (src !== null) {
      node.textContent = src; // getAttribute() already returns decoded text
      node.removeAttribute('data-processed');
    }
  }
  try {
    await mermaid.run({ nodes, suppressErrors: true });
  } catch {
    /* invalid diagram: leave source text visible */
  }
}
