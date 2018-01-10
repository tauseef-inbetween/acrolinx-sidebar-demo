import * as _ from "lodash";

function getRangesOfCurrentSelection(): Range[] {
  const selection = document.getSelection();
  const ranges = [];
  for (let i = 0; i < selection.rangeCount; i++) {
    ranges.push(selection.getRangeAt(i));
  }
  return ranges;
}

function getNonEmptySelectedRangesInsideOf(editorElement: HTMLElement): Range[] {
  const ranges = getRangesOfCurrentSelection();
  return ranges.filter(range =>
    containsOrIs(editorElement, range.commonAncestorContainer) &&
    range.toString().trim() !== ''
  );
}

/**
 * Workaround for Node.contains which does not work in IE for text nodes.
 * https://connect.microsoft.com/IE/feedback/details/780874/node-contains-is-incorrect
 */
function containsOrIs(ancestor: HTMLElement, descendant: Node) {
  return ancestor === descendant || (descendant.compareDocumentPosition(ancestor) & Node.DOCUMENT_POSITION_CONTAINS);
}


function getNodePath(ancestor: HTMLElement, node: Node): number[] {
  const result: number[] = [];
  let currentNode = node;
  // console.log('getNodePath');
  while (currentNode !== ancestor) {
    const parent = currentNode.parentNode;
    // console.log(currentNode, parent);
    if (!parent) {
      break;
    }
    const index = _.indexOf(parent.childNodes, currentNode);
    if (index === -1) {
      break;
    }
    result.push(index);
    currentNode = parent;
  }
  result.reverse();
  return result;
}

function findNodeByPath(ancestor: Node, path: number[]): Node | undefined {
  let currentNode: Node = ancestor;
  for (let nodeIndex of path) {
    let childNode = currentNode.childNodes[nodeIndex];
    if (!childNode) {
      return undefined;
    }
    currentNode = childNode;
  }
  return currentNode;
}

const RANGE_MARKER_START = 'ACRO_ßELECTION_START';
const RANGE_MARKER_END = 'ACRO_ßELECTION_END';

function mapDomRangeToHtmlRange(editorElement: HTMLElement, range: Range): [number, number] | undefined {
  const rangeStartElementPath = getNodePath(editorElement, range.startContainer);
  const rangeEndElementPath = getNodePath(editorElement, range.endContainer);
  // console.log('range elements path', rangeStartElementPath, rangeEndElementPath);
  const clonedEditorElement = editorElement.cloneNode(true) as HTMLElement;
  const clonedStartElement = findNodeByPath(clonedEditorElement, rangeStartElementPath);
  const clonedEndElement = findNodeByPath(clonedEditorElement, rangeEndElementPath);
  if (!clonedStartElement || !clonedEndElement) {
    return undefined;
  }
  // console.log('cloned nodes', clonedStartElement, clonedEndElement);

  const clonedRange = document.createRange();
  clonedRange.setStart(clonedStartElement, range.startOffset);
  clonedRange.setEnd(clonedEndElement, range.endOffset);

  clonedRange.insertNode(document.createTextNode(RANGE_MARKER_START));
  clonedRange.collapse(false); // collapse to End
  clonedRange.insertNode(document.createTextNode(RANGE_MARKER_END));

  const htmlWithMarkers = clonedEditorElement.innerHTML;
  // console.log('htmlWithMarkers', htmlWithMarkers);
  const htmlStartOffset = htmlWithMarkers.indexOf(RANGE_MARKER_START);
  const htmlEndOffset = htmlWithMarkers.indexOf(RANGE_MARKER_END);
  if (htmlStartOffset === -1 || htmlEndOffset === -1) {
    // console.log('where are the markers?');
    return undefined;
  }

  return [htmlStartOffset, htmlEndOffset - RANGE_MARKER_START.length];
}


export function getSelectionHtmlRanges(editorElement: HTMLElement): [number, number][] {
  const ranges = getNonEmptySelectedRangesInsideOf(editorElement);
  // We could optimize this mapping of individual ranges by implementing a function
  // which maps all ranges at once, but this would probably increase code complexity just
  // to speed up the rare corner case of multiple ranges in a selection.
  return _.compact(ranges.map(range => mapDomRangeToHtmlRange(editorElement, range)));
}