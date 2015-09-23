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

'use strict';
var AcrolinxPlugin = (function () {

  var CLIENT_COMPONENTS = [
    {
      id: 'com.acrolinx.sidebarexample',
      name: 'Acrolinx Sidebar Example Client',
      version: '1.2.3.999',
      category: 'MAIN'
    }
  ];

  function initAcrolinxSamplePlugin(config,editorAdapter) {
    var currentHtmlChecking;
    var lastCheckedHtml;
    var $sidebarContainer = $('#' + config.sidebarContainerId);
    var $sidebar = $('<iframe></iframe>');
    $sidebarContainer.append($sidebar);
    var sidebarContentWindow = $sidebar.get(0).contentWindow;

    var adapter = editorAdapter;

    function onSidebarLoaded () {
      function initSidebarCloud() {
        config.requestAccessTokenCallback(function (accessToken) {
          sidebarContentWindow.acrolinxSidebar.init({
            clientComponents: CLIENT_COMPONENTS,
            token: accessToken,
            contentPieceUuid: config.documentId,
            integrationFacadeBaseUrl: config.integrationFacadeBaseUrl
          });
        });
      }

      function initSidebarOnPremise() {
        sidebarContentWindow.acrolinxSidebar.init({
          clientComponents: CLIENT_COMPONENTS,
          clientSignature: config.clientSignature,
          showServerSelector: true,
          serverAddress: config.serverAddress

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
          if (config.sidebarType === 'CLOUD') {
            initSidebarCloud();
          } else {
            initSidebarOnPremise();
          }
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

        requestAccessToken: function () {
          var requestAccessTokenCallback = config.requestAccessTokenCallback;
          if (requestAccessTokenCallback) {
            requestAccessTokenCallback(function (accessToken) {
              sidebarContentWindow.acrolinxSidebar.setAccessToken(accessToken);
            });
          }
        },

        requestGlobalCheck: function () {
          console.log('requestGlobalCheck');
          var html = adapter.extractHTMLForCheck();
          if (html.hasOwnProperty("error")) {
            window.alert(html.error);
          } else {
            var checkInfo = sidebarContentWindow.acrolinxSidebar.checkGlobal(html.html, {
              inputFormat: 'HTML',
              requestDescription: {
                documentReference: 'filename.html'
              }
            });
            adapter.registerCheckCall(checkInfo);
          }
          //adapter.requestGlobalCheck(sidebarContentWindow.acrolinxSidebar);
          //currentHtmlChecking = html;
        },

        onCheckResult: function (checkResult) {
          //console.log('onCheckResult: ', checkResult);
          //lastCheckedHtml = currentHtmlChecking;
          //return [];
          return adapter.registerCheckResult(checkResult);
        },

        selectRanges: function (checkId, matches) {
          console.log('selectRanges: ', checkId, matches);
          adapter.selectRanges(checkId,matches);

        },

        replaceRanges: function (checkId, matchesWithReplacement) {
          console.log('replaceRanges: ', checkId, matchesWithReplacement);
          adapter.replaceRanges(checkId,matchesWithReplacement);

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
      var sidebarBaseUrl = config.sidebarType === 'CLOUD'?
        'https://acrolinx-integrations.acrolinx-cloud.com/sidebar/v13/' :
        'https://acrolinx-sidebar-classic.s3.amazonaws.com/v13/prod/';
      return $.ajax({
        url: sidebarBaseUrl + 'index.html',
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

  var cls = function (conf) {
    this.config = conf;
  };

  cls.prototype = {
    //registerEditor: function (editorId,editorType) {
    //  this.config.editorId = editorId;
    //},

    registerAdapter: function (adapter) {
      this.adapter = adapter;
    },

    init : function () {
      initAcrolinxSamplePlugin(this.config,this.adapter);
    }
  };


  return cls;

})();