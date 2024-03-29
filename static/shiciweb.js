

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

function generateImage(){
		
	var jqxhr2 = $.post(
		"https://service.qizhen.xyz/poem/", 
		$('#input_form').serialize(),
	).done(function (data) {
		$('#poem_result').html('');
	    var result_div = $('#poem_result');
		var ul = document.createElement('ul');
		ul.setAttribute('style','list-style: none;');
		result_div.append(ul);
		for(let i = 0; i < data.length; i++) {
			var ps = document.createElement('li');
			ps.innerHTML = '<span>' + data[i] + '</span>';
			ul.append(ps);
		}
	}).fail(function (xhr, status) {
		$('#poem_result').html('暂时没有诗词结果<br /><br />');
	});
	
	var jqxhr = $.post(
		"https://service.qizhen.xyz/genimg/", 
		$('#input_form').serialize(),
	).done(function (data) {
		$('#result_section').html('<img id="result_img" style="max-width:99%;" src="data:image/png;base64,' + data + '" />')
		$('#add_comment').attr("style", "visibility: visible")
	}).fail(function (xhr, status) {
		$('#result_section').html('<b>服务器目前无法工作。服务器是我的测试机器，不太稳定。请明天再试试！</b><br /><br />');
	});
	
	$('#add_comment').attr("style", "visibility: hidden")
	$('#poem_result').html('程序作诗需要几十秒钟，请稍等 ……');
	$('#result_section').html('程序绘图需要几十秒钟，请稍等 ……  <br> <progress style=\"width: 20%; height: 30px\"></progress>');
}

function checkStatus(){
	
	var jqxhr = $.get(
		"https://service.qizhen.xyz/status/", 
	).done(function (data) {
		var anchor_node = $('#model');
		switch(data) {
		  case "1":
			// anchor_node.html("目前正在运行<b>“吟诗作对”</b>模型。");
			// $('#genimg_link').addClass("disableHref");
			break;
		  case "2":
			// anchor_node.html("目前正在运行<b>“电脑绘图”</b>模型。");
			// $('#genpoem_link').addClass("disableHref");
			break;
		  default:
			anchor_node.html("<b>目前服务器无法工作，啥都运行不了！</b>");
			$('#genimg_link').addClass("disableHref");
			$('#genpoem_link').addClass("disableHref");
		}

	}).fail(function (xhr, status) {
		var anchor_node = $('#model');
		anchor_node.html("<b>目前服务器无法工作，啥都运行不了！</b>");
		$('#genimg_link').addClass("disableHref");
		$('#genpoem_link').addClass("disableHref");
	});
	document.querySelector('#submit_button').focus();
}

function addComments(){
	
	var comment_node = $('#veditor');
	var image_node = $('#result_img');
	comment_node.val($('#promptt').val() + '\n' + '<img src="' + image_node[0].src + '" />');
	document.querySelector('#veditor').focus();
	document.querySelector('#submit_button').focus();
	document.querySelector('#veditor').focus();
	
}
