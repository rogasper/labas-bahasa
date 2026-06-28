import type { BlogBlock, BlogBlockChild, BlogBlockValue } from "@labas/api/routers/blog";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

function renderInline(children: BlogBlockChild[] | undefined) {
  if (!children || children.length === 0) return null;
  const parts = children.map((child, i) => {
    let text: React.ReactNode = child.text;
    if (text === "") return null;
    const segments = (child.text ?? "").split("\n");
    return segments.map((seg, j) => {
      let node: React.ReactNode = seg;
      if (child.bold) node = <strong key={`b-${i}-${j}`}>{node}</strong>;
      if (child.italic)
        node = <em key={`em-${i}-${j}`}>{node as React.ReactElement}</em>;
      if (j < segments.length - 1)
        return <span key={`${i}-${j}`}>{node}<br /></span>;
      return <span key={`${i}-${j}`}>{node}</span>;
    });
  });
  return <>{parts}</>;
}

function renderValue(value: BlogBlockValue[]) {
  return value.map((item) => (
    <li key={item.id}>{renderInline(item.children)}</li>
  ));
}

function renderImageValue(value: BlogBlockValue[]) {
  const first = value[0];
  if (!first?.children) return null;
  const src = first.children.find((c) => c.text)?.text ?? "";
  const alt = first.children.find((c) => c.text)?.text ?? "";
  return <img src={src} alt={alt} className="max-w-full h-auto rounded-[var(--radius-lg)] my-4" />;
}

function renderTableValue(value: BlogBlockValue[]) {
  const rows: string[][] = [];
  for (const item of value) {
    if (item.type === "table-row" && item.children) {
      const cells = item.children.map((c) => c.text);
      rows.push(cells);
    }
  }
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full border-collapse border border-[var(--oat-border)]">
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="border border-[var(--oat-border)] px-3 py-2 text-sm"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderTodoValue(value: BlogBlockValue[]) {
  return (
    <ul className="space-y-2 my-4">
      {value.map((item) => {
        const checked = (item.props?.checked as boolean) ?? false;
        return (
          <li key={item.id} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={checked}
              readOnly
              className="mt-1 h-4 w-4 accent-[var(--matcha-600)]"
              aria-label={item.children?.map((c) => c.text).join("") ?? ""}
            />
            <span className={checked ? "line-through text-[var(--warm-silver)]" : ""}>
              {renderInline(item.children)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function renderEmbedValue(value: BlogBlockValue[]) {
  const first = value[0];
  if (!first?.children) return null;
  const src = first.children.find((c) => c.text)?.text ?? "";
  if (!src) return null;
  return (
    <div className="my-6 aspect-video">
      <iframe
        src={src}
        className="w-full h-full rounded-[var(--radius-lg)]"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

function renderAccordionValue(value: BlogBlockValue[]) {
  return (
    <div className="my-4 space-y-2">
      {value.map((item, i) => {
        const children = item.children ?? [];
        const title = children[0]?.text ?? "Section";
        const content = children.slice(1).map((c) => c.text).join(" ");
        return (
          <details key={item.id} className="group border border-[var(--oat-border)] rounded-[var(--radius-lg)] overflow-hidden">
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-base font-semibold bg-[var(--oat-light)] hover:bg-[var(--oat-border)]/30 transition-colors list-none">
              {title}
              <MaterialIcon name="expand_more" className="text-xl transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 py-3 text-sm text-[var(--warm-charcoal)]">
              {content || renderInline(children)}
            </div>
          </details>
        );
      })}
    </div>
  );
}

export function BlockRenderer({ content }: { content: Record<string, BlogBlock> }) {
  const blocks = Object.values(content).sort((a, b) => a.meta.order - b.meta.order);

  return (
    <div className="space-y-5 leading-relaxed text-base text-[var(--clay-black)]">
      {blocks.map((block) => {
        const value = block.value ?? [];
        const key = block.id;

        switch (block.type) {
          case "Paragraph": {
            const isEmpty = value.every(
              (v) => !v.children || v.children.every((c) => !c.text),
            );
            if (isEmpty) return <div key={key} className="h-4" />;
            return (
              <p key={key} className="text-base leading-relaxed">
                {value.map((v) => (
                  <span key={v.id}>{renderInline(v.children)}</span>
                ))}
              </p>
            );
          }

          case "HeadingOne":
            return (
              <h1 key={key} className="text-3xl font-headline font-bold mt-8 mb-4">
                {renderInline(value[0]?.children)}
              </h1>
            );
          case "HeadingTwo":
            return (
              <h2 key={key} className="text-2xl font-headline font-bold mt-6 mb-3">
                {renderInline(value[0]?.children)}
              </h2>
            );
          case "HeadingThree":
            return (
              <h3 key={key} className="text-xl font-headline font-semibold mt-5 mb-2">
                {renderInline(value[0]?.children)}
              </h3>
            );

          case "BulletedList":
            return (
              <ul key={key} className="list-disc pl-6 space-y-1.5 my-4">
                {renderValue(value)}
              </ul>
            );

          case "NumberedList":
            return (
              <ol key={key} className="list-decimal pl-6 space-y-1.5 my-4">
                {renderValue(value)}
              </ol>
            );

          case "Blockquote": {
            const isEmpty = value.every(
              (v) => !v.children || v.children.every((c) => !c.text),
            );
            if (isEmpty) return null;
            return (
              <blockquote
                key={key}
                className="border-l-4 border-[var(--matcha-500)] pl-4 py-2 my-4 text-[var(--warm-charcoal)] italic bg-[var(--matcha-300)]/10 rounded-r-[var(--radius-md)]"
              >
                {value.map((v) => (
                  <p key={v.id} className="mb-1 last:mb-0">
                    {renderInline(v.children)}
                  </p>
                ))}
              </blockquote>
            );
          }

          case "Callout":
            return (
              <div
                key={key}
                className="flex items-start gap-3 p-4 my-4 bg-[var(--slushie-500)]/10 border border-[var(--slushie-500)]/30 rounded-[var(--radius-lg)]"
              >
                <span className="text-xl shrink-0">💡</span>
                <div className="text-sm text-[var(--warm-charcoal)]">
                  {value.map((v) => (
                    <p key={v.id}>{renderInline(v.children)}</p>
                  ))}
                </div>
              </div>
            );

          case "Code":
            return (
              <pre
                key={key}
                className="bg-[var(--clay-black)] text-[var(--pure-white)] p-4 rounded-[var(--radius-lg)] overflow-x-auto my-4 text-sm font-mono"
              >
                <code>
                  {value.map((v) => (
                    <span key={v.id}>{renderInline(v.children)}</span>
                  ))}
                </code>
              </pre>
            );

          case "Divider":
            return <hr key={key} className="my-8 border-[var(--oat-border)]" />;

          case "Image":
            return <div key={key}>{renderImageValue(value)}</div>;

          case "Table":
            return <div key={key}>{renderTableValue(value)}</div>;

          case "TodoList":
            return <div key={key}>{renderTodoValue(value)}</div>;

          case "Embed":
            return <div key={key}>{renderEmbedValue(value)}</div>;

          case "Accordion":
            return <div key={key}>{renderAccordionValue(value)}</div>;

          default:
            return null;
        }
      })}
    </div>
  );
}
