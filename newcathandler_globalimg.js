
function Cat(name) {
  this.name = name;

  this.makecat = function() {
    img = new Image(); // global variable, not this.img
    img.src = "http://cataas.com/cat/gif";
    document.body.appendChild(img);
  };
}
