var template_path = Qva.Remote + "?public=only&name=Extensions/DirectedDiagram/";

function extension_Init() {
	// Load d3
	Qva.LoadScript(template_path + "d3.min.js", function(){
		// Load jQuery if necessary
	if (typeof jQuery == 'undefined') {
	    Qva.LoadScript(template_path + 'jquery.js', extension_Done);
	    console.log("jQuery undefined");
	}
	else {
		 extension_Done();
	}        
 });
}

function extension_Done(){
	//Add extension
	Qva.AddExtension('DirectedDiagram', function(){
		//Load a CSS style sheet
		Qva.LoadCSS(template_path + "style.css");
		var _this = this;
		
		// Add a div with unique ID
		var divName = _this.Layout.ObjectId.replace("\\", "_");
		if(_this.Element.children.length == 0) {//if this div doesn't already exist, create a unique div with the divName
			var ui = document.createElement("div");
			ui.setAttribute("id", divName);
			_this.Element.appendChild(ui);
		} else {
			//if it does exist, empty the div so we can fill it again
			$("#" + divName).empty();
		}
		
		// Maximum Node Size
		var min_size = parseFloat(_this.Layout.Text0.text.toString());
		// Maximum Node Size
		var max_size = parseFloat(_this.Layout.Text1.text.toString());
		// create a variable to put the html into
		var html = "";
		// set a variable to the dataset
		var td = _this.Data;
		// initialize an array of links
		var llinks= [];
		//loop through the data set and populate the link array
		for(var rowIx = 0; rowIx < td.Rows.length; rowIx++) {
			//set the current row to a variable
			var row = td.Rows[rowIx];
			// Build data array
			var currNodeA = row[0].text;
			var currNodeB = row[1].text;
			var nodeAsize = row[2].text;
			var nodeBsize = row[3].text;
			var nodeBcolor = row[4].text;
			llinks.push({ 
				source: currNodeA,
				target: currNodeB,
				source_size: nodeAsize,
				target_size: nodeBsize,
				target_color: nodeBcolor
			});
			
		}
		
		// Initialize list of nodes
		var lnodes = {};
		// Compute the distinct target nodes from the links. Compute these first so that color properties are assigned based on target status before source status.
		llinks.forEach(function(i) {
		  i.target = lnodes[i.target] || (lnodes[i.target] = {name: i.target, size: i.target_size, color: i.target_color});
		});
		// Iterate through the list again and define any left over source nodes that don't have a target status.
		llinks.forEach(function(i) {
		  i.source = lnodes[i.source] || (lnodes[i.source] = {name: i.source, size: i.source_size});
		});
		
		// Chart setup
		var width = _this.GetWidth();
		var height = _this.GetHeight();
		var margin = {"top":0, "right":0};
		
		// Define the force
		 var force = d3.layout.force()
		    .charge(-1000)
		    .linkDistance(100)
		    .size([width-margin.right,height-margin.top]);
		
		// Dragging behavior
		var node_drag = d3.behavior.drag()
		        .on("drag", dragmove);

		var dragmove = function() {
		    link.attr("d", linkArc);
			node.attr("transform", transform);
			text.attr("transform", transform);
		};
		
		// Number of iterations for the force algorithm to run. When set to auto, this will run for many iterations that lasts several seconds.
		// 100 iterations is enough to get a decent network drawing very quickly. Up this number to create a better distribution of nodes.
		var n = 100;
		
		// Apply the force
		force
		    .nodes(d3.values(lnodes))
		    .links(llinks)
		    .size([width, height]);
		
		// Use the force
	    force.start();
		for (var i = n * n; i > 0; --i) force.tick();
		force.stop();
		
		// Append div to div (why??)
		var chart_div = d3.select("#" + divName).append("div");
		// Append svg for chart window
		var chart = chart_div.append("svg")
		    .style("height",height + "px")
		    .style("width",width + "px");
		
		// Draw the arrow heads
		chart.append("defs").append("marker")
		    .attr("id", function() { return "marker-head"; })
		    .attr("viewBox", "0 -5 10 10")
		    .attr("refX", 10)
		    .attr("refY", 0)
		    .attr("markerWidth", 6)
		    .attr("markerHeight", 6)
		    .attr("orient", "auto")
		  	.append("path")
		    .attr("d", "M0,-5L10,0L0,5")
		    .style("fill","rgb(100,100,100)");
		
		// Draw the arrow paths between nodes
		var link = chart.selectAll(".link")
		    .data(llinks)
		    .enter().append("path")
		    .attr("class","link")
		    .style("stroke-width",1.5)
		    .style("stroke","rgb(100,100,100)")
		    .style("fill","none");
		
		// Draw the nodes
		var node = chart.selectAll(".node")
		    .data(force.nodes())
		    .enter().append("circle")
		    .attr("class","node")
		    .attr("r",function(d) {return 7+2*d.size;})
		    .style("fill",function(d){return d.color || "rgb(230,230,230)";})
		    .style("stroke","rgb(150,150,150)")
		    .call(force.drag);
		
		// Draw node hover text
		node.append("title")
		      .text(function(d) { return d.name; });
		
		// Draw node display names
		var text = chart.append("g").selectAll("text")
		    .data(force.nodes())
		  	.enter().append("text")
		    .attr("x", function(d) {return 10+2*d.size;})
		    .attr("y", ".31em")
		    .style("font","10px sans-serif")
		    .style("pointer-events", "none")
		    .style("text-shadow","0 1px 0 #fff, 1px 0 0 #fff, 0 -1px 0 #fff, -1px 0 0 #fff")
		    .text(function(d) { return d.name; });
		    
		// Calculate arc paths
		function linkArc(d) {
		  var dx = d.target.x - d.source.x,
		      dy = d.target.y - d.source.y,
		      target_radius=7+2*d.target.size;
		      dr = Math.sqrt(dx * dx + dy * dy);
		      offsetX = (dx * target_radius) / dr;
              offsetY = (dy * target_radius) / dr;
		  return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + (d.target.x-offsetX) + "," + (d.target.y-offsetY);
		}
		
		// Initial placement of nodes, links, and text
		link.attr("d", linkArc);
		node.attr("transform", transform);
		text.attr("transform", transform);
		link.attr("marker-end","url(#marker-head)");
		
		// Movement function
		function transform(d) {
		  return "translate(" + d.x + "," + d.y + ")";
		}
	});
}
//Initiate extension
extension_Init();

