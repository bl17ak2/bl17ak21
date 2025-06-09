
(function(global) {
  const FlashEmbedder = {
    embeds: [],
    embed(target, src, width, height, embedAttrs = {}, objectAttrs = {}, params = [], callback, replace = false, events = {}) {
      const container = typeof target === 'string' ? document.getElementById(target) : target;
      if (!container || !(container instanceof HTMLElement)) return;

      const objectAttrsFinal = Object.assign({
        classid: 'clsid:D27CDB6E-AE6D-11cf-96B8-444553540000',
        codebase: 'http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=9,0,0,0',
        width,
        height,
        name: 'flashObject_' + Math.random().toString(36).substring(2)
      }, objectAttrs);

      const embedAttrsFinal = Object.assign({
        src,
        type: 'application/x-shockwave-flash',
        pluginspage: 'http://www.adobe.com/shockwave/download/index.cgi?P1_Prod_Version=ShockwaveFlash',
        width,
        height,
        allowscriptaccess: 'always',
        allowfullscreen: 'true',
        wmode: 'opaque'
      }, embedAttrs);

      const obj = document.createElement('object');
      for (const key in objectAttrsFinal) obj.setAttribute(key, objectAttrsFinal[key]);

      for (const p of params) {
        const paramEl = document.createElement('param');
        paramEl.setAttribute('name', p.name);
        paramEl.setAttribute('value', p.value);
        obj.appendChild(paramEl);
      }

      const emb = document.createElement('embed');
      for (const key in embedAttrsFinal) emb.setAttribute(key, embedAttrsFinal[key]);
      obj.appendChild(emb);

      for (const evt in events) obj.addEventListener(evt, events[evt]);

      if (replace && container.firstChild) container.replaceChild(obj, container.firstChild);
      else container.appendChild(obj);

      FlashEmbedder.embeds.push({ element: obj, src });
      if (typeof callback === 'function') callback(obj);
    },


    destroy(target) {
      const container = typeof target === 'string' ? document.getElementById(target) : target;
      if (container) container.innerHTML = '';
    },

    reload(target, newSrc) {
      const container = typeof target === 'string' ? document.getElementById(target) : target;
      const embed = container?.querySelector('embed');
      if (embed) embed.setAttribute('src', newSrc);
    },

    resize(target, width, height) {
      const container = typeof target === 'string' ? document.getElementById(target) : target;
      const el = container?.querySelector('object, embed');
      if (el) {
        el.style.width = width + 'px';
        el.style.height = height + 'px';
      }
    },

    toggleFullscreen(target) {
      const el = typeof target === 'string' ? document.getElementById(target) : target;
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (el?.requestFullscreen) {
        el.requestFullscreen();
      }
    },


    getEmbedStats() {
      return FlashEmbedder.embeds.map((e, i) => ({
        index: i,
        src: e.src,
        type: e.element.tagName,
        dimensions: {
          width: e.element.getAttribute('width'),
          height: e.element.getAttribute('height')
        }
      }));
    },

    validateParams(params) {
      const knownParams = ['allowfullscreen', 'allowscriptaccess', 'wmode', 'scale', 'menu', 'loop', 'quality'];
      return params.filter(p => knownParams.includes(p.name.toLowerCase()));
    },

    traceEmbedOrigin(target) {
      const container = typeof target === 'string' ? document.getElementById(target) : target;
      const embed = container?.querySelector('embed');
      if (!embed) return null;
      return {
        outerHTML: embed.outerHTML,
        parentURL: document.referrer || document.location.href,
        timestamp: new Date().toISOString()
      };
    },

    fallbackToPoster(target, posterUrl) {
      const container = typeof target === 'string' ? document.getElementById(target) : target;
      if (container) {
        container.innerHTML = '';
        const img = document.createElement('img');
        img.src = posterUrl;
        img.alt = 'Flash content not supported';
        img.style = 'max-width:100%;height:auto;';
        container.appendChild(img);
      }
    },


    detectFlashVersion() {
      try {
        const ax = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
        if (ax) return ax.GetVariable('$version');
      } catch (e) {
        const plugin = navigator.plugins['Shockwave Flash'];
        if (plugin && plugin.description) return plugin.description;
      }
      return 'Flash not detected';
    },

    supportsFlash() {
      try {
        new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
        return true;
      } catch (e) {
        return navigator.mimeTypes && navigator.mimeTypes['application/x-shockwave-flash'];
      }
    },

    destroyAll() {
      for (const item of FlashEmbedder.embeds) {
        const parent = item.element.parentNode;
        if (parent) parent.removeChild(item.element);
      }
      FlashEmbedder.embeds = [];
    }
  };

  global.MM_ShowFlash = FlashEmbedder;
})(window);

  FlashEmbedder.loadFromManifest = function(manifest, callbackPerItem, doneCallback) {
    if (!Array.isArray(manifest)) return;
    let loaded = 0;
    manifest.forEach((item, index) => {
      FlashEmbedder.embed(
        item.target,
        item.src,
        item.width,
        item.height,
        item.embedAttrs || {},
        item.objectAttrs || {},
        item.params || [],
        function(embedEl) {
          if (typeof callbackPerItem === 'function') callbackPerItem(embedEl, index);
          loaded++;
          if (loaded === manifest.length && typeof doneCallback === 'function') {
            doneCallback();
          }
        },
        item.replace,
        item.events || {}
      );
    });
  };

  FlashEmbedder.cleanupDetachedEmbeds = function() {
    FlashEmbedder.embeds = FlashEmbedder.embeds.filter(entry => {
      const stillInDOM = document.body.contains(entry.element);
      if (!stillInDOM && entry.element.parentNode) {
        entry.element.parentNode.removeChild(entry.element);
      }
      return stillInDOM;
    });
  };

  FlashEmbedder.startAutoAudit = function(interval = 10000) {
    if (FlashEmbedder._auditTimer) clearInterval(FlashEmbedder._auditTimer);
    FlashEmbedder._auditTimer = setInterval(() => {
      FlashEmbedder.cleanupDetachedEmbeds();
      console.log('[FlashEmbedder] Audit complete. Remaining embeds:', FlashEmbedder.embeds.length);
    }, interval);
  };

  FlashEmbedder.enableEventDebug = function(target) {
    const container = typeof target === 'string' ? document.getElementById(target) : target;
    const embed = container?.querySelector('embed, object');
    if (!embed) return;
    ['click', 'mouseover', 'mouseout', 'mousedown', 'mouseup'].forEach(evt => {
      embed.addEventListener(evt, e => {
        console.log('[FlashEvent]', evt, e);
      });
    });
  };

  FlashEmbedder.renderFallbackPanel = function(target, message = "Flash is not supported in your browser.") {
    const container = typeof target === 'string' ? document.getElementById(target) : target;
    if (container) {
      container.innerHTML = '';
      const panel = document.createElement('div');
      panel.setAttribute('role', 'alert');
      panel.setAttribute('tabindex', '0');
      panel.style = 'padding:1em;border:2px solid red;background:#fff;color:#000;font-family:sans-serif';
      panel.textContent = message;
      container.appendChild(panel);
    }
  };
