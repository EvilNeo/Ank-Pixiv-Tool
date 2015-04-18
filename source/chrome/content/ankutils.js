
try {

  AnkUtils = {

    SYS_SLASH: (function () { // {{{
      try {
        let props = Components.classes["@mozilla.org/file/directory_service;1"]
                      .getService(Components.interfaces.nsIProperties);
        let file = props.get("ProfD", Components.interfaces.nsIFile);
        file.append('dummy');
        return (file.path.indexOf('/') != -1) ? '/' : '\\';
      } catch (e) {
        return '/';
      }
    })(), // }}}

    get currentDocument () // {{{
      window.content.document, // }}}


    /********************************************************************************
    * 文字列関数
    ********************************************************************************/

    /*
     * HTMLの実体参照を修正 TODO
     */
    decodeHtmlSpChars: function (s) { // {{{
      return s.replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&#(\d+);/g, function (_, n) String.fromCharCode(parseInt(n, 10)));
    }, // }}}

    /*
     * fixFilename
     *    filename: ファイル名
     *    opts:     オプション
     *    return:   ファイル名
     * ファイル名として使えない文字を除去する。
     */
    fixFilename: function (filename, opts) { // {{{
      opts = opts || {};
      if (!opts.file)
        filename = filename.replace(/[\\\/]/g, '_');
      if (!opts.token)
        filename = filename.replace(/[\?]/g, '_');
      filename = filename.replace(/\.+$/, '');
      return filename.replace(/[:;\*\"\<\>\|\#]/g, '_').replace(/[\n\r\t\xa0]/g, ' ').trim();
    }, // }}}

    /*
     * extractFilename
     *    filepath
     */
    extractFilename: function (filepath) { // {{{
      try {
        return AnkUtils.makeLocalFile(filepath).leafName;
      } catch (e) {
        AnkUtils.dumpError(e, true);
        try {
          return filepath.match(/[\\\/]([^\\\/]+)$/)[1] || filepath;
        } catch (e) {
          AnkUtils.dumpError(e, true);
          return filepath;
        }
      }
    }, // }}}

    /*
     * replaceFileSeparatorToSYS
     * ファイル区切り文字をシステムに合わせる
     */
    replaceFileSeparatorToSYS: function (f) {
      return f.replace(/[\\\/]+/g, AnkUtils.SYS_SLASH);
    },

    /*
     * replaceFileSeparatorToDEFAULT
     * ファイル区切り文字を'/'にする
     */
    replaceFileSeparatorToDEFAULT: function (f) {
      return f.replace(/[\\\/]+/g, '/');
    },

    /*
     * URLから画像の拡張子を取得する
     */
    getFileExtension: function (s) {
      return s && s.match(/(\.\w+)(?:$|\?)/) && RegExp.$1.toLowerCase() || '.jpg';
    },

    /*
     * trim
     * 文字列の前後の空白系を取り除く
     */
    trim: function (str) { // {{{
      return str.replace(/^\s*|\s*$/g, '');
    }, // }}}

    /*
     * join
     *    list:   リスト
     *    deli:   区切り文字
     */
    join: function (list, deli) { // {{{
      if (!deli)
        deli = ',';
      let result = "";
      for (let i = 0; i < list.length; i++) {
        result += list[i].toString();
        if (i < (list.length - 1))
          result += deli;
      }
      return result;
    }, // }}}

    padCharToLeft: function (str, len, c) { // {{{
      str = str.toString();
      if (str.length >= len)
        return str;
      for (let i = str.length; i < len; i++)
        str = c + str;
      return str;
    }, // }}}

    zeroPad: function(s, n) { // {{{
      return s.toString().replace(new RegExp('^(.{0,'+(n-1)+'})$'),
                                  function(s) { return AnkUtils.zeroPad('0'+s, n); });
    }, // }}}

    toSQLDateTimeString: function (datetime) { // {{{
      if (!datetime)
        datetime = new Date();
      let $ = this;
      let dy = AnkUtils.zeroPad(datetime.getFullYear(),      4);
      let dm = AnkUtils.zeroPad(datetime.getMonth() + 1,     2);
      let dd = AnkUtils.zeroPad(datetime.getDate(),          2);
      let th = AnkUtils.zeroPad(datetime.getHours(),         2);
      let tm = AnkUtils.zeroPad(datetime.getMinutes(),       2);
      let ts = AnkUtils.zeroPad(datetime.getSeconds(),       2);
      let ms = AnkUtils.zeroPad(datetime.getMilliseconds(),  3);
      return dy + '-' + dm + '-' + dd + ' ' + th + ':' + tm + ':' + ts + '.' + ms;
    }, // }}}

    getLocale: function (path) { // {{{
      const STR_BUNDLE_SVC = AnkUtils.ccgs('@mozilla.org/intl/stringbundle;1',
                                           Components.interfaces.nsIStringBundleService);
      let stringBundle = STR_BUNDLE_SVC.createBundle(path);
      return function (key, replacements) {
        try {
          if (!replacements) {
            return stringBundle.GetStringFromName(key);
          } else {
            return stringBundle.formatStringFromName(key, replacements, replacements.length);
          }
        } catch (e) {
          return key;
        }
      };
    }, // }}}

    fromUTF8Octets: function (s) { // {{{
      let conv = AnkUtils.ccgs(
        '@mozilla.org/intl/scriptableunicodeconverter',
        Components.interfaces.nsIScriptableUnicodeConverter
      );
      conv.charset = 'UTF-8';
      return conv.ConvertToUnicode(s);
    }, // }}}

    errorToString: function (error) { // {{{
      try {
       return "[" + error.name + "]\n" +
              "  message: " + error.message + "\n" +
              "  filename: " + error.fileName + "\n" +
              "  linenumber: " + error.lineNumber + "\n" +
              "  stack: " + error.stack + "\n";
      } catch (e) {
        return error.toString();
      }
    }, // }}}

    dumpError: function (error, doAlert, added) { // {{{
      let msg = "\n<<ANK<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n";
      msg += this.errorToString(error) ;
      msg += (added ? added+"\n" : '');
      msg += ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n";

      dump(msg);
      Application.console.log(msg);
      if (doAlert)
        window.alert(msg);

      return msg;
    }, // }}}

    dump: function () { // {{{
      if (!AnkUtils.DEBUG)
        return;

      let msg = "";
      if (arguments.length <= 1) {
        msg = "\n<<ANK " + arguments[0] + " >>\n";
      } else {
        msg = "\n<<ANK<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n";
        for (let i = 0; i < arguments.length; i++) {
          msg += "  " + arguments[i] + "\n";
        }
        msg += ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n";
      }
      dump(msg);
      Application.console.log(msg);
      return msg;
    }, // }}}

    time:  function (func, self, args) { // {{{
      let [a, r, b] = [new Date(), func.apply(self, args || []), new Date()];
      let msg = 'time: ' + ((b.getTime() - a.getTime()) / 1000) + 'msec';
      Application.console.log(msg);
      return msg;
    }, // }}}

    decodeDateTimeText: function (datetime) { // {{{
      let d;
      let dtext;
      if ( Array.isArray(datetime) ) {
        datetime.some(function (v) {
          dtext = v;
          d = AnkUtils._decodeDateTimeText(dtext);
          return d;
        });
      }
      else {
        dtext = datetime;
        d = AnkUtils._decodeDateTimeText(dtext);
      }

      if (d) {
        return d;
      }

      // TODO 日時解析失敗時に、自動で現在日時で代替するのか、それとも他の処理を行うのかは、要検討課題
      let msg = 'unsupported datetime format = \''+dtext+'\'';
      AnkUtils.dump(msg);

      if (!AnkBase.Prefs.get('warnWrongDatetimeFormat', false)) {
        // (暫定)呼び出し元でnull pointer exceptionを起こさせて処理を中断させる
        return;
      }

      window.alert(msg);
      return AnkUtils.getDecodedDateTime(new Date(), true);
    }, // }}}

    _decodeDateTimeText: function (dtext) { // {{{
      // 時分 - 年月日
      function calc0 () {
        let m = dtext.match(/^(\d{1,2})\s*[\u6642:\-]\s*(\d{1,2})(?:\s*\D{1,2}\s*)(\d{4})\s*[\u5E74/\-]\s*(\d{1,2})\s*[\u6708/\-]\s*(\d{1,2})/);
        if (!m)
          return;

        d = new Date();
        d.setFullYear(parseInt(m[3]));
        d.setMonth(parseInt(m[4])-1);
        d.setDate(parseInt(m[5]));
        d.setHours(parseInt(m[1]));
        d.setMinutes(parseInt(m[2]));

        return d;
      }

      // 年/月/日 時:分
      function calc1 () {
        let m = dtext.match(/(\d{4})\s*[\u5E74/\-]\s*(\d{1,2})\s*[\u6708/\-]\s*(\d{1,2})(?:\s*\D{1,2}\s*(\d{1,2})\s*[\u6642:\-]\s*(\d{1,2}))?/);
        if (!m)
          return;

        d = new Date();
        d.setFullYear(parseInt(m[1]));
        d.setMonth(parseInt(m[2])-1);
        d.setDate(parseInt(m[3]));
        d.setHours(m[4] ? parseInt(m[4]) : 0);
        d.setMinutes(m[5] ? parseInt(m[5]) : 0);

        return d;
      }

      // 月日,年
      function calc2 () {
        let m = dtext.match(/(\d{1,2})\s*[\u6708/\-]\s*(\d{1,2})(?:st|nd|rd|th)?\s*,\s*(\d{4})/)
        if (!m)
          return;

        d = new Date();
        d.setFullYear(parseInt(m[3]));
        d.setMonth(parseInt(m[1])-1);
        d.setDate(parseInt(m[2]));
        d.setHours(0);
        d.setMinutes(0);

        return d;
      }

      // 相対表記
      function calc3 () {
        let m = dtext.match(/(an?|\d+) (min|hour|day|month|year)/)
        if (!m)
          return;

        let diff = 0;         // 'less than a minute ago', etc.
        let d = m[1].match(/an?/) ? 1 : m[1];
        diff = 60 * 1000 * (
          m[2] === 'year'  ? d*1440*365 :
          m[2] === 'month' ? d*1440*31 :
          m[2] === 'day'   ? d*1440 :
          m[2] === 'hour'  ? d*60 :
                             d);

        d = new Date();
        if (diff)
          d.setTime(d.getTime() - diff);

        return d;
      }

      // 洋式
      function calcx () {
        let d = new Date(dtext.replace(/(\s\d+)(?:st|nd|rd|th),/, "$1,"));
        return isNaN(d.getFullYear()) ? null : d;
      }

      // まずは明らかなゴミを排除 && 連続の空白をまとめる
      dtext = dtext.replace(/[^-,0-9a-zA-Z:\/\u5E74\u6708\u6642\s]/g, '').replace(/\s+/g, ' ').trim();
      let fault = false;
      let dd = calc0() || calc1() || calc2() || calc3() || calcx();   // 0は1と一部被るので0を前に
      if (!dd) {
        return;
      }

      return AnkUtils.getDecodedDateTime(dd, false);
    }, // }}}

    getDecodedDateTime: function (dd, fault) { // {{{
      return {
        year: AnkUtils.zeroPad(dd.getFullYear(), 4),
        month: AnkUtils.zeroPad(dd.getMonth()+1, 2),
        day: AnkUtils.zeroPad(dd.getDate(), 2),
        hour: AnkUtils.zeroPad(dd.getHours(), 2),
        minute: AnkUtils.zeroPad(dd.getMinutes(), 2),
        fault: fault,
      };
    }, // }}}

    /********************************************************************************
    * 配列
    ********************************************************************************/

    A: function (v) Array.slice(v),
    IA: function (v) Iterator(Array.slice(v)),


    /********************************************************************************
    * 色々
    ********************************************************************************/

    popupAlert: function (iconPath, title, text, buttonEnabled, a, b) { // {{{
      try {
        if (navigator.platform.toLowerCase().indexOf('win') < 0)
          iconPath = '';

        const ALERT_SVC = AnkUtils.ccgs("@mozilla.org/alerts-service;1",
                                        Components.interfaces.nsIAlertsService);
        return ALERT_SVC.showAlertNotification.apply(ALERT_SVC, arguments);
      } catch (e) {
        return;
      }
    }, // }}}

    simplePopupAlert: function (title, text) { // {{{
      return this.popupAlert("", title, text, false, null, null);
    }, // }}}

    openTab: function (url, ref) { // {{{
      if ('delayedOpenTab' in window) {
        window.delayedOpenTab(url, ref);
      } else {
        window.getBrowser().addTab(url, ref);
      }
    }, // }}}

    loadURI: function (url) { // {{{
      if (window.loadURI)
        window.loadURI(url);
    }, // }}}

    loadStyleSheet: function (doc, path) { // {{{
      let elem = doc.createElement('link');
      elem.setAttribute('type', 'text/css');
      elem.setAttribute('rel', 'stylesheet');
      elem.setAttribute('media', 'screen');
      elem.setAttribute('href', path);
      let head = doc.getElementsByTagName('head')[0];
      if (head) {
        head.appendChild(elem);
        return elem;
      }
    }, // }}}

    registerSheet: let (registered = {}) function (style, domains) { // {{{
      const IOS = AnkUtils.ccgs('@mozilla.org/network/io-service;1', Ci.nsIIOService);
      const StyleSheetService = AnkUtils.ccgs('@mozilla.org/content/style-sheet-service;1', Ci.nsIStyleSheetService);

      let domainlist = domains.map(function (v) 'domain("'+v+'")').join(',');

      let CSS = [
        '@namespace url(http://www.w3.org/1999/xhtml);',
        '@-moz-document '+domainlist+' {',
        style,
        '}'
      ].join("\n");

      let uri = IOS.newURI('data:text/css,' + window.encodeURIComponent(CSS), null, null);

      if (registered[domainlist])
        StyleSheetService.unregisterSheet(registered[domainlist], StyleSheetService.USER_SHEET);

      registered[domainlist] = uri;
      StyleSheetService.loadAndRegisterSheet(uri, StyleSheetService.USER_SHEET);
    }, // }}}

    // teramako Thanks! http://twitter.com/teramako/status/6926877707
    getRelativePath:  function (target, base) { // {{{
      return AnkUtils.fromUTF8Octets(AnkUtils.makeLocalFile(target).getRelativeDescriptor(AnkUtils.makeLocalFile(base)));
    }, // }}}

    get scrollbarSize () { // {{{
      let doc = content.document;
      let div = doc.createElement('div');
      let s = div.style;
      s.position = 'fixed';
      s.left = s.top = '-200px';
      s.height = s.width = '100px';
      s.overflowX = s.overflowY = 'scroll';
      doc.body.appendChild(div);
      let result = {
          width: 100 - div.clientWidth,
          height: 100 - div.clientHeight,
      };
      doc.body.removeChild(div);
      AnkUtils.__defineGetter__('scrollbarSize', function () result);
      return result;
    }, // }}}

    /********************************************************************************
    * ネットワーク
    ********************************************************************************/

    // FIXME forceAllowThirdPartyCookie does not work in remoteFileExists()

    /*
     * remoteFileExists
     *    url:          チェックする
     *    callback:     function (exists) 存在していれば exists が真
     */
   remoteFileExists: function (url, callback, redirect_loop) { // {{{

     const REDIRECT_LOOP_MAX = 2;

     let ios = AnkUtils.ccgs("@mozilla.org/network/io-service;1", Components.interfaces.nsIIOService);
     let ch = ios.newChannel(url, null, null).QueryInterface(Components.interfaces.nsIHttpChannel);;
     ch.requestMethod = "HEAD";
     ch.redirectionLimit = 0;
     ch.open();

     // TODO 利用されていないのでcallbackの処理は未実装

     if (ch.responseStatus == 302) {
       let redirect_to = ch.getResponseHeader('Location');
       AnkUtils.dump('redirect: from='+url+' to='+redirect_to);
       return redirect_loop > REDIRECT_LOOP_MAX ? null : AnkUtils.remoteFileExists(redirect_to, callback, ++redirect_loop);
     }

     return ch.requestSucceeded && [ch.responseStatus, url, ch.getResponseHeader('Content-Type')];
   }, // }}}


    /*
     * remoteFileExistsRetryable
     *    url:          チェックする
     *    maxTimes:     最大チェック回数
     *    callback:     function (exists) 存在していれば exists が真
     */
   remoteFileExistsRetryable: function (url, maxTimes, callback) { // {{{
     function rfe (callback) {
        let xhr = new XMLHttpRequest();
        xhr.open('HEAD', url, true);
        try {
          xhr.channel.QueryInterface(Ci.nsIHttpChannelInternal).forceAllowThirdPartyCookie = AnkBase.Prefs.get('allowThirdPartyCookie', true);
        } catch(ex) {
          /* unsupported by this version of FF */
        }
        xhr.onreadystatechange = function (e) {
          if (xhr.readyState == 4)
            callback(xhr.status);
        };
        xhr.send(null);
      }

      function call () {
        rfe(function (statusCode) {
          AnkUtils.dump(statusCode);
          if (statusCode == 200) {
            return callback(true);
          }
          if (statusCode == 404) {
            return callback(false);
          }
          ++times;
          if (times < maxTimes)
            return setTimeout(call, times * 10 * 1000);
          return callback(false);
        });
      }

      let times = 0;
      call();
   }, // }}}

   httpGET: function (url,referer,params) { // {{{
     let post = !!params;
     let text = null;
     let xhr = new XMLHttpRequest();
     xhr.open((post ? 'POST' : 'GET'), url, false);
     try {
       xhr.channel.QueryInterface(Ci.nsIHttpChannelInternal).forceAllowThirdPartyCookie = AnkBase.Prefs.get('allowThirdPartyCookie', true);
     } catch(ex) {
       /* unsupported by this version of FF */
     }
     xhr.onreadystatechange = function () {
       if (xhr.readyState == 4 && xhr.status == 200) {
         text = xhr.responseText;
       }
     };
     if (post)
       xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
     if (referer)
       xhr.setRequestHeader('Referer', referer);
     xhr.send(post ? params : null);

     return text;
   }, // }}}

    /********************************************************************************
    * 手抜き用関数
    ********************************************************************************/

    /*
     * ccgs
     *    klass:
     *    service:
     * Components.classes[klass].getService(service)
     */
     ccgs: function (klass, service) { // {{{
       let cc = Components.classes[klass];
       return cc && cc.getService(service);
     }, // }}}

    /*
     * ccci
     *    klass:
     *    _interface:
     * Components.classes[klass].createInstance(interface)
     */
    ccci: function (klass, _interface) {
      let cc = Components.classes[klass];
      return cc && cc.createInstance(_interface);
    }, // {{{

    /*
     * makeLocalFile
     *    path:   プラットフォームに依ったパス
     *    return: nsILocalFile
     */
    makeLocalFile: function (path) { // {{{
      let file = Components.classes['@mozilla.org/file/local;1']
                           .createInstance(Components.interfaces.nsILocalFile);
      file.initWithPath(path);
      return file;
    }, // }}}


    /********************************************************************************
    * DOM関数
    ********************************************************************************/

    /*
     * createHTMLDocument
     * http://nanto.asablo.jp/blog/2009/10/29/4660197
     */
    createHTMLDocument: function (source) { // {{{
      let wcnt = window.content;
      let doc = wcnt.document.implementation.createDocument(
        'http://www.w3.org/1999/xhtml',
        'html',
        wcnt.document.implementation.createDocumentType(
          'html',
          '-//W3C//DTD HTML 4.01//EN',
          'http://www.w3.org/TR/html4/strict.dtd'
        )
      );
      let range = wcnt.document.createRange();
      range.selectNodeContents(wcnt.document.documentElement);
      let content = doc.adoptNode(range.createContextualFragment(source));
      doc.documentElement.appendChild(content);
      return doc;
    }, // }}}

    /*
     * findNodeByXPath
     *    xpath:
     *    return: node
     */
    findNodeByXPath: function (xpath, _doc) // {{{
      let (doc = _doc || this.currentDocument)
        doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue, // }}}

    /*
     * findNodesByXPath
     *    xpath:
     *    return: nodes
     */
    findNodesByXPath: function (xpath, array, _doc) { // {{{
      let nodes =
        let (doc = _doc || this.currentDocument)
          doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
      if (!array)
        return nodes;
      let elem, result = [];
      while (elem = nodes.iterateNext())
        result.push(elem);
      return result;
    }, // }}}

    createTempFile: function (name) { // {{{
      let ds = AnkUtils.ccgs("@mozilla.org/file/directory_service;1", Ci.nsIProperties);
      let file = ds.get("TmpD", Ci.nsIFile);
      file.append('ankpixivtool-' + name);
      file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0600);
      return file;
    }, // }}}

    findHomeDir: function () { // {{{
      let ds = AnkUtils.ccgs("@mozilla.org/file/directory_service;1", Ci.nsIProperties);
      let file;
      [ 'Pict',     // Windows
        'XDGPict',  // Un*x
        'Pct',      // Mach
        'Home' ] .
        some(function (k) {
          try {
            return !!(file = ds.get(k, Ci.nsIFile));
          } catch (e) {
            AnkUtils.dump('unsupported name of directory: '+k);
          }
        });
      return file ? file.path : null;
    }, // }}}

    // Vim 風に返す
    platform: (function () { // {{{
      if (navigator.platform.match(/^win\d+$/i))
        return 'Win32';
      return 'other';
    })(), // }}}

    /*
     * br を改行として認識する textContent
     *    elem:     要素
     *    return:   String;
     */
    textContent: function (elem) { // {{{
      let doc = elem.ownerDocument;
      let temp = doc.createElement('div');
      temp.innerHTML = elem.innerHTML.replace(/<br[\s\/]*>/g, '\n');
      return temp.textContent;
    }, // }}}

    /*
     * 指定の階層分上にあるノードを返す
     *    node:        元ノード
     *    n:           何階層上まであがるか
     *    targetClass: n未満でもtargetClassを持つノードがみつかったらそこで終了
     *    return:   element;
     */
    trackbackParentNode: function (node, n, targetClass) { // {{{
      if (n < 0)
        return node.firstChild;

      for (let i = 0; node && i < n; i++) {
        node = node.parentNode;
        if (targetClass && node.classList.contains(targetClass))
          break;
      }
      return node;
    }, // }}}

    /*
     * urlをパースしたいのでAnchorElementを生成する
     */
    getAnchor: function (url) { // {{{
      let doc = content.document;
      let anchor = doc.createElement('a');
      anchor.href = url;
      return anchor;
    }, // }}}
  };


  /********************************************************************************
    設定用
  ********************************************************************************/

  AnkPref = function (prefix) { // {{{
    if (prefix) {
      this.prefix = prefix + (prefix.match(/\.$/) ? '' : '.');
    } else {
      this.prefix = "";
    }
    return this;
  }; // }}}

  AnkPref.prototype = {
    /*
     * prefs
     *    nsIPrefBranch
     */
    prefs: Components.classes["@mozilla.org/preferences-service;1"]. // {{{
             getService(Components.interfaces.nsIPrefBranch), // }}}

    /*
     * get
     *    name:   項目名
     *    def:    デフォルト値
     *    return: 項目の値
     * 設定値を取得
     */
    get: function (name, def) { // {{{
      try {
        name = this.prefix + name;
        let type = this.prefs.getPrefType(name);
        const nsIPrefBranch = Components.interfaces.nsIPrefBranch;
        switch (type) {
          case nsIPrefBranch.PREF_STRING:
            try {
              return this.prefs.getComplexValue(name, Components.interfaces.nsISupportsString).data;
            }
            catch (e) {
              return this.prefs.getCharPref(name);
            }
            break;
          case nsIPrefBranch.PREF_INT:
            return this.prefs.getIntPref(name);
          case nsIPrefBranch.PREF_BOOL:
            return this.prefs.getBoolPref(name);
          default:
            return def;
        }
      } catch (e) {
        return def;
      }
    }, // }}}

    /*
     * set
     *    name:   項目名
     *    value:  設定する値
     *    type:   型(省略可)
     *    return: ?
     */
    set: function (name, value, type) { // {{{
      name = this.prefix + name;
      switch (type || typeof value) {
        case 'string':
          let str = AnkUtils.ccci('@mozilla.org/supports-string;1', Components.interfaces.nsISupportsString);
          str.data = value;
          return this.prefs.setComplexValue(name, Components.interfaces.nsISupportsString, str);
        case 'boolean':
          return this.prefs.setBoolPref(name, value);
        case 'number':
          return this.prefs.setIntPref(name, value);
        default:
          alert('unknown pref type');
      }
    }, // }}}
  };


  /********************************************************************************
    設定用
  ********************************************************************************/

  /* デバッグの設定を読み取る */
  { // {{{
    let pref = new AnkPref('extensions.ankutils');
    AnkUtils.DEBUG = pref.get('debugMode', false);
  } // }}}


} catch (error) {
 dump("[" + error.name + "]\n" +
      "  message: " + error.message + "\n" +
      "  filename: " + error.fileName + "\n" +
      "  linenumber: " + error.lineNumber + "\n" +
      "  stack: " + error.stack + "\n");
}
