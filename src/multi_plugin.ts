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

namespace acrolinx.plugins {
  'use strict';

  const clientComponents = [
    {
      id: 'com.acrolinx.sidebarexample',
      name: 'Acrolinx Sidebar Example Client',
      version: '1.2.3.999',
      category: 'MAIN'
    }
  ];

  function initAcrolinxSamplePlugin(config, editorAdapter) {
    var $ = acrolinxLibs.$;
    var $sidebarContainer = $('#' + config.sidebarContainerId);
    var $sidebar = $('<iframe></iframe>');
    $sidebarContainer.append($sidebar);
    var sidebarContentWindow = $sidebar.get(0).contentWindow;

    var adapter = editorAdapter;

    function onSidebarLoaded() {

      function initSidebarOnPremise() {
        sidebarContentWindow.acrolinxSidebar.init({
          clientComponents: config.clientComponents || clientComponents,
          clientSignature: config.clientSignature,
          showServerSelector: config.hasOwnProperty("showServerSelector") ? config.showServerSelector : true,
          enableSingleSignOn: config.hasOwnProperty("enableSingleSignOn") ? config.enableSingleSignOn : false,
          serverAddress: config.serverAddress,
          defaultCheckSettings: config.defaultCheckSettings

          // These settings are only effective on servers with disabled checking profiles.
          //checkSettings: {
          //  'language': 'en',
          //  'ruleSetName': 'Plain English',
          //  'termSets': ['Medical'],
          //  'checkSpelling': true,
          //  'checkGrammar': true,
          //  'checkStyle': true,
          //  'checkReuse': false,
          //  'harvestTerms': false,
          //  'checkSeo': false,
          //  'termStatuses': ['TERMINOLOGY_DEPRECATED']
          //}

          // These settings are only effective on servers with disabled checking profiles.
          //defaultCheckSettings: {
          //  'language': 'en',
          //  'ruleSetName': 'Plain English',
          //  'termSets': ['Medical'],
          //  'checkSpelling': true,
          //  'checkGrammar': true,
          //  'checkStyle': true,
          //  'checkReuse': false,
          //  'harvestTerms': false,
          //  'checkSeo': false,
          //  'termStatuses': ['TERMINOLOGY_DEPRECATED']
          //}

        });
      }

      console.log('Install acrolinxPlugin in sidebar.');
      sidebarContentWindow.acrolinxPlugin = {

        requestInit: function () {
          console.log('requestInit');
          initSidebarOnPremise();
        },

        onInitFinished: function (initFinishedResult) {
          console.log('onInitFinished: ', initFinishedResult);
          if (initFinishedResult.error) {
            window.alert(initFinishedResult.error.message);
          }
        },

        configure: function (configuration) {
          console.log('configure: ', configuration);
        },

        requestGlobalCheckSync: function (html, format, documentReference) {
          if (html.hasOwnProperty("error")) {
            window.alert(html.error);
          } else {
            var checkInfo = sidebarContentWindow.acrolinxSidebar.checkGlobal(html.html, {
              inputFormat: format || 'HTML',
              requestDescription: {
                documentReference: documentReference || 'filename.html'
              }
            });
            adapter.registerCheckCall(checkInfo);
          }

        },

        requestGlobalCheck: function () {
          console.log('requestGlobalCheck');
          var pHtml = adapter.extractHTMLForCheck();
          var pFormat = adapter.getFormat ? adapter.getFormat() : null;
          var pDocumentReference = adapter.getDocumentReference ? adapter.getDocumentReference() : null;
          if (pHtml.then !== undefined) {
            var self = this;
            pHtml.then(function (html) {
              self.requestGlobalCheckSync(html, pFormat, pDocumentReference);
            });
          } else {
            this.requestGlobalCheckSync(pHtml, pFormat, pDocumentReference);

          }
        },

        onCheckResult: function (checkResult) {
          return adapter.registerCheckResult(checkResult);
        },

        selectRanges: function (checkId, matches) {
          console.log('selectRanges: ', checkId, matches);
          try {
            adapter.selectRanges(checkId, matches);
          } catch (msg) {
            console.log(msg);
            sidebarContentWindow.acrolinxSidebar.invalidateRanges(matches.map(function (match) {
                return {
                  checkId: checkId,
                  range: match.range
                };
              }
            ));
          }

        },

        replaceRanges: function (checkId, matchesWithReplacement) {
          console.log('replaceRanges: ', checkId, matchesWithReplacement);
          try {
            adapter.replaceRanges(checkId, matchesWithReplacement);
          } catch (msg) {
            console.log(msg);
            sidebarContentWindow.acrolinxSidebar.invalidateRanges(matchesWithReplacement.map(function (match) {
                return {
                  checkId: checkId,
                  range: match.range
                };
              }
            ));
          }
        },

        // only needed for local checks
        getRangesOrder: function (checkedDocumentRanges) {
          console.log('getRangesOrder: ', checkedDocumentRanges);
          return [];
        },

        download: function (download) {
          console.log('download: ', download.url, download);
          window.open(download.url);
        },

        // only needed for local checks
        verifyRanges: function (checkedDocumentParts) {
          console.log('verifyRanges: ', checkedDocumentParts);
          return [];
        },

        disposeCheck: function (checkId) {
          console.log('disposeCheck: ', checkId);
        }
      };

    }

    function loadSidebarIntoIFrame() {
      var sidebarBaseUrl;
      if (config.sidebarUrl !== undefined) {
        sidebarBaseUrl = config.sidebarUrl;
      } else {
        sidebarBaseUrl = 'https://acrolinx-sidebar-classic.s3.amazonaws.com/v14/prod/';
      }
      return acrolinxLibs.$.ajax({
        url: sidebarBaseUrl + 'index.html'
      }).then(function (sidebarHtml) {
        var sidebarHtmlWithAbsoluteLinks = sidebarHtml
          .replace(/src="/g, 'src="' + sidebarBaseUrl)
          .replace(/href="/g, 'href="' + sidebarBaseUrl);
        sidebarContentWindow.document.open();
        sidebarContentWindow.document.write(sidebarHtmlWithAbsoluteLinks);
        sidebarContentWindow.document.close();
        onSidebarLoaded();
      });
    }

    loadSidebarIntoIFrame();
  }


  interface Adapter {

  }

  export class AcrolinxPlugin {
    config: any;
    adapter: Adapter;

    constructor(conf) {
      this.config = conf;
    }

    registerAdapter(adapter) {
      this.adapter = adapter;
    }

    init () {
      initAcrolinxSamplePlugin(this.config, this.adapter);
    }
  }


}
