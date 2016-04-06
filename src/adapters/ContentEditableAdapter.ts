/*
 *
 * * Copyright 2015 Acrolinx GmbH
 * *
 * * Licensed under the Apache License, Version 2.0 (the "License");
 * * you may not use this file except in compliance with the License.
 * * You may obtain a copy of the License at
 * *
 * * http://www.apache.org/licenses/LICENSE-2.0
 * *
 * * Unless required by applicable law or agreed to in writing, software
 * * distributed under the License is distributed on an "AS IS" BASIS,
 * * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * * See the License for the specific language governing permissions and
 * * limitations under the License.
 * *
 * * For more information visit: http://www.acrolinx.com
 *
 */
namespace acrolinx.plugins.adapter {

  import AdapterInterface = acrolinx.plugins.adapter.AdapterInterface;
  import MatchWithReplacement = acrolinx.sidebar.MatchWithReplacement;
  import AlignedMatch = acrolinx.plugins.lookup.AlignedMatch;
  import lookupMatchesStandard = acrolinx.plugins.lookup.diffbased.lookupMatches;
  import $ = acrolinxLibs.$;
  import _ = acrolinxLibs._;

  'use strict';

  export class ContentEditableAdapter implements AdapterInterface {
    config: AdapterConf;
    element:any;
    html:any;
    currentHtmlChecking:any;
    lookupMatches = lookupMatchesStandard;

    constructor(conf: AdapterConf) {
      this.config = conf;
      this.element = document.getElementById(conf.editorId);
      if (conf.lookupMatches) {
        this.lookupMatches = conf.lookupMatches;
      }
    }

    registerCheckCall(checkInfo){

    }

    registerCheckResult(checkResult) {
      return [];
    }

    getHTML() {
      return this.element.innerHTML;
    }

    getEditorDocument() : Document {
      try {
        return this.element.ownerDocument;
      } catch (error) {
        throw error;
      }
    }

    getCurrentText() {
      try {
        return rangy.innerText(this.element);
      } catch (error) {
        throw error;
      }
    }

    extractHTMLForCheck() {
      this.html = this.getHTML();
      this.currentHtmlChecking = this.html;
      return {html: this.html};
    }

    selectText(begin, length) {
      var doc = this.getEditorDocument();
      var selection = rangy.getSelection(doc);
      var range = rangy.createRange(doc);

      range.setStart(this.element, 0);
      range.moveStart('character', begin);
      range.moveEnd('character', length);
      selection.setSingleRange(range);
      return range;
    }

    scrollIntoView2(sel) {
      var range = sel.getRangeAt(0);
      var tmp = range.cloneRange();
      tmp.collapse();

      var text = document.createElement('span');
      tmp.startContainer.parentNode.insertBefore(text, tmp.startContainer);
      text.scrollIntoView();
      text.remove();


    }

    scrollAndSelect(matches) {
      var newBegin,
        matchLength,
        selection1,
        selection2,
        range1,
        range2,
        doc;

      newBegin = matches[0].foundOffset;
      matchLength = matches[0].flagLength;
      range1 = this.selectText(newBegin, matchLength);
      //$(getEditor().getBody()).find('em').get(0).scrollIntoView();
      //selection1 = this.getEditor().selection;
      selection1 = rangy.getSelection(this.getEditorDocument());

      if (selection1) {
        try {
          //selection1.scrollIntoView();
          this.scrollIntoView2(selection1);
          //Special hack for WordPress TinyMCE
          var wpContainer = $('#wp-content-editor-container');
          if (wpContainer.length > 0) {
            window.scrollBy(0, -50);

          }
          //var wpContainer = $('#wp-content-editor-container');
          //if (wpContainer.length > 0) {
          //  wpContainer.get(0).scrollIntoView();
          //}
        } catch (error) {
          console.log("Scrolling Error!");
        }
      }
      //
      // scrollIntoView need to set it again
      range2 = this.selectText(newBegin, matchLength);
    }

    selectRanges(checkId, matches) {
      this.selectMatches(checkId, matches);
    }

    selectMatches(checkId, matches: MatchWithReplacement[]) : AlignedMatch[] {
      const alignedMatches = this.lookupMatches(this.currentHtmlChecking, this.getCurrentText(), matches);

      if (_.isEmpty(alignedMatches)) {
        throw 'Selected flagged content is modified.';
      }

      this.scrollAndSelect(alignedMatches);

      return alignedMatches;
    }

    replaceSelection(content: string) {
      const doc = this.getEditorDocument();
      const selection = rangy.getSelection(doc);
      const rng = selection.getRangeAt(0);
      rng.deleteContents();
      rng.insertNode(doc.createTextNode(content));
    }

    replaceRanges(checkId, matchesWithReplacement: MatchWithReplacement[]) {
      try {
        // this is the selection on which replacement happens
        const alignedMatches = this.selectMatches(checkId, matchesWithReplacement);

        // Select the replacement, as replacement of selected flag will be done
        this.scrollAndSelect(alignedMatches);

        // Replace the selected text
        const replacementText = _.map(alignedMatches, 'replacement').join('');
        //this.editor.selection.setContent(replacementText);
        this.replaceSelection(replacementText);

        // Select the replaced flag
        this.selectText(alignedMatches[0].foundOffset, replacementText.length);
      } catch (error) {
        console.log(error);
        return;
      }

    }
  }
}

