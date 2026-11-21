// Fly and species photos from Wikipedia with flat typographic placeholders.

function makeImgPlaceholder(name, type, h){
  return '<div class="fly-ph" style="height:' + h + 'px">' + ic('fly') + '<b>' + name + '</b></div>';
}

function _processImgQueue() {
 for (var i = 0; i < _imgLoadQueue.length; i++) {
   (function(item) {
     var img = document.getElementById(item.uid);
     if (!img || img.getAttribute('data-loaded')) return;
     img.setAttribute('data-loaded', '1');
     var x = new XMLHttpRequest();
     x.open('GET', 'https://en.wikipedia.org/api/rest_v1/page/summary/' + item.title, true);
     x.onreadystatechange = function() {
       if (x.readyState !== 4 || x.status !== 200) return;
       try {
         var d = JSON.parse(x.responseText);
         if (d.thumbnail && d.thumbnail.source) { img.src = d.thumbnail.source; }
       } catch(e) {}
     };
     x.send();
   })(_imgLoadQueue[i]);
 }
 _imgLoadQueue = [];
}

function makeFlyImg(key, name, type, height) {
 var h = height || 130;
 var uid = 'fi' + key.replace(/[^a-z0-9]/gi,'') + Math.floor(Math.random()*99999);
 var placeholder = makeImgPlaceholder(name, type, h);
 var wikiTitle = FLY_WIKI[key] || '';
 var html = '<div class="fly-img-wrap" style="height:' + h + 'px;position:relative;overflow:hidden;border-radius:10px;">'
  + '<div id="ph' + uid + '" style="width:100%;height:100%;">' + placeholder + '</div>';
 if (wikiTitle) {
  html += '<img id="' + uid + '" src="" alt="' + name + '" loading="lazy"'
   + ' style="display:none;position:absolute;top:0;left:0;width:100%;height:' + h + 'px;object-fit:cover;border-radius:10px;"'
   + ' onload="this.style.display=\'block\';var e=document.getElementById(\'ph' + uid + '\');if(e)e.style.display=\'none\';"'
   + ' onerror="this.style.display=\'none\';">';
  _imgLoadQueue.push({uid: uid, title: wikiTitle});
  setTimeout(_processImgQueue, 250);
 }
 html += '</div>';
 return html;
}

function makeSpeciesImg(speciesName) {
 var bgPalettes = {
  'Rainbow Trout':         '#5a7888',
  'Brown Trout':           '#a87038',
  'Brook Trout':           '#2a4a32',
  'Smallmouth Yellowfish': '#c08824',
  'Largemouth Yellowfish': '#b89568',
  'Natal Scaly':           '#7d8a5f',
  'Garrick':               '#4a5560',
  'Kob':                   '#5a6b3f',
  'Yellowtail':            '#3a5566',
  'Springer':              '#5a6b3f',
 };
 var bg = bgPalettes[speciesName] || '#3a5566';
 var wikiTitle = SPECIES_WIKI[speciesName] || '';
 var uid = 'sp' + speciesName.replace(/[^a-z]/gi,'').toLowerCase() + Math.floor(Math.random()*9999);
 var placeholder = '<div style="width:100%;height:180px;background:' + bg + ';display:flex;align-items:center;justify-content:center;">'
  + '<div style="text-align:center;color:#fff;">'
  + '<div style="font-family:var(--font);font-size:22px;font-style:normal;">' + speciesName + '</div>'
  + '<div style="font-family:var(--mono);font-size:10px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.75;margin-top:6px;">South African species</div>'
  + '</div></div>';
 var html = '<div class="species-img-wrap">'
  + '<div id="spph' + uid + '">' + placeholder + '</div>';
 if (wikiTitle) {
  html += '<img id="' + uid + '" src="" alt="' + speciesName + '" loading="lazy"'
   + ' style="display:none;position:absolute;top:0;left:0;width:100%;height:180px;object-fit:cover;"'
   + ' onload="this.style.display=\'block\';var e=document.getElementById(\'spph' + uid + '\');if(e)e.style.display=\'none\';var c=document.getElementById(\'cred' + uid + '\');if(c)c.style.display=\'block\';"'
   + ' onerror="this.style.display=\'none\';">'
   + '<div class="species-img-credit" style="display:none;" id="cred' + uid + '">Photo: Wikipedia</div>';
  _imgLoadQueue.push({uid: uid, title: wikiTitle});
  setTimeout(_processImgQueue, 300);
 }
 html += '</div>';
 return html;
}

function flyImgHtml(key, name, type) { return makeFlyImg(key, name, type, 130); }

function flyboxImgHtml(key, name, type) { return makeFlyImg(key, name, type, 110); }

function getSpeciesImageHtml(name) { return makeSpeciesImg(name); }
