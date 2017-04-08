'use strict';

var express = require('express');
var router = express.Router();

var request = require("request");
var rp = require('request-promise');
var cheerio = require("cheerio");
var mongojs = require("mongojs");
var path = require('path');

//function to get address
var clSearch = (postedToday, minPrice, maxPrice, make, minyear, maxMiles, onlyAutoTran) => {
	//will not add auto tran if false
	var transmission = '';
	var today = '';
	if (onlyAutoTran) {transmission = '&auto_transmission=2'}
	if (postedToday) {today = '&postedToday=1'}

	return 'https://charlotte.craigslist.org/search/cta?srchType=T' + today +'&bundleDuplicates=1&search_distance=60&postal=28277&min_price='+minPrice+'&max_price=' 
 + maxPrice + '&auto_make_model='+ make +'&min_auto_year='+minyear+'&max_auto_miles=' + maxMiles + '&auto_title_status=1' + transmission;
}

//function to complete href links
var urlGen = (href) => {
	
		if (href[1] == '/') {
			return 'https:'  + href;
		} else {
			return 'https://charlotte.craigslist.org'  + href;
		}
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendFile(path.join(__dirname, '/../views/index.html'));
});

// Database configuration
var databaseUrl = "mongodb://heroku_rh9df1q2:bmp7h13br8nqkeafb9bl3stc8q@ds149278.mlab.com:49278/heroku_rh9df1q2/";
// var collections = ["craigslistCars"];

// Hook mongojs configuration to the db variable
var db = mongojs(databaseUrl); 

db.on("error", function(error) {
  console.log("Database Error:", error);
});



// Retrieve data from the db
router.get("/all", function(req, res) {
  // Find all results from the craigslistCars collection in the db
  db.craigslistCars.find({}, function(error, found) {
    // Throw any errors to the console
    if (error) {
      console.log(error);
    }
    // If there are no errors, send the data to the browser as a json
    else {
      res.json(found);
    }
  });
});

router.get('/init', function(req, res) {
  db.craigslistCars.createIndex( { "clid": 1 }, { unique: true }, function(error, found) {
    // Throw any errors to the console
    if (error) {
      console.log(error);
    }
    // If there are no errors, send the data to the browser as a json
    else { 
    	res.json({});
    }
  });
});


router.get("/return/:make", function(req, res) {
	db.craigslistCars.find({make: req.params.make}, function(error, found) {
    // Throw any errors to the console
    if (error) {
      console.log(error);
    }
    // If there are no errors, send the data to the browser as a json
    else {
      res.json(found);
    }
  });
}); 
 
router.get("/update/:option/:clid", function(req, res) {
	switch(req.params.option) {
		case 'no':
			db.craigslistCars.update(
				{clid: req.params.clid},
				{$set:
					{no: true, yes: false, maybe: false}
				}, function(error, saved) {
			          // If there's an error during this query
			          if (error) {
			            // Log the error
			            console.log(error);
			          }
			          // Otherwise,
			          else {
			            // Log the saved data
			            console.log(saved);
			          }
			});
			console.log(req.params.clid)
			console.log('set to no');
			break;
		case 'yes':
			db.craigslistCars.update(
				{clid: req.params.clid},
				{$set:
					{no: false, yes: true, maybe: false}
				}, function(error, saved) {
			          // If there's an error during this query
			          if (error) {
			            // Log the error
			            console.log(error);
			          }
			          // Otherwise,
			          else {
			            // Log the saved data
			            console.log(saved);
			          }
			});
			console.log(req.params.clid)
			console.log('set to yes');
			break;
		case 'maybe':
			db.craigslistCars.update(
				{clid: req.params.clid},
				{$set:
					{no: false, yes: false, maybe: true}
				}, function(error, saved) {
			          // If there's an error during this query
			          if (error) {
			            // Log the error
			            console.log(error);
			          }
			          // Otherwise,
			          else {
			            // Log the saved data
			            console.log(saved);
			          }
			});
			console.log(req.params.clid)
			console.log('set to maybe');
			break;
	}
	res.json({})
});


router.get("/scrape/:make", function(req, res) {
	
	
	console.log('hi');
	console.log(req.params.make);
	var url = clSearch(false, 3000, 5500, req.params.make, 1999, 150000, false);
  	

  	// Scrape data from craigslist search page and get url's of matching cars
  	rp(url).then(function (html) {
	    var $ = cheerio.load(html);
	    console.log(url);

	    var results = $('a.result-title');
	    console.log('results:  ***********');
	    // console.log(results);
	    for (var i = 0; i < results.length; i++) {
	    	// console.log('*****************************************************************')
	    	// console.log(results[i]['attribs'].href);
	    	// console.log(results[i]['children'][0].data);

	    	let link = results[i]['attribs'].href;
	    	var title = results[i]['children'][0].data;

	    	link = urlGen(link);

	    	//going to indvidual cl pages and scraping title, post, and images
	    	rp(link).then(function (html2) {
			    // Load the html body from request into cheerio
			    // console.log(link);
			    var $ = cheerio.load(html2);
			    var script = $('script');
			    var title = $('#titletextonly')[0].children[0]['data'];
			    var post = $('#postingbody')[0]['children'][2].data;
			    var price = $('.price')[0].children[0]['data'];
			    console.log(price);
			    // console.log(post);
			    try {
			    	var current = script[2].children[0]['data'];
			    	var picsJson = JSON.parse(current.substr(19).slice(0, -5));
			    	// console.log(title);
			    	// console.log(picsJson);
			    	// console.log(picsJson);
			    	var tempPics = [];
			    	for (var i = 0; i < picsJson.length; i++){
			    		tempPics.push(picsJson[i].url);
			    	}
			    	// console.log(tempPics);
			    }
			    catch (e) {
			    		console.log('*/*/*/*/*/*/*/*/*/*/*/*/');
						console.log('NO PICS');
						var tempPics = [];
			    }

				let clid = link.slice(link.length-15, link.length-5);

				if (title && link) { 
	      	
			        // Save the data in the craigslistCars collection
			        var obj = {
							title: title, 
							pics: tempPics,
							price: price,
							post: post,
							link: link,
							make: req.params.make,
							yes: false,
							no: false,
							maybe: true,
							clid: clid
			        }

			        db.craigslistCars.save(obj,

				        function(error, saved) {
				          // If there's an error during this query
				          if (error) {
				            // Log the error
				            console.log(error);
				          }
				          // Otherwise,
				          else {
				            // Log the saved data
				            console.log(saved);
				          }
				        });
			      }
			    



			}).catch(function(e){
				if (e.statusCode == '404') {
					console.log('status code');
					console.log(e.statusCode);
					console.log('uri');
					console.log(e.options.uri)
					//remove from database
					db.craigslistCars.remove({link: e.options.uri});
				}
			});
		}
    res.json({});
    
  }).catch(function(e){console.log(e)});

  // This will send a "Scrape Complete" message to the browser
  //res.send("Scrape Complete");
});

module.exports = router;
