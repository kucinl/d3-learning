// A d3 plugin modified by a leaflet plugin.
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.d3 = global.d3 || {})));
}(this, function (exports) { 'use strict';

  var slice = [].slice;

  var noabort = {};

  function Osm(xml) {
    if (!(xml != undefined)) throw new Error;
    this._xml = xml;
    this._projection = d3.geo.mercator().center([120.64653,27.99529])
                            .scale(150000)
                            .translate([width / 2, height / 2]);
    this._options = {
      areaTags: ['area', 'building', 'leisure', 'tourism', 'ruins', 'historic', 'landuse', 'military', 'natural', 'sport'],
      uninterestingTags: ['source', 'source_ref', 'source:ref', 'history', 'attribution', 'created_by', 'tiger:county', 'tiger:tlid', 'tiger:upload_uuid'],
      styles: {
        node:"fill:black;fill-opacity:.2;stroke:blue;stroke-opacity:.5;stroke-width:.05;",
        way:"opacity:.7;stroke:blue;stroke-width:.1;fill:none",
        area:"fill:yellow;fill-opacity:.2;stroke:blue;stroke-opacity:.5;stroke-width:.05;",
        changeset:""
      }
    };
 //   this._options = null;
  }

  Osm.prototype = osm.prototype = {
    constructor: Osm,
    addTo: function(g) {
      this._g = g;
      if (this._xml) {
        draw(this,g);
      }
      return this;
    },
    options: function(options) {
      Object.assign(this._options,options);
      return this;
    },
    styles: function(styles) {
      Object.assign(this._options.styles,styles);
      return this;
    },
    projection: function(projection) {
     this._projection = projection;
     return this;
    },
    scale: function(scale) {
     this._projection.scale(scale);
     return this;
    },
    zoom: function (scale) {
      this._projection.scale(scale*this._projection.scale());
      this._g.selectAll('circle').remove();
      this._g.selectAll('polygon').remove();
      this._g.selectAll('polyline').remove();
      this.addTo(this._g);
    },
    isWayArea: function (way) {
      if (way.nodes[0] != way.nodes[way.nodes.length - 1]) {
        return false;
      }

      for (var key in way.tags) {
        if (this._options.areaTags.indexOf(key)>=0) {
          console.log(key)
          return true;
        }
      }

      return false;
    },

    interestingNode: function (node, ways, relations) {
      var used = false;

      for (var i = 0; i < ways.length; i++) {
        if (ways[i].nodes.indexOf(node) >= 0) {
          used = true;
          break;
        }
      }

      if (!used) {
        return true;
      }

      for (var i = 0; i < relations.length; i++) {
        if (relations[i].members.indexOf(node) >= 0)
          return true;
      }

      for (var key in node.tags) {
        if (this._options.uninterestingTags.indexOf(key) < 0) {
          return true;
        }
      }

      return false;
    },
    getChangesets: function (xml) {
      var result = [];

      var nodes = xml.getElementsByTagName("changeset");
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i], id = node.getAttribute("id");
        result.push({
          id: id,
          type: "changeset",
        /*  latLngBounds: L.latLngBounds(
            [node.getAttribute("min_lat"), node.getAttribute("min_lon")],
            [node.getAttribute("max_lat"), node.getAttribute("max_lon")]),*/
          tags: this.getTags(node)
        });
      }

      return result;
    },

    getNodes: function (xml) {
      var result = {};

      var nodes = xml.getElementsByTagName("node");
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i], id = node.getAttribute("id");
        result[id] = {
          id: id,
          type: "node",
          latLng:this._projection([node.getAttribute("lon"),node.getAttribute("lat")]),     
          tags: this.getTags(node)
        };
      }

      return result;
    },

    getWays: function (xml, nodes) {
      var result = [];

      var ways = xml.getElementsByTagName("way");
      for (var i = 0; i < ways.length; i++) {
        var way = ways[i], nds = way.getElementsByTagName("nd");

        var way_object = {
          id: way.getAttribute("id"),
          type: "way",
          nodes: new Array(nds.length),
          tags: this.getTags(way)
        };

        for (var j = 0; j < nds.length; j++) {
          way_object.nodes[j] = nodes[nds[j].getAttribute("ref")];
        }

        result.push(way_object);
      }

      return result;
    },

    getRelations: function (xml, nodes, ways) {
      var result = [];

      var rels = xml.getElementsByTagName("relation");
      for (var i = 0; i < rels.length; i++) {
        var rel = rels[i], members = rel.getElementsByTagName("member");

        var rel_object = {
          id: rel.getAttribute("id"),
          type: "relation",
          members: new Array(members.length),
          tags: this.getTags(rel)
        };

        for (var j = 0; j < members.length; j++) {
          if (members[j].getAttribute("type") === "node")
            rel_object.members[j] = nodes[members[j].getAttribute("ref")];
          else // relation-way and relation-relation membership not implemented
            rel_object.members[j] = null;
        }

        result.push(rel_object);
      }

      return result;
    },

    getTags: function (xml) {
      var result = {};

      var tags = xml.getElementsByTagName("tag");
      for (var j = 0; j < tags.length; j++) {
        result[tags[j].getAttribute("k")] = tags[j].getAttribute("v");
      }

      return result;
    }
    };
function draw(_osm,g) {
      
        var features = buildFeatures(_osm);
    
      for (var i = 0; i < features.length; i++) {
        var feature = features[i], layer;

        if (feature.type === "changeset") {
      //   console.log("layer = L.rectangle(feature.latLngBounds, this._options.styles.changeset);") 
        } else if (feature.type === "node") {
      //    console.log("layer = L.circleMarker(feature.latLng, this._options.styles.node);")
          g.append("circle")
            .attr("r", .5)
            .attr("style",_osm._options.styles.node) 
            .attr("transform", function(){
                var coor = feature.latLng;
                return "translate("+coor[0]+", "+coor[1]+")";
            });
        } else {
          var latLngs = new Array(feature.nodes.length);

          for (var j = 0; j < feature.nodes.length; j++) {
            latLngs[j] = feature.nodes[j].latLng;
          }
          var points = latLngs.toString();
          if (_osm.isWayArea(feature)) {
            latLngs.pop(); // Remove last == first.
            g.append("polygon")
            .attr("points", points)
            .attr("style",_osm._options.styles.area)         
          } else {
             g.append("polyline")
            .attr("points", points)
            .attr("style",_osm._options.styles.way) 
          }
        }

     //   layer.addTo(this);
     //   layer.feature = feature;
      }
    }
function buildFeatures(_osm) {
  var xml = _osm._xml;
      var features = _osm.getChangesets(xml),
        nodes = _osm.getNodes(xml),
        ways = _osm.getWays(xml, nodes),
        relations = _osm.getRelations(xml, nodes, ways);

      for (var node_id in nodes) {
        var node = nodes[node_id];
        if (_osm.interestingNode(node, ways, relations)) {
          features.push(node);
        }
      }

      for (var i = 0; i < ways.length; i++) {
        var way = ways[i];
        features.push(way);
      }
      return features;
    }
    
  function osm(xml) {
    return new Osm(xml);
  }

  exports.osm = osm;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
