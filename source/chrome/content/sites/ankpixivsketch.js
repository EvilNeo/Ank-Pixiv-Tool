
(function (global) {

  let AnkPixivModule = function (doc) {

    var self = this;

    self.curdoc = doc;

    self.viewer;

    self.marked = false;

    self._functionsInstalled = false;

    self._image = {
      thumbnail: null,
      original: null
    };

    /********************************************************************************
     * プロパティ
     ********************************************************************************/

    self.in = {
      get medium () {
        var loc = self.info.illust.pageUrl;
        return /\/items\/\d+/.test(loc);
      },

      get illustPage () {
        return self.in.medium;
      }
    };

    self.elements = (function () { // {{{
      function query (q) {
        return self.elements.doc.querySelector(q);
      }

      function queryAll (q) {
        return self.elements.doc.querySelectorAll(q);
      }

      var appObj = null;  // 作品情報JSONを保存

      let illust =  {

        get largeLink () {
        },

        // require for AnkBase

        get downloadedDisplayParent () {
          return query('.RenderItemComponentHeader');
        },

        get downloadedFilenameArea () {
        },

        get AppObject () {
          if (appObj && appObj.id == self.info.illust.id) {
            return appObj;
          }

          appObj = null;

          try {
            // FIXME 非同期化したーい
            if (self.in.medium) {
              var text = AnkUtils.httpGET('https://sketch.pixiv.net/api/items/'+self.info.illust.id+'.json', self.info.illust.pageUrl);
              appObj = JSON.parse(text).data;
            }
          }
          catch (e) {
            AnkUtils.dumpError(e);
          }

          return appObj;
        },

        get photo () {
          var e = illust.AppObject;
          return e && e.media[0].photo.original;
        },

        // require for AnkBase.Viewer

        get body () {
          return query('body');
        },

        get wrapper () {
        },

        get mediumImage () {
          return query('.WallMediaComponent img');
        },

        get bigImage () {
        },

        get imageOverlay () {
        },

        get openCaption () {
        },

        get ads () {
          return [];
        }
      };

      return {
        illust: illust,
        get doc () {
          return self.curdoc;
        }
      };
    })(); // }}}

    self.info = (function () { // {{{

      let illust = {
        get pageUrl () {
          return self.elements.doc.location.href;
        },

        get id () {
          return self.getIllustId();
        },

        get dateTime () {
          var e = self.elements.illust.AppObject;
          return e && AnkUtils.decodeDateTimeText(e.published_at);
        },

        get size () {
        },

        get tags () {
          var e = self.elements.illust.AppObject;
          return e && e.tags.map(function (e) { return AnkUtils.trim(e) });
        },

        get shortTags () {
        },

        get tools () {
        },

        get width () {
          var e = self.elements.illust.photo;
          return e && e.width;
        },

        get height () {
          var e = self.elements.illust.photo;
          return e && e.height;
        },

        get server () {
        },

        get updated () {
        },

        get referer () {
          return self.info.illust.pageUrl;
        },

        get title () {
          var e = self.elements.illust.AppObject;
          return e && AnkUtils.trim(e.text);
        },

        get comment () {
          var e = self.elements.illust.AppObject;
          return e && AnkUtils.trim(e.text);
        },

        get R18 () {
          var e = self.elements.illust.AppObject;
          return e && e.is_r18;
        }
      };

      let member = {
        get id () {
          var e = self.elements.illust.AppObject;
          return e && e.user && e.user.id;
        },

        get pixivId () {
          var e = self.elements.illust.AppObject;
          return e && e.user && e.user.unique_name;
        },

        get name () {
          var e = self.elements.illust.AppObject;
          return e && e.user && e.user.name;
        }
      };

      let path = {
        get initDir () {
          return AnkBase.Prefs.get('initialDirectory.' + self.SITE_NAME);
        },

        get ext () {
          return AnkUtils.getFileExtension(path.image.images.length > 0 && path.image.images[0]);
        },

        get image () {
          return self._image.original;
        }
      };

      return {
        illust: illust,
        member: member,
        path: path
      };
    })();

  };


  AnkPixivModule.prototype = {

    /********************************************************************************
     * 定数
     ********************************************************************************/

    URL:        'https://sketch.pixiv.net/',
    DOMAIN:     'sketch.pixiv.net',
    SERVICE_ID: 'PXV',
    SITE_NAME:  'Pixiv Sketch',

    /********************************************************************************
     *
     ********************************************************************************/

    /**
     * このモジュールの対応サイトかどうか
     */
    isSupported: function (doc) {
      return doc.location.href.match(/^https?:\/\/sketch\.pixiv\.net\//);
    },

    /**
     * ファンクションのインストール
     */
    initFunctions: function () {

      var self = this;

      if (!self._functionsInstalled || self._functionsInstalled != self.curdoc.location.href) {
        if (self._functionsInstalled) {
          // FIXME 多分過去のイベントハンドラなんかは削除しないといけない
          AnkUtils.dump('re-initialize on location change: '+self._functionsInstalled+' -> '+self.curdoc.location.href);
        }

        self._functionsInstalled = self.curdoc.location.href;

        if (self.in.medium) {
          self.installMediumPageFunctions();
        }
        else {
          self.installListPageFunctions();
        }
      }
    },

    /**
     * ダウンロード可能か
     */
    isDownloadable: function () {
      if (!this._functionsInstalled)
        return false;

      if (this.in.medium)
        return { illust_id:this.getIllustId(), service_id:this.SERVICE_ID };
    },

    /**
     * イラストID
     */
    getIllustId: function () {
      let m = this.curdoc.location.href.match(/\/items\/(\d+)/);
      return m && m[1];
    },

    /**
     * ダウンロード実行
     */
    downloadCurrentImage: function (useDialog, debug) {

      let self = this;

      self.getImageUrlAsync(AnkBase.Prefs.get('downloadOriginalSize', false))
        .then(function (image) {
          if (!image || image.images.length == 0) {
            window.alert(AnkBase.Locale.get('cannotFindImages'));
            return;
          }

          let context = new AnkBase.Context(self);
          let ev = AnkBase.createDownloadEvent(context, useDialog, debug);
          window.dispatchEvent(ev);
        })
        .catch(e => AnkUtils.dumpError(e,true));
    },

    /*
     * ダウンロード済みイラストにマーカーを付ける
     *    node:     対象のノード (AutoPagerize などで追加されたノードのみに追加するためにあるよ)
     *    force:    追加済みであっても、強制的にマークする
     */
    markDownloaded: function (node, force, ignorePref) { // {{{
      const IsIllust = /\/items\/(\d+)/;
      const Targets = [
        ['.RenderItemComponent > .RenderItemComponentHeader > .RenderItemComponentHeaderUser > .RenderItemComponentHeaderUserTime > a', 4]
      ];

      return AnkBase.markDownloaded(IsIllust, Targets, true, this, node, force, ignorePref);
    }, // }}}

    /*
     * 評価する
     */
    setRating: function (pt) {
    },

    /********************************************************************************
     *
     ********************************************************************************/

    /**
     * 画像URLリストの取得
     */
    getImageUrlAsync: function (mangaOriginalSizeCheck) {

      var self = this;

      return new Promise(function (resolve) {

        self._image.original = {
          images: [self.elements.illust.photo.url],
          facing: null,
          referer: self.info.illust.pageUrl
        };

        resolve(self._image.original);
      });
    },

    /********************************************************************************
     *
     ********************************************************************************/

    /*
     * イラストページにviewerやダウンロードトリガーのインストールを行う
     */
    installMediumPageFunctions: function () { // {{{

      let proc = function () {
        // インストールに必用な各種要素
        var body = self.elements.illust.body;
        var medImg = self.elements.illust.mediumImage;

        // 完全に読み込まれていないっぽいときは、遅延する
        if (!(body && doc.readyState === 'complete') || !medImg) { // {{{
          return false;   // リトライしてほしい
        } // }}}

        // 保存済み表示
        AnkBase.insertDownloadedDisplayById(
          self.elements.illust.downloadedDisplayParent,
          self.info.illust.R18,
          self.info.illust.id,
          self.SERVICE_ID,
          self.info.illust.updated
        );

        return true;
      }; // }}}

      var self = this;
      var doc = this.curdoc;

      // install now
      return AnkBase.delayFunctionInstaller(proc, 500, 20, self.SITE_NAME, '');
    }, // }}}

    /*
     * リストページのアイテムにダウンロード済みマークなどをつける
     */
    installListPageFunctions: function () { /// {

      // FIXME 伸びるページに未対応

      let delayMarking = function () {
        // インストールに必用な各種要素
        var body = self.elements.illust.body;

        // 完全に読み込まれていないっぽいときは、遅延する
        if (!(body && doc.readyState === 'complete')) { // {{{
          return false;   // リトライしてほしい
        } // }}}

        self.markDownloaded(doc,　true);

        return true;
      };

      var self = this;
      var doc = this.curdoc;

      // install now
      if (AnkBase.Prefs.get('markDownloaded', false)) {
        AnkBase.delayFunctionInstaller(delayMarking, 500, 20, self.SITE_NAME, 'delayMarking');
      }
    }

  };

  // --------
  global["SiteModule"] = AnkPixivModule;

})(this);