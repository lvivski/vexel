(function(){

var dropZone = document.getElementById('dropzone')

dropZone.addEventListener('dragenter', handleDragEnter, false)
dropZone.addEventListener('dragover', handleDragEnter, false)
dropZone.addEventListener('dragleave', handleDragLeave, false)
dropZone.addEventListener('drop', handleFileSelect, true)

function handleDragEnter(e) {
  e.preventDefault()
  e.target.className = 'over'
}

function handleDragLeave(e) {
  e.target.className = ''
}

function handleFileSelect(e) {
  e.stopPropagation()
  e.preventDefault()
  e.target.className = ''

  var files = files = e.dataTransfer.files,
      f = files[0],
      reader = new FileReader(),
      cb, fn
  try {
    document.styleSheets[0].deleteRule(0)
    document.styleSheets[0].deleteRule(1)
  } catch(e) {}

  if (!f.type.match('image.*')) return

  if (f.type.match('.*gif')) {
    cb = img2anim
    fn = 'readAsArrayBuffer'
  } else {
    cb = img2vexel
    fn = 'readAsDataURL'
  }

  reader.onload = (function(f, cb) {
    return function(e) {
      cb(e.target.result)
    }
  })(f, cb)

  reader[fn](f)
}

function atos(a) {
  return String.fromCharCode.apply(null, a)
}

function preText(text) {
  return text.replace(/([;{}])\s?/g, '$1\n').replace(/,\srgb/g, ',\n  rgb').replace(/ent,/g, 'ent,\n  ').replace(/\),/g, '),\n  ')
}

function renderStylesheet() {
  var styleSheet = document.styleSheets[0],
      list = [],
      rule
  for (i = 0, len = styleSheet.cssRules.length; i < len; i++) {
    rule = styleSheet.cssRules[i]
    if (rule.type === 7) { // keyframes
      list.push('@keyframes ' + rule.name + ' {\n')
      for (var j = 0, innerLen = rule.cssRules.length; j < innerLen; j++) {
        list.push(preText(rule.cssRules[j].cssText))
      }
      list.push('}\n')
    } else if (rule.type === 1) { // ruleset
      list.push(preText(rule.cssText))
    }
  }
  var frag = document.createDocumentFragment()
  list.forEach(function(e){
    var code = document.createElement('code')
    code.textContent = e
    frag.appendChild(code)
  })
  document.getElementById('stylesheet').innerHTML = ''
  document.getElementById('stylesheet').appendChild(frag)
}

function getFrames(data) {
  var arr = new Uint8Array(data),
      frames = [],
      header = []
  for(var i = 0, len = arr.length; i < len; i++) {
    if (arr[i] === 0x00 &&
        arr[i+1] === 0x21 &&
        arr[i+2] === 0xF9 &&
        arr[i+3] === 0x04 &&
    		arr[i+8] === 0x00 &&
    		(arr[i+9] === 0x2C || arr[i+9] === 0x21))
    {
      frames[frames.length] = [arr[i]]
    } else {
      if (frames[frames.length-1]) {
        frames[frames.length-1].push(arr[i])
      } else { // header
        header.push(arr[i])
      }
    }
  }

  return {
    header: header,
    frames: frames
  }
}

function getColorData(ctx, img, multiplier) {
  var width = img.width,
      height = img.height,
      max = Math.max(width, height),
      ratio = max > 128 ? 128 / max : 1

  width *= ratio
  height *= ratio

  ctx.canvas.setAttribute('width', width)
  ctx.canvas.setAttribute('height', height)
  ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, width, height)

  var imageData = ctx.getImageData(0, 0, width, height),
      pixels = imageData.data,
      shadow = [],
      colum, row

  for (var i = 4, len = pixels.length; i < len; i += 4) {
    row = Math.floor(i / 4 / width)
    column = i / 4 % width

    row *= multiplier
    column *= multiplier

    shadow.push(column +'px '+ row +'px 0 rgba('+ pixels[i] +', '+ pixels[i+1] +', '+ pixels[i+2] +', '+ pixels[i+3]/255 +')')
  }

  return {
    color: 'rgba('+ pixels[0] +', '+ pixels[1] +', '+ pixels[2] +', '+ pixels[3] / 255 +')',
    shadow: shadow.join(',')
  }
}

function img2anim(imgData) {
  var ctx = document.createElement('canvas').getContext('2d'),
      multiplier = 4,
      styleSheet = document.styleSheets[0],
      loaded = [],
      data = getFrames(imgData),
      header = data.header,
      frames = data.frames,
      prefix = Array.prototype.slice.call(
          getComputedStyle(document.documentElement, null)
        ).join('').match(/-(moz|webkit|ms)-/)[0] || '',
      img, base64encoded, first

  var keyframes = ['@' + prefix + 'keyframes frames {']

  for (var i = 0, len = frames.length; i < len; i++) {
    base64encoded = 'data:image/gif;base64,' + btoa(atos(header) + atos(frames[i]))

    img = document.createElement('img')

    img.onload = (function(i, img) {
      return function() {
        var data = getColorData(ctx, img, multiplier)

        if (i === 0) first = data

        keyframes.push(Math.round(i * 100 / (len - 1)) +'%{background:'+ data.color +';box-shadow:'+ data.shadow +'}')

        if (loaded.push(i) === len) {
          keyframes.push('}')
          styleSheet.insertRule(keyframes.join('\n'), 0 )
          styleSheet.insertRule([
            '#vexel {',
            'display: block;',
            'width:'+ multiplier +'px;',
            'height:'+ multiplier +'px;',
            prefix + 'transform:translate3d(0,0,0);',
            prefix + 'animation:frames '+ len * 0.1 +'s steps('+ len +', end) infinite',
            '}'
          ].join('\n'), 1)

          renderStylesheet()
        }
      }
    }(i, img))

    img.src = base64encoded
  }
}

function img2vexel(base64img) {
  var img = document.createElement('img'),
      canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d'),
      styleSheet = document.styleSheets[0],
      multiplier = 4,
      shadow = []

  img.onload = function() {
    canvas.setAttribute('width', img.width)
    canvas.setAttribute('height', img.height)

    var data = getColorData(ctx, img, multiplier)

    styleSheet.insertRule([
      '#vexel {',
      'display: block;',
      'width:'+ multiplier +'px;',
      'height:'+ multiplier +'px;',
      'background:'+ data.color +';',
      'box-shadow:'+ data.shadow,
      '}'
    ].join('\n'), 0)

    renderStylesheet()
  }

  img.src = base64img
}

}())