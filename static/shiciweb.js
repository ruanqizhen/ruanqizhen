

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
    document.getElementById("seed").disabled  = true;
    document.getElementById("submit_button").disabled = true;
    document.getElementById("result_section").innerHTML
    = "程序运行需要几秒钟，请稍等 ……  <br> <progress style=\"width: 20%; height: 30px\"></progress>";
}

function stopWaiting() {
    document.getElementById("seed").disabled  = false;
    document.getElementById("submit_button").disabled = false;
    document.getElementById("result_section").innerHTML = "";
}

function writePoem(){
	
	var jqxhr = $.post(
		"https://service.qizhen.xyz/poem/", 
		$('#input_form').serialize(),
	).done(function (data) {
		stopWaiting();
		var result_div = $('#result_section');
		var ul = document.createElement('ul');
		result_div.append(ul);
		for(let i = 0; i < data.length; i++) {
			var ps = document.createElement('li');
			ps.innerHTML = '<span>' + data[i] + '</span>';
			ul.append(ps);
		}

	}).fail(function (xhr, status) {
		document.getElementById("result_section").innerHTML 
		= "<b>服务器目前无法工作。服务器是我的测试机器，不太稳定。请明天再试试！</b><br /><br />";
	});
	setWaitingMessage();
}

