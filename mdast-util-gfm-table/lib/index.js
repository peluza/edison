/**
 * @typedef {import('mdast').InlineCode} InlineCode
 * @typedef {import('mdast').Table} Table
 * @typedef {import('mdast').TableCell} TableCell
 * @typedef {import('mdast').TableRow} TableRow
 *
 * @typedef {import('markdown-table').Options} MarkdownTableOptions
 *
 * @typedef {import('mdast-util-from-markdown').CompileContext} CompileContext
 * @typedef {import('mdast-util-from-markdown').Extension} FromMarkdownExtension
 * @typedef {import('mdast-util-from-markdown').Handle} FromMarkdownHandle
 *
 * @typedef {import('mdast-util-to-markdown').Options} ToMarkdownExtension
 * @typedef {import('mdast-util-to-markdown').Handle} ToMarkdownHandle
 * @typedef {import('mdast-util-to-markdown').State} State
 * @typedef {import('mdast-util-to-markdown').Info} Info
 */

/**
 * @typedef Options
 *   Configuration.
 * @property {boolean | null | undefined} [tableCellPadding=true]
 *   Whether to add a space of padding between delimiters and cells (default:
 *   `true`).
 * @property {boolean | null | undefined} [tablePipeAlign=true]
 *   Whether to align the delimiters (default: `true`).
 * @property {MarkdownTableOptions['stringLength'] | null | undefined} [stringLength]
 *   Function to detect the length of table cell content, used when aligning
 *   the delimiters between cells (optional).
 */

import { ok as assert } from 'devlop'
import { markdownTable } from 'markdown-table'
import { defaultHandlers } from 'mdast-util-to-markdown'

/**
 * Create an extension for `mdast-util-from-markdown` to enable GFM tables in
 * markdown.
 *
 * @returns {FromMarkdownExtension}
 *   Extension for `mdast-util-from-markdown` to enable GFM tables.
 */
export function gfmTableFromMarkdown() {
  return {
    enter: {
      table: enterTable,
      tableData: enterCell,
      tableHeader: enterCell,
      tableRow: enterRow
    },
    exit: {
      codeText: exitCodeText,
      table: exitTable,
      tableData: exit,
      tableHeader: exit,
      tableRow: exit
    }
  }
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterTable(token) {
  const align = token._align;
  assert(align, 'expected `_align` on table');

  // Ensure this.data is defined before accessing or setting properties
  this.data = this.data || {};
  this.enter(
    {
      type: 'table',
      align: align.map(function (d) {
        return d === 'none' ? null : d;
      }),
      children: []
    },
    token
  );

  this.data.inTable = true;  // Set inTable flag to true
}


/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitTable(token) {
  if (!this.data) {
    this.data = {};  // Ensure this.data is initialized
  }
  
  // Set the inTable flag to undefined when exiting the table
  this.data.inTable = undefined;

  this.exit(token);
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterRow(token) {
  this.enter({ type: 'tableRow', children: [] }, token)
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exit(token) {
  this.exit(token)
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterCell(token) {
  this.enter({ type: 'tableCell', children: [] }, token)
}

// Overwrite the default code text data handler to unescape escaped pipes when
// they are in tables.
/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitCodeText(token) {
  let value = this.resume();

  // Ensure this.data is defined and check if we're in a table
  if (this.data && this.data.inTable) {
    value = value.replace(/\\([\\|])/g, replace);
  }

  const node = this.stack[this.stack.length - 1];
  assert(node.type === 'inlineCode');
  node.value = value;
  this.exit(token);
}

/**
 * @param {string} $0
 * @param {string} $1
 * @returns {string}
 */
function replace($0, $1) {
  return $1 === '|' ? $1 : $0
}

/**
 * Create an extension for `mdast-util-to-markdown` to enable GFM tables in
 * markdown.
 *
 * @param {Options | null | undefined} [options]
 *   Configuration.
 * @returns {ToMarkdownExtension}
 *   Extension for `mdast-util-to-markdown` to enable GFM tables.
 */
export function gfmTableToMarkdown(options = {}) {
  const settings = {
    tableCellPadding: options.tableCellPadding ?? true,
    tablePipeAlign: options.tablePipeAlign ?? true,
    stringLength: options.stringLength || ((str) => str.length)
  }
  const padding = settings.tableCellPadding
  const alignDelimiters = settings.tablePipeAlign
  const around = padding ? ' ' : '|'

  return {
    unsafe: [
      { character: '\r', inConstruct: 'tableCell' },
      { character: '\n', inConstruct: 'tableCell' },
      { atBreak: true, character: '|', after: '[\t :-]' },
      { character: '|', inConstruct: 'tableCell' },
      { atBreak: true, character: ':', after: '-' },
      { atBreak: true, character: '-', after: '[:|-]' }
    ],
    handlers: {
      inlineCode: inlineCodeWithTable,
      table: handleTable,
      tableCell: handleTableCell,
      tableRow: handleTableRow
    }
  }

/**
 * @type {ToMarkdownHandle}
 * @param {Table} node
 * @param {Parent} parent
 * @param {State} state
 */
function handleTable(node, parent, state, info) {
  // Implement logic for converting table nodes to Markdown
  const tableData = handleTableAsData(node, state, info);
  return serializeData(tableData, node.align);
}

  /**
   * @type {ToMarkdownHandle}
   * @param {TableRow} node
   */
  function handleTableRow(node, _, state, info) {
    const row = handleTableRowAsData(node, state, info)
    const value = serializeData([row])
    return value.slice(0, value.indexOf('\n'))
  }

  /**
   * @type {ToMarkdownHandle}
   * @param {TableCell} node
   */
  function handleTableCell(node, _, state, info) {
    const exit = state.enter('tableCell')
    const subexit = state.enter('phrasing')
    const value = state.containerPhrasing(node, { ...info, before: around, after: around })
    subexit()
    exit()
    return value
  }

  /**
   * @param {Array<Array<string>>} matrix
   * @param {Array<string | null | undefined> | null | undefined} [align]
   */
  function serializeData(matrix, align) {
    return markdownTable(matrix, { align, alignDelimiters, padding, stringLength: settings.stringLength })
  }

  /**
   * @param {Table} node
   * @param {State} state
   * @param {Info} info
   */
  function handleTableAsData(node, state, info) {
    const children = node.children
    let index = -1
    const result = []
    const subexit = state.enter('table')

    while (++index < children.length) {
      result[index] = handleTableRowAsData(children[index], state, info)
    }

    subexit()
    return result
  }

  /**
   * @param {TableRow} node
   * @param {State} state
   * @param {Info} info
   */
  function handleTableRowAsData(node, state, info) {
    const children = node.children
    let index = -1
    const result = []
    const subexit = state.enter('tableRow')

    while (++index < children.length) {
      result[index] = handleTableCell(children[index], node, state, info)
    }

    subexit()
    return result
  }

  /**
   * @type {ToMarkdownHandle}
   * @param {InlineCode} node
   */
  function inlineCodeWithTable(node, parent, state) {
    let value = defaultHandlers.inlineCode(node, parent, state)
    if (state.stack.includes('tableCell')) {
      value = value.replace(/\|/g, '\\$&')
    }
    return value
  }
}
