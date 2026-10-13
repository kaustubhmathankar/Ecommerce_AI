import { Fragment } from 'react'

function inlineMarkdown(value, prefix = 'inline') {
    const text = String(value ?? '')
    const tokenPattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g
    const parts = text.split(tokenPattern).filter((part) => part !== '')

    return parts.map((part, index) => {
        const key = `${prefix}-${index}`

        if (
            (part.startsWith('**') && part.endsWith('**')) ||
            (part.startsWith('__') && part.endsWith('__'))
        ) {
            return <strong key={key}>{part.slice(2, -2)}</strong>
        }

        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={key}>{part.slice(1, -1)}</code>
        }

        if (
            (part.startsWith('*') && part.endsWith('*')) ||
            (part.startsWith('_') && part.endsWith('_'))
        ) {
            return <em key={key}>{part.slice(1, -1)}</em>
        }

        if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
            const separator = part.indexOf('](')
            const label = part.slice(1, separator)
            const href = part.slice(separator + 2, -1)

            if (/^https?:\/\//i.test(href)) {
                return (
                    <a
                        key={key}
                        href={href}
                        target="_blank"
                        rel="noreferrer noopener"
                    >
                        {label}
                    </a>
                )
            }
        }

        return <Fragment key={key}>{part}</Fragment>
    })
}

function splitTableRow(line) {
    let row = line.trim()

    if (row.startsWith('|')) row = row.slice(1)
    if (row.endsWith('|')) row = row.slice(0, -1)

    return row
        .split(/(?<!\\)\|/)
        .map((cell) => cell.replace(/\\\|/g, '|').trim())
}

function isTableSeparator(line) {
    return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)
}

function isTableStart(lines, index) {
    return (
        index + 1 < lines.length &&
        lines[index].includes('|') &&
        isTableSeparator(lines[index + 1])
    )
}

function isBullet(line) {
    return /^\s*[-*+]\s+/.test(line) || /^\s*•\s+/.test(line)
}

function isOrderedItem(line) {
    return /^\s*\d+[.)]\s+/.test(line)
}

function isHeading(line) {
    return /^\s{0,3}#{1,4}\s+/.test(line)
}

function isHorizontalRule(line) {
    return /^\s{0,3}([-*_]\s*){3,}$/.test(line)
}

