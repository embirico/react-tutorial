window.requestAnimFrame = window.requestAnimationFrame       ||
                          window.webkitRequestAnimationFrame ||
                          window.mozRequestAnimationFrame    ||
                          window.oRequestAnimationFrame      ||
                          window.msRequestAnimationFrame     ||
                          function( callback ){
                            window.setTimeout(callback, 1000 / 60);
                          };

var SCALE = .15;
var WIDTH = 1410;
var HEIGHT = 750;
var svg = d3.select('#locs');
var mainCanvas = document.getElementById('court').getContext('2d');
var getStrokeOpacity = d3.scale.pow().exponent(-0.75)
	.domain([10,1000])
	.range([1, 0.1])
	.clamp(true);
var filters = {
	made: null,
	off_def: 'Off',
	grid: []
};
var firstLoad = true;
var data;
var selected;
var times = [];
var durations = [];

d3.selectAll('.grid-sized')
	.attr({
		width: WIDTH,
		height: HEIGHT
	});

function updateData(path) {
	d3_queue.queue()
		.defer(d3.json, path)
		.await(function(err, json) {
			data = json.map(function(d) {
				d.p = scalePath(d.p);
				return d;
			});
			draw();
			placeSquares();
		});
}

function scalePath(d) {
	var reM = /M(\d+),(\d+)/;
	var reC = /(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)/;
	var splitStr = d.split("C");
	var newP = 'M' + reM.exec(splitStr[0]).slice(1).map(function(d) { return Math.round(parseInt(d) * SCALE); }).join(',');
	for (var i = 1; i < splitStr.length; i++) {
		newP += 'C' + reC.exec(splitStr[i]).slice(1).map(function(d) { return Math.round(parseInt(d) * SCALE); }).join(',');
	}
	return newP;
}

function placeSquares() {
	var width = 4.087;
	var height = 4.167;
	var array = [];
	for (var i = 0; i < 23; i++) {
		for (var j = 0; j < 12; j++) {
			array.push({'x': i, 'y': j});
		}
	}
	d3.select('#locs')
		.selectAll('rect')
		.data(array).enter()
		.append('rect')
		.attr({
			'class': 'trav-box',
			'width': width * 15,
			'height': height * 15,
			'x': function(d) { return d.x * width * 15; },
			'y': function(d) { return d.y * height * 15; }
		})
		.on('mouseover', function() {
			d3.select(this).classed('hovered', true)
		})
		.on('mouseout', function() {
			d3.select(this).classed('hovered', false)
		})	
		.on('click', function(d) {
			d3.event.shiftKey ? addGrid('('+d.x+', '+d.y+')', this) : setGrid('('+d.x+', '+d.y+')', this);
			draw();
		});
}

function draw() {
	var i = 0;
	var made = 0;
	var count = 0;
	var n;
	var strokeOpacity;
	var section;
	mainCanvas.clearRect(0,0,WIDTH,HEIGHT);
	mainCanvas.lineWidth = 1.3;

	times = [];
	durations = [];
	selected = _.filter(data, function(d) { return passFilters(d); });
	n = selected.length;
	strokeOpacity = getStrokeOpacity(n);

	section = 10;
	section = firstLoad ? Math.floor(n/50) : n;
	firstLoad = false;

	function render() {
		var max = Math.min(i + section, n);
		for (var j = i; j < max; j++) {
			placeShown(mainCanvas, selected[j], strokeOpacity);
			// console.log(selected[j].off_def)

			// Do calculations
			count += 1;
			// FG make %
			if (selected[j].made) made += 1;
			// Histogram of time in game
			times.push(selected[j].t)
			// if (selected[j].dur > 0.5) durations.push(selected[j].dur);
		}
		i = max;
		// console.log('Num paths: ' + count);
		// console.log('% ended w/ made FG: ' + made / n);
	}

	(function renderLoop(){
		if (i >= n) {
			hist('times', 500, 200);
			return;
		}
		requestAnimFrame(renderLoop);
		render();
	})();
	
}

function placeShown(ctx, d, strokeOpacity) {
	ctx.strokeStyle = 'rgba(255,255,255,' + strokeOpacity + ')';
	var p = new Path2D(d.p);
	ctx.stroke(p);
}

function passFilters(d) {
	var made = filters.made === null ? true : filters.made == d.made;
	var off_def = filters.off_def === null ? true : filters.off_def == d.off_def;
	var grid = checkGrids(d);
	return made && off_def && grid;
}

function checkGrids(d) {
	for (var i = 0; i < filters.grid.length; i++) {
		if (d.g.indexOf(filters.grid[i]) == -1) return false;
	}
	return true;
}

function filter(prop, newVal) {
	filters[prop] = newVal;
	draw();
}

function addGrid(newVal, rect) {
	var ind = filters.grid.indexOf(newVal);
	if (ind == -1) {
		filters.grid.push(newVal);
		d3.select(rect).classed('selected', true);
	} else {
		filters.grid.splice(ind, 1);
		d3.select(rect).classed('selected', false);
	}
}

function setGrid(newVal, rect) {
	d3.selectAll('.trav-box').classed('selected', false);
	if (_.isEqual(filters.grid, [newVal])) {
		filters.grid = [];
	} else {
		filters.grid = [newVal];
		d3.select(rect).classed('selected', true);	
	}
}

var formatTick = function(d) {
  switch (d) {
    case 0: return 'Q1';
    case 36: return 'Q2';
    case 72: return 'Q3';
    case 108: return 'Q4';
    case 144: return 'OT';
    default: return '';
  }
}

function hist(bindTo, w, h) {
	var margin = {top: 10, right: 30, bottom: 30, left: 30};
	var width = w - margin.left - margin.right;
	var height = h - margin.top - margin.bottom;

	var x = d3.scale.linear()
		.domain([0, 159])
		.range([0, width]);

	var hist = d3.layout.histogram()
		.bins(x.ticks(159))(times);

	var y = d3.scale.linear()
		.domain([0, d3.max(hist, function(d) { return d.y; })])
		.range([height, 0]);

	var xAxis = d3.svg.axis()
		.scale(x)
		.outerTickSize(0)
		.tickValues([0,36,72,108,144])
		.tickFormat(formatTick)
		.orient("bottom");

	d3.select('#'+bindTo).html('')
	var svg = d3.select("#"+bindTo)
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var bar = svg.selectAll(".bar")
		.data(hist)
		.enter().append("g")
		.attr("class", "bar")
		.attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

	bar.append("rect")
		.attr("width", x(hist[0].dx))
		.attr("height", function(d) { return height - y(d.y); });

	svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis);
}

updateData('curry_compressed_combined.json')
