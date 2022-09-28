function sayHello() {
   alert("Hello World")
}

function setInputBoxTip() {
    var x = document.getElementById("poem").checked;
    var tip;
    if (x) {
        tip = "请提供一些关键词。如果空白，程序会自由创作一些诗句。";
    } else{
        tip = "请输入上联。如果没有输入上联，程序会自由创作一些对联。";
    }
    document.getElementById("tip").innerHTML = tip;
    document.getElementById("seed").style.visibility = "visible";
    document.getElementById("submit_button").style.visibility = "visible";
}

function setWaitingMessage() {
    document.getElementById("seed").style.visibility = "hidden";
    document.getElementById("submit_button").style.visibility = "hidden";
    document.getElementById("result_section").innerHTML
    = "程序运行需要几秒钟，请稍等 ……  <br> <progress style=\"width: 20%; height: 30px\"></progress>";
}