function isBlockStart(lines, index) {
    const line = lines[index]

    return (
        isHeading(line) ||
        isBullet(line) ||
        isOrderedItem(line) ||
        isHorizontalRule(line) ||
        /^\s*```/.test(line) ||
        isTableStart(lines, index)
    )
}

function MarkdownTable({ header, rows }) {
    return (
        <div
            className="shopsphere-ai-markdown-table-wrap"
            role="region"
            aria-label="Analytics table"
            tabIndex={0}
        >
            <table className="shopsphere-ai-markdown-table">
                <thead>
                    <tr>
                        {header.map((cell, index) => (
                            <th key={`head-${index}`}>
                                {inlineMarkdown(cell, `head-${index}`)}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr key={`row-${rowIndex}`}>
                            {header.map((_, cellIndex) => (
                                <td key={`cell-${rowIndex}-${cellIndex}`}>
                                    {inlineMarkdown(
                                        row[cellIndex] ?? '—',
                                        `cell-${rowIndex}-${cellIndex}`,
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

/**
 * Lightweight Markdown renderer for AI responses.
 * Supports headings, emphasis, links, lists, fenced code, horizontal rules,
 * and pipe tables without dangerouslySetInnerHTML or an additional package.
 */
export default function AdminAIChatMarkdown({ content = '' }) {
    const lines = String(content ?? '')
        .replace(/\r\n?/g, '\n')
        .split('\n')

    const blocks = []
    let index = 0

    while (index < lines.length) {
        const line = lines[index]

        if (!line.trim()) {
            index += 1
            continue
        }

        // Fenced code blocks
        if (/^\s*```/.test(line)) {
            const language = line.trim().slice(3).trim().split(/\s+/)[0] || ''

            index += 1
            const codeLines = []

            while (
                index < lines.length &&
                !/^\s*```/.test(lines[index])
            ) {
                codeLines.push(lines[index])
                index += 1
            }

            if (index < lines.length) index += 1

            blocks.push(
                <pre
                    className="shopsphere-ai-markdown-code"
                    key={`code-${blocks.length}`}
                >
                    <code data-language={language || undefined}>
                        {codeLines.join('\n')}
                    </code>
                </pre>,
            )

            continue
        }

        // GitHub-flavoured Markdown tables
        if (isTableStart(lines, index)) {
            const header = splitTableRow(lines[index])
            index += 2

            const rows = []

            while (
                index < lines.length &&
                lines[index].trim() &&
                lines[index].includes('|')
            ) {
                rows.push(splitTableRow(lines[index]))
                index += 1
            }

            blocks.push(
                <MarkdownTable
                    key={`table-${blocks.length}`}
                    header={header}
                    rows={rows}
                />,
            )

            continue
        }

        // Markdown headings
        if (isHeading(line)) {
            const match = line.match(/^\s{0,3}(#{1,4})\s+(.*)$/)
            const level = Math.min(match[1].length, 4)
            const HeadingTag = `h${level}`

            blocks.push(
                <HeadingTag
                    className="shopsphere-ai-markdown-heading"
                    key={`heading-${blocks.length}`}
                >
                    {inlineMarkdown(
                        match[2].replace(/\s+#+\s*$/, ''),
                        `heading-${blocks.length}`,
                    )}
                </HeadingTag>,
            )

            index += 1
            continue
        }

        // Horizontal divider
        if (isHorizontalRule(line)) {
            blocks.push(
                <hr
                    className="shopsphere-ai-markdown-rule"
                    key={`rule-${blocks.length}`}
                />,
            )

            index += 1
            continue
        }

        // Unordered lists
        if (isBullet(line)) {
            const items = []

            while (index < lines.length && isBullet(lines[index])) {
                items.push(
                    lines[index]
                        .replace(/^\s*[-*+]\s+/, '')
                        .replace(/^\s*•\s+/, ''),
                )
                index += 1
            }

            blocks.push(
                <ul
                    className="shopsphere-ai-markdown-list"
                    key={`ul-${blocks.length}`}
                >
                    {items.map((item, itemIndex) => (
                        <li key={`item-${itemIndex}`}>
                            {inlineMarkdown(
                                item,
                                `ul-${blocks.length}-${itemIndex}`,
                            )}
                        </li>
                    ))}
                </ul>,
            )

            continue
        }

        // Ordered lists
        if (isOrderedItem(line)) {
            const items = []

            while (
                index < lines.length &&
                isOrderedItem(lines[index])
            ) {
                items.push(
                    lines[index].replace(/^\s*\d+[.)]\s+/, ''),
                )
                index += 1
            }

            blocks.push(
                <ol
                    className="shopsphere-ai-markdown-list"
                    key={`ol-${blocks.length}`}
                >
                    {items.map((item, itemIndex) => (
                        <li key={`item-${itemIndex}`}>
                            {inlineMarkdown(
                                item,
                                `ol-${blocks.length}-${itemIndex}`,
                            )}
                        </li>
                    ))}
                </ol>,
            )

            continue
        }

        // Standalone bold line as a section label
        if (/^\s*\*\*.+\*\*\s*$/.test(line)) {
            const title = line
                .trim()
                .replace(/^\*\*/, '')
                .replace(/\*\*$/, '')

            blocks.push(
                <h4
                    className="shopsphere-ai-markdown-section"
                    key={`section-${blocks.length}`}
                >
                    {inlineMarkdown(title, `section-${blocks.length}`)}
                </h4>,
            )

            index += 1
            continue
        }

        // Normal paragraph. Join wrapped lines until the next block.
        const paragraph = [line.trim()]
        index += 1

        while (
            index < lines.length &&
            lines[index].trim() &&
            !isBlockStart(lines, index)
        ) {
            paragraph.push(lines[index].trim())
            index += 1
        }

        blocks.push(
            <p
                className="shopsphere-ai-markdown-paragraph"
                key={`paragraph-${blocks.length}`}
            >
                {inlineMarkdown(
                    paragraph.join(' '),
                    `paragraph-${blocks.length}`,
                )}
            </p>,
        )
    }

    return <div className="shopsphere-ai-markdown">{blocks}</div>
}