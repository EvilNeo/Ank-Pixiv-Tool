
try {

  let AnkModule = function (currentDoc) {

    /********************************************************************************
    * 定数
    ********************************************************************************/

    var self = this;

    self.URL        = 'http://seiga.nicovideo.jp/';   // イラストページ以外でボタンを押したときに開くトップページのURL
    self.DOMAIN     = 'nicovideo.jp';         // CSSの適用対象となるドメイン
    self.SERVICE_ID = 'NCS';                  // 履歴DBに登録するサイト識別子
    self.SITE_NAME  = 'Nicosei';              // ?site-name?で置換されるサイト名のデフォルト値 


    /********************************************************************************
    * プロパティ
    ********************************************************************************/

    self.on = {
      get site () // {{{
        self.info.illust.pageUrl.match(/^https?:\/\/seiga\.nicovideo\.jp\/(?:seiga|shunga|watch|comic|search|tag|my|user\/illust|illust\/(?:ranking|list))(?:\/|\?|$)/), // }}}
    },

    self.in = { // {{{
      get manga () // {{{
        self.info.illust.pageUrl.match(/seiga\.nicovideo\.jp\/watch\/mg/), // }}}

      get medium () // {{{
        self.in.illustPage, // }}}

      get illustPage () // {{{
        self.in.manga
        ||
        self.info.illust.pageUrl.match(/seiga\.nicovideo\.jp\/seiga\/im/), // }}}

      get myPage ()
        false,  // under construction

      get myIllust ()
        false,  // under construction
    }; // }}}

    self.elements = (function () { // {{{
      function query (q)
        self.elements.doc.querySelector(q)

      function queryAll (q)
        self.elements.doc.querySelectorAll(q)

      let illust =  {
        get images ()
          self.in.manga && queryAll('#page_contents > .page img'),

        get datetime ()
          self.in.manga && query('.created')
          ||
          query('.inner.cfix > .other_info > .date')  // seiga
          ||
          query('.bold'),                             // shunga

        get title ()
          self.in.manga && queryAll('.title > h1 > *')
          ||
          query('.inner.cfix > .title')               // seiga
          ||
          query('.title_text'),                       // shunga

        get comment ()
          self.in.manga && query('.description > .full')
          ||
          query('.inner.cfix > .discription')         // seiga
          ||
          query('.illust_user_exp'),                  // shunga

        get avatar ()
          !self.in.manga && query('.illust_user_icon > a > img'),

        get userName ()
          self.in.manga && query('.author_name')
          ||
          query('.user_name > strong')                // seiga
          ||
          query('.illust_user_name > a > strong'),    // shunga

        get memberLink ()
          self.in.manga && null
          ||
          query('.user_link > a')                     // seiga
          ||
          query('.illust_user_name > a'),             // shunga

        get tags ()
          query('.illust_tag.cfix.static')            // seiga
          ||
          query('#tag_block'),                        // shunga & manga

        get illustType ()
          query('.illust_type > a'),

        get flvPlayer ()
          self.in.manga && query('#main > #player'),

        // require for AnkBase

        get autoPagerizeTarget()
          query('.illust_list')           // ○○さんのｲﾗｽﾄ
          ||
          query('.my_contents .list'),    // イラスト定点観測

        get downloadedDisplayParent ()
          self.in.manga && query('.title')
          ||
          query('.other_info')                        // seiga
          ||
          query('.exp_header > .info'),

        // require for AnkViewer

        get body ()
          let (e = queryAll('body'))
            e && e.length > 0 && e[0],

        get wrapper ()
          query('#main'),

        get mediumImage ()
          self.in.manga && self.elements.illust.images[0]
          ||
          query('#illust_link'),

/* future use.
        get openComment ()
          query('.fc_blk'),
*/

        get ads () {
          let ads = [] ;
          ['#siteHeaderInner','#header_cnt','.content_right'].
            forEach(function (v) {
              let e = query(v);
              if (e)
                ads.push(e);
            });

          return ads;
        },
      };

      let mypage = {
        get fantasyDisplay ()
          null, // under construction

        get fantasyDisplayNext ()
          null, // under construction
      };
 
      return {
        illust: illust,
        mypage: mypage,
        get doc () currentDoc ? currentDoc : window.content.document
      };
    })(); // }}}

    self.info = (function () { // {{{
      let illust = {
        get pageUrl ()
          self.elements.doc ? self.elements.doc.location.href : '',

        get id ()
          self.in.manga && self.info.illust.pageUrl.match(/\/watch\/(mg\d+)/)[1]
          ||
          self.info.illust.pageUrl.match(/\/seiga\/(im\d+)/)[1],

        get dateTime ()
          AnkUtils.decodeDateTimeText(self.elements.illust.datetime.textContent),

        get size ()
          null,

        get tags () {
          let elem = self.elements.illust.tags;
          if (!elem)
            return [];

          let tags = AnkUtils.A(elem.querySelectorAll('.tag'))
            .map(function (e) AnkUtils.trim(e.textContent))
            .filter(function (s) s && s.length);
          return tags;
        },

        get shortTags () {
          let limit = AnkBase.Prefs.get('shortTagsMaxLength', 8);
          return self.info.illust.tags.filter(function (it) (it.length <= limit));
        },

        get tools ()
          null,

        get width ()
          0,

        get height ()
          0,

        get server () {
          if (!self.elements.illust.flvPlayer)
            return self.info.path.image.images[0].match(/^https?:\/\/([^\/\.]+)\./i)[1];
        },

        get referer ()
          self.info.path.referer || self.info.illust.pageUrl,

        get title () {
          if (self.in.manga) {
            let title = self.elements.illust.title[0].textContent;
            let episode = self.elements.illust.title[1].textContent;
            return title+' '+episode;
          }
          else {
            return AnkUtils.trim(self.elements.illust.title.textContent);
          }
        },

        get comment ()
          let (e = self.elements.illust.comment)
            (e ? AnkUtils.textContent(e) : ''),

        get R18 ()
          let (e = self.elements.illust.illustType)
            (e && !!e.href.match(/\/shunga\//)),

        get mangaPages ()
          self.info.path.image.images.length,

        get worksData ()
          null,
      };

      let member = {
        get id () {
          if (self.in.manga) {
            if (self.elements.illust.memberLink)
              return self.elements.illust.memberLink.href.match(/\/manga\/list\?user_id=(.+?)(?:$|\?)/)[1];
            return member.name;
          }
          else {
            return self.elements.illust.memberLink.href.match(/\/user\/illust\/(.+?)(?:$|\?)/)[1]; 
          }
        },

        get pixivId ()
          member.id,

        get name ()
          AnkUtils.trim(self.elements.illust.userName.textContent),

        get memoizedName ()
          AnkBase.memoizedName(member.id, self.SERVICE_ID),
      };

      let path = {
        get initDir ()
          AnkBase.Prefs.get('initialDirectory.'+self.SITE_NAME),

        get ext () {
          if (!self.elements.illust.flvPlayer)
            return AnkUtils.getFileExtension(path.image.images.length > 0 && path.image.images[0]);
        },

        get mangaIndexPage ()
          null,

        get image () {
          try {
            let images;
            if (self.in.manga) {
              // マンガの大サイズ画像はないらしい
              images = AnkUtils.A(self.elements.illust.images).filter(function (e) !!e.getAttribute('data-original')).map(function (e) e.getAttribute('data-original'));
            } else {
              let s = AnkUtils.remoteFileExists(self.elements.illust.mediumImage.href);
              let href = s[1];
              if (!s[2].match(/^image\//)) {
                referer = href;
                let html = AnkUtils.httpGET(href);
                let doc = AnkUtils.createHTMLDocument(html);
                let src = doc.querySelector('.illust_view_big > img').src;
                href = href.replace(/^(https?:\/\/.+?)(?:\/.*)$/,"$1")+src;
              }
              images = [href];
            }

            return { images: images, facing: null, };
          }
          catch (e) {
            AnkUtils.dumpError(e);
            window.alert(AnkBase.Locale('serverError'));
            return AnkBase.NULL_RET;
          }
        },

        referer: null
      };

      return {
        illust: illust,
        member: member,
        path: path
      };
    })(); // }}}

    Object.defineProperty(this, 'downloadable', { // {{{
      get: function () {
        if (self.in.medium && self.elements.illust.flvPlayer)
          return false;    // ニコニコ形式マンガはDL対象外
        return true;
      },
    }); // }}}

  };


  /********************************************************************************
  * メソッド
  ********************************************************************************/

  AnkModule.prototype = {

    /*
     * イラストページにviewerやダウンロードトリガーのインストールを行う
     */
    installMediumPageFunctions: function () { // {{{

      let proc = function (mod) { // {{{
        var doc = mod.elements.doc;
        var body = mod.elements.illust.body;
        var wrapper = mod.elements.illust.wrapper;
        var medImg = mod.elements.illust.mediumImage;
        var flvPlayer = mod.elements.illust.flvPlayer;

        // 完全に読み込まれていないっぽいときは、遅延する
        if (!(body && wrapper && (medImg || flvPlayer))) { // {{{
          return false;   // リトライしてほしい
        } // }}}

        // ニコニコ形式マンガはDL対象外
        if (flvPlayer) {
          return true;
        }

        // 大画像関係
        if (AnkBase.Prefs.get('largeOnMiddle', true) && AnkBase.Prefs.get('largeOnMiddle.'+mod.SITE_NAME, true)) {
          new AnkViewer(
            mod,
            function () mod.info.path.image
          );
        }

        // 中画像クリック時に保存する
        if (AnkBase.Prefs.get('downloadWhenClickMiddle')) { // {{{
          medImg.addEventListener(
            'click',
            function () AnkBase.downloadCurrentImageAuto(mod),
            true
          );
        } // }}}

        // レイティング("クリップ","マイリスト登録","とりあえず一発登録",""お気に入り登録)によるダウンロード
        (function () { // {{{
          if (!AnkBase.Prefs.get('downloadWhenRate', false))
            return;

          [
            '#clip_add_button',
            '.mylist_area > a',
            '.mylist_area > a+a',
            '.favorites_navigator > .favorite'
          ].forEach(function (v) {
            let e = doc.querySelector(v);
            if (e)
              e.addEventListener(
                'click',
                function () AnkBase.downloadCurrentImageAuto(mod),
                true
              );
          });
        })(); // }}}

        // 保存済み表示
        AnkBase.insertDownloadedDisplayById(
          mod.elements.illust.downloadedDisplayParent,
          mod.info.illust.id,
          mod.SERVICE_ID,
          mod.info.illust.R18
        );

        // 他のイラスト・関連イラストなどにマーキング
        mod.markDownloaded(doc,true);

        return true;
      };


      // install now
      return AnkBase.delayFunctionInstaller(this, proc, 500, 20, '');
    }, // }}}

    /*
     * リストページ用ファンクション
     */
    installListPageFunctions: function () { /// {

      let autoPagerize = function (mod) {
        var doc = mod.elements.doc;
        var aptarget = mod.elements.illust.autoPagerizeTarget;

        if (!(doc && aptarget)) {
          return false;     // リトライしてほしい
        }

        // AutoPagerizeによる継ぎ足し動作
        // TODO サイト別.jsに個別に書くのはよくない気がする
        doc.addEventListener(
          'AutoPagerize_DOMNodeInserted',
          function (e) {
            let a;
            [
             'div.illust_thumb',        // イラスト定点観測
             'li.list_item',            // ○○さんのイラスト
            ] .
              some(function (q)
                let (n = e.target.querySelectorAll(q))
                  n && n.length > 0 && !!(a = n)
              );
            if (a)
              setTimeout(
                function() {
                  AnkUtils.A(a) .
                    forEach(function (node) mod.markDownloaded(node, true));
                },
                500     // ボックスの高さが確定するまでマーキングを遅延させる。値は適当
              );
          },
          false
        );

        return true;
      };

      let delayMarking = function (mod) {
        var doc = mod.elements.doc;
        var body = mod.elements.illust.body;

        if (!(body && doc.readyState === 'complete')) {
          return false;   // リトライしてほしい
        }

        // リスト表示が遅くてダウンロードマーク表示が漏れることがあるので、再度処理を実行
        mod.markDownloaded(doc,true);

        return true;
      };


      // install now
      AnkBase.delayFunctionInstaller(this, autoPagerize, 500, 20, 'ap');
      return AnkBase.delayFunctionInstaller(this, delayMarking, 500, 20, 'dm');
    }, // }}}

    /*
     * ダウンロード済みイラストにマーカーを付ける
     *    node:     対象のノード (AutoPagerize などで追加されたノードのみに追加するためにあるよ)
     *    force:    追加済みであっても、強制的にマークする
     */
    markDownloaded: function (node, force, ignorePref) { // {{{
      const IsIllust = /\/([^/]+?)(?:\?|$)/;
      const Targets = [
                        ['li.list_item > a', 1],                       // ○○さんのイラスト
                        ['div.illust_thumb > div > a', 2],             // マイページ
                        ['.episode_item > .episode > .thumb > a', 3],  // マンガ一覧
                        ['div.illust_list_img > div > a', 2],          // 検索結果
                        ['.list_item_cutout > a', 1],                  // イラストページ（他のイラスト・関連イラストなど）
                        ['.ranking_image > div > a', 2],               // イラストランキング
                        ['.center_img > a', 1],                        // 春画ページ（他のイラスト・関連イラストなど）
                      ];

      return AnkBase.markDownloaded(IsIllust, Targets, true, this, node, force, ignorePref);
    }, // }}}

    /*
     * 評価する
     */
    rate: function () { // {{{
      return true;
    },

  };


  /********************************************************************************
  * ベースとなるインスタンスの生成＋本体へのインストール - ankpixiv.xulにも登録を
  ********************************************************************************/

  AnkModule.prototype.dup = function () new AnkModule(this.elements.doc);

  AnkBase.addModule(new AnkModule());


} catch (error) {
 dump("[" + error.name + "]\n" +
      "  message: " + error.message + "\n" +
      "  filename: " + error.fileName + "\n" +
      "  linenumber: " + error.lineNumber + "\n" +
      "  stack: " + error.stack + "\n");
}
