"use strict";

var args = require('minimist')(process.argv.slice(2));

if (!args.url) {
	console.log('What do you think about there, man?');
	return;
}

var async = require('async');
var cheerio = require('cheerio');
var fs = require('fs');
var request = require('request');

var defaults = {
	level: 1,
	limitHighLevel: 2,
	limitMaxLevel: 10
};

var levelMax = args.lvl || defaults.level;
var normUrl = !~args.url.indexOf('http://') ? 'http://' + args.url : args.url;
var links = [
	{
		link: normUrl,
		children: []
	}
];

//Main Q will contain first page links check (which will have child Q) + saving file operations
//That's just an array of functions
var mainQ = [];

//Function used to add another functions calls to different queues
function addToQeue(qeue, func, params){
	qeue.push(function(asyncCB){
		params = params ? params.push(asyncCB) && params : [asyncCB];
		func.apply(null, params);
	});
}

//Get links for specific page, call asyncCB or create another queue for deeper level
function getLinks(linkObj, levelCurrent, asyncCB) {
	request(linkObj.link, function (error, response, body) {

		if (error) {
			console.log('Nothing works!');
			asyncCB(null);
			return;
		}

		var $ = cheerio.load(body);
		var $links = $('a');
		var levelNext = levelCurrent + 1;
		var curLimit = levelNext  == levelMax ? defaults.limitMaxLevel : defaults.limitHighLevel;

		$links.each(function () {

			var link = $(this).attr('href');

			if (filterLink(link)) {

				var childLinkObj = {
					link: link,
					children: []
				};

				linkObj.children.push(childLinkObj);

				console.log(link, filterLink(link), 'good');
			}

		});

		if(levelNext <= levelMax){

			var childQ = [];

			linkObj.children.forEach(function(childLinkObj){
				//Add each child page links picking to the child queue
				addToQeue(childQ, getLinks, [childLinkObj, levelNext]);
			});

			async.parallelLimit(
				childQ,
				curLimit,
				function(err){
					if(err){
						console.log(err);
						return;
					}
					asyncCB(null);
				}
			);

		} else {
			asyncCB(null);
		}

	});
}

function filterLink(link) {
	if (!/^http:\/\/|^https:\/\//gi.test(link)) {
		return false;
	}
	if (/\.html$|\.htm$|\.php$|\.asp$|\/$/gi.test(link)) {
		return false;
	}
	return true;
}

function saveJSON(asyncCB){
	fs.writeFile("./res/links.json", JSON.stringify(links, 0, 4), function(err){
		if(err){
			console.log(err);
			asyncCB(null);
		} else {
			console.log('Data saved!');
			asyncCB(null);
		}
	});
}

//Add first page links picking to the main queue
addToQeue(mainQ, getLinks, [links[0], 1]);
addToQeue(mainQ, saveJSON);

async.waterfall(
	mainQ,
	function (err) {
		if(err){
			console.log(err);
			return;
		}
		console.log('Gathering, and saving data is finished!');
	}
);




