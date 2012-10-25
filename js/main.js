document.getElementById('file').addEventListener('change', handleFileSelect, false)

function arr2str(buf) {
  return String.fromCharCode.apply(null, buf)
}

function getColorData(ctx, img, multiplier) {
  ctx.drawImage(img, 0, 0)
  
  var imageData = ctx.getImageData(0, 0, img.width, img.height)
    , pixels = imageData.data
    , shadow = []
    , colum, row
      
  for (var i = 4, len = pixels.length; i < len; i += 4) {
    row = Math.floor(i / 4 / img.width)
    column = i / 4 % img.width
        
    row *= multiplier
    column *= multiplier
        
    shadow.push(column +'px '+ row +'px 0 rgba('+ pixels[i] +', '+ pixels[i + 1] +', '+ pixels[i + 2] +', '+ pixels[i + 3] / 255 +')')
  }
  
  return {
    color: 'rgba('+ pixels[0] +', '+ pixels[1] +', '+ pixels[2] +', '+ pixels[3] / 255 +')',
    shadow: shadow.join(',')
  }
}

function img2anim(header, frames) {
  var canvas = document.createElement('canvas')
    , ctx = canvas.getContext('2d')
    , result = document.getElementById('result')
    , multiplier = 4
    , styleSheet = document.styleSheets[0]
    , img, base64encoded
        
  for (var i = 0, len = frames.length; i < len; i++) {
    base64encoded = 'data:image/gif;base64,' + btoa(arr2str(header) + arr2str(frames[i]))
    
    img = document.createElement('img')
    
    img.onload = (function(i, img) {
      return function() {  
        canvas.setAttribute('width', img.width)
        canvas.setAttribute('height', img.height)
        
        var data = getColorData(ctx, img, multiplier)
      
        styleSheet.insertRule('.frame'+ i +'{background:'+ data.color +';box-shadow:'+ data.shadow +'}', i )
      }
    }(i, img))
    
    img.src = base64encoded
  }
  
  setTimeout(function(){
    result.style.width  = multiplier + 'px'
    result.style.height = multiplier + 'px'
    
    i = 0
    
    function loop(){
      result.classList.remove('frame' + (i-1))
      if (frames[i]) {
        result.classList.add('frame' + i)
        ;++i
      } else {
        i = 0
        result.classList.add('frame' + i)
      }
      setTimeout(loop, 100)
    }
    
    loop()

  }, 0)
}

function img2vexel(base64img) {
  var img = document.createElement('img')
    , canvas = document.createElement('canvas')
    , ctx = canvas.getContext('2d')
    , result = document.getElementById('result')
    , style = result.style
    , multiplier = 4
    , shadow = []
    
  img.onload = function() {
    canvas.setAttribute('width', img.width)
    canvas.setAttribute('height', img.height)
    
    var data = getColorData(ctx, img, multiplier)
      
    style.width = multiplier + 'px'
    style.height = multiplier + 'px'
    style.background = data.color
    style.boxShadow = data.shadow
  }
    
  img.src = base64img
}

function handleFileSelect(evt) {
  var files = evt.target.files
    , f = files[0]
    , reader = new FileReader()
    
  if (!f.type.match('image.*')) return
  
  if (f.type.match('.*gif')) {
    reader.onload = (function(theFile) {
      return function(e) {
        var arr = new Uint8Array(e.target.result)
          , frames = []
          , header = []
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
        
        img2anim(header, frames)
        
      }
    })(f)
 
    reader.readAsArrayBuffer(f)
  } else {
    reader.onload = (function(theFile) {
      return function(e) {
        img2vexel(e.target.result)
      }
    })(f)
 
    reader.readAsDataURL(f)
  }
}