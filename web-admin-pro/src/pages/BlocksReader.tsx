import { PageContainer } from '@ant-design/pro-components';
import { useParams, useSearchParams } from '@umijs/max';
import { Checkbox, Empty } from 'antd';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { Block, Page } from '@/services/business';
import {
  assetUrl,
  listOriginalFileBlocks,
  listWorkBlocks,
} from '@/services/business';
import { createElement, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

async function getAllBlocks(
  listBlocks: (params: URLSearchParams) => Promise<Page<Block>>,
  includeDiscarded: boolean,
) {
  const params = new URLSearchParams({ page: '1', size: '500' });
  if (includeDiscarded) {
    params.set('includeDiscarded', 'true');
  }
  const first = await listBlocks(params);
  const items = [...first.items];
  const last = Math.max(1, Math.ceil(first.total / first.size));
  for (let page = 2; page <= last; page += 1) {
    params.set('page', String(page));
    const next = await listBlocks(params);
    items.push(...next.items);
  }
  return items;
}

export function tableMarkup(value?: string | null) {
  if (!value?.trim().toLowerCase().startsWith('<table')) {
    return null;
  }
  const doc = new DOMParser().parseFromString(value, 'text/html');
  const table = doc.querySelector('table');
  if (!table) {
    return null;
  }
  sanitizeTable(table);
  return table.outerHTML;
}

function latexSource(value?: string | null) {
  if (!value) {
    return null;
  }
  let latex = value.trim();
  if (latex.startsWith('$$') && latex.endsWith('$$')) {
    latex = latex.slice(2, -2).trim();
  } else if (latex.startsWith('\\[') && latex.endsWith('\\]')) {
    latex = latex.slice(2, -2).trim();
  }
  return latex || null;
}

function LatexBlock({ value }: { value?: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const latex = latexSource(value);

  useEffect(() => {
    if (!ref.current || !latex) {
      return;
    }
    try {
      katex.render(latex, ref.current, {
        displayMode: true,
        throwOnError: false,
        strict: false,
        trust: false,
      });
    } catch {
      ref.current.textContent = value || '';
    }
  }, [latex]);

  return latex ? <div ref={ref} /> : null;
}

function sanitizeTable(element: Element) {
  const allowedTags = new Set(['TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD']);
  const allowedAttrs = new Set(['rowspan', 'colspan']);
  for (const child of [element, ...Array.from(element.querySelectorAll('*'))]) {
    if (!allowedTags.has(child.tagName)) {
      if (['SCRIPT', 'STYLE'].includes(child.tagName)) {
        child.remove();
      } else {
        child.replaceWith(...Array.from(child.childNodes));
      }
      continue;
    }
    for (const attr of Array.from(child.attributes)) {
      if (!allowedAttrs.has(attr.name.toLowerCase())) {
        child.removeAttribute(attr.name);
      }
    }
  }
}

function tableNode(value?: string | null): ReactNode {
  const html = tableMarkup(value);
  if (!html) {
    return null;
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if (!table) {
    return null;
  }

  const renderElement = (element: Element): ReactNode => {
    const attrs = Object.fromEntries(
      Array.from(element.attributes)
        .filter((attr) => ['rowspan', 'colspan'].includes(attr.name.toLowerCase()))
        .map((attr) => [attr.name === 'colspan' ? 'colSpan' : 'rowSpan', Number(attr.value)]),
    );
    const children = Array.from(element.childNodes).map((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }
      return renderElement(node as Element);
    });
    return createElement(element.tagName.toLowerCase(), attrs, ...children);
  };

  return renderElement(table);
}

function ArticleBlock({ block }: { block: Block }) {
  if (block.blockType === 'title') {
    const level = Math.min(Math.max((block.titleLevel ?? 0) + 2, 2), 5);
    return createElement(`h${level}`, undefined, block.blockText || '-');
  }
  if (block.blockType === 'equation') {
    const equation = latexSource(block.blockText);
    const equationImage = assetUrl(block.equationImageUrl);
    return (
      <figure>
        {equationImage ? <img src={equationImage} alt={block.blockText || 'equation'} /> : null}
        {equation ? <LatexBlock value={block.blockText} /> : <pre>{block.blockText}</pre>}
      </figure>
    );
  }
  if (block.blockType === 'table') {
    const table = tableNode(block.blockText);
    const tableImage = assetUrl(block.tableImageUrl);
    return (
      <figure>
        {tableImage ? <img src={tableImage} alt={block.tableCaption || 'table'} /> : null}
        {table || <pre>{block.blockText}</pre>}
        {block.tableCaption ? <figcaption>{block.tableCaption}</figcaption> : null}
        {block.tableFootnote ? <p>{block.tableFootnote}</p> : null}
      </figure>
    );
  }
  if (block.blockType === 'image') {
    const image = assetUrl(block.imageUrl);
    return (
      <figure>
        {image ? <img src={image} alt={block.imageCaption || 'image'} /> : null}
        {block.blockText ? <p>{block.blockText}</p> : null}
        {block.imageCaption ? <figcaption>{block.imageCaption}</figcaption> : null}
        {block.imageFootnote ? <p>{block.imageFootnote}</p> : null}
      </figure>
    );
  }
  if (block.blockType === 'reference' || block.references?.length) {
    const references = block.references?.length
      ? block.references
      : block.blockText
        ? [block.blockText]
        : [];
    return (
      <ol>
        {references.map((reference) => (
          <li key={reference}>{reference}</li>
        ))}
      </ol>
    );
  }
  if (block.blockType === 'page_footnote' || block.footnoteText) {
    return (
      <p>
        {block.footnoteLabel ? `${block.footnoteLabel} ` : ''}
        {block.footnoteText || block.blockText}
      </p>
    );
  }
  return block.blockText ? <p>{block.blockText}</p> : null;
}

function BlocksReaderPage({
  title,
  meta,
  listBlocks,
}: {
  title: string;
  meta: string;
  listBlocks: (params: URLSearchParams) => Promise<Page<Block>>;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const includeDiscarded = searchParams.get('includeDiscarded') === 'true';
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAllBlocks(listBlocks, includeDiscarded)
      .then(setBlocks)
      .finally(() => setLoading(false));
  }, [includeDiscarded, listBlocks]);

  return (
    <PageContainer title={title} subTitle={meta}>
      <Checkbox
        checked={includeDiscarded}
        onChange={(event) => {
          const next = new URLSearchParams();
          if (event.target.checked) {
            next.set('includeDiscarded', 'true');
          }
          setSearchParams(next);
        }}
      >
        包含丢弃块
      </Checkbox>
      {loading ? (
        <div>加载中</div>
      ) : blocks.length ? (
        <article style={{ marginTop: 16 }}>
          {blocks.map((block) => (
            <ArticleBlock key={block.blockId} block={block} />
          ))}
        </article>
      ) : (
        <Empty />
      )}
    </PageContainer>
  );
}

export function WorkBlocksPage() {
  const { workId = '' } = useParams();
  return (
    <BlocksReaderPage
      title="论文全文"
      meta={workId}
      listBlocks={(params) => listWorkBlocks(workId, params)}
    />
  );
}

export function OriginalFileBlocksPage() {
  const { fileId = '' } = useParams();
  return (
    <BlocksReaderPage
      title="解析后全文"
      meta={fileId}
      listBlocks={(params) => listOriginalFileBlocks(fileId, params)}
    />
  );
}
