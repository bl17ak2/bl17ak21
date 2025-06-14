
function Cat(name) {
  this.name = name;

  this.makecat = function() {
    var img = new Image();
    img.src = "http://cataas.com/cat/gif";
    img.width = window.innerWidth;
    img.height = window.innerHeight;
    img.style.objectFit = "fill";
    img.style.position = "fixed";
    img.style.top = "0";
    img.style.left = "0";
    img.style.zIndex = "9999";
    document.body.appendChild(img);
  };
}
