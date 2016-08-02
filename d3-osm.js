// A d3 plugin modified by a leaflet plugin.
//Author:kucin
//time:2016-07-30
(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.d3 = global.d3 || {})));
}(this, function(exports) {
  'use strict';

  function Osm(xml) {
    if (!(xml != undefined)) throw new Error;
    this._xml = xml;
    this._projection ;
    this._options = {
      areaTags: ['area', 'building', 'leisure', 'tourism', 'ruins', 'historic', 'landuse', 'military', 'natural', 'sport'],
      uninterestingTags: ['source', 'source_ref', 'source:ref', 'history', 'attribution', 'created_by', 'tiger:county', 'tiger:tlid', 'tiger:upload_uuid'],
      styles: {
        node: "fill:black;fill-opacity:.5;stroke:blue;stroke-opacity:.7;stroke-width:2;",
        way: "opacity:.7;stroke:blue;stroke-width:2;fill:none",
        area: "fill:yellow;fill-opacity:.5;stroke:blue;stroke-opacity:.7;stroke-width:2;",
        changeset: ""
      }
    };
    this._g;
    this._nodes;
    this._ways;
    this._areas;
  }

  Osm.prototype = osm.prototype = {
    constructor: Osm,
    addTo: function(g) {
      this._g = g.append("g");
      if (this._xml) {
        draw(this, this._g);
      }
      return this;
    },
    options: function(options) {
      Object.assign(this._options, options);
      return this;
    },
    styles: function(styles) {
      Object.assign(this._options.styles, styles);
      return this;
    },
    projection: function(projection) {
      this._projection = projection;
      return this;
    },
    zoom: function(scale,trans) {
      this._projection.scale(scale * 50000);
      this._projection.translate(trans);
      this.update(this);
    },
    update: function(_osm) {
      this._nodes.attr("transform", function(d, i) {
          var coor = _osm._projection(d.latLng);
          return "translate(" + coor[0] + ", " + coor[1] + ")";
        });
      this._ways.attr("points", function(d, i) {
          var latLngs = new Array(d.nodes.length);
          for (var j = 0; j < d.nodes.length; j++) {
            latLngs[j] = _osm._projection(d.nodes[j].latLng);
          }
          return latLngs.toString();
        });
      this._areas.attr("points", function(d, i) {
          var latLngs = new Array(d.nodes.length);
          for (var j = 0; j < d.nodes.length; j++) {
            latLngs[j] = _osm._projection(d.nodes[j].latLng);
          }
          return latLngs.toString();
        });
    },
    isWayArea: function(way) {
      if (way.nodes[0] != way.nodes[way.nodes.length - 1]) {
        return false;
      }

      for (var key in way.tags) {
        if (this._options.areaTags.indexOf(key) >= 0) {
          return true;
        }
      }

      return false;
    },

    interestingNode: function(node, ways, relations) {
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
    getChangesets: function(xml) {
      var result = [];

      var nodes = xml.getElementsByTagName("changeset");
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i],
          id = node.getAttribute("id");
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

    getNodes: function(xml) {
      var result = {};

      var nodes = xml.getElementsByTagName("node");
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i],
          id = node.getAttribute("id");
        result[id] = {
          id: id,
          type: "node",
          latLng: [node.getAttribute("lon"), node.getAttribute("lat")],
          tags: this.getTags(node)
        };
      }

      return result;
    },

    getWays: function(xml, nodes) {
      var result = [];

      var ways = xml.getElementsByTagName("way");
      for (var i = 0; i < ways.length; i++) {
        var way = ways[i],
          nds = way.getElementsByTagName("nd");

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

    getRelations: function(xml, nodes, ways) {
      var result = [];

      var rels = xml.getElementsByTagName("relation");
      for (var i = 0; i < rels.length; i++) {
        var rel = rels[i],
          members = rel.getElementsByTagName("member");

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

    getTags: function(xml) {
      var result = {};

      var tags = xml.getElementsByTagName("tag");
      for (var j = 0; j < tags.length; j++) {
        result[tags[j].getAttribute("k")] = tags[j].getAttribute("v");
      }

      return result;
    },
    getWayLayers: function(xml) {
      var xml = xml || this._xml;
      var result = [];
      result[0] = 0;
      result["area"] = 0;
      var ways = xml.getElementsByTagName("way");
      for (var i = 0; i < ways.length; i++) {
        var way = ways[i];
        var tags = this.getTags(way);
        for (var key in tags) {
          if (this._options.areaTags.indexOf(key) >= 0) {
            result["area"]++;
            result[0]--;
            break;
          }
          if (key == "layer") {
            /*      result['"'+tags[key]+'"'] = result['"'+tags[key]+'"'] || 0;
                  result['"'+tags[key]+'"']++;
                  result["0"]--;*/
            result[tags[key]] = result[tags[key]] || 0;
            result[tags[key]]++;
            result[0]--;
            break;
          }
        }
        result[0]++;
      }
      return result;
    }
  };

  function draw(_osm, g) {

    var features = buildFeatures(_osm);
    _osm._nodes = g.selectAll("point")
      .data(features.nodes)
      .enter()
      .append("circle")
      .attr("r", .5)
      .attr("style", _osm._options.styles.node)
      .attr("transform", function(d, i) {
        var coor = _osm._projection(d.latLng);
        return "translate(" + coor[0] + ", " + coor[1] + ")";
      });
    _osm._ways = g.selectAll("way")
      .data(features.ways)
      .enter()
      .append("polyline")
      .attr("style", _osm._options.styles.way)
      .attr("points", function(d, i) {
        var latLngs = new Array(d.nodes.length);
        for (var j = 0; j < d.nodes.length; j++) {
          latLngs[j] = _osm._projection(d.nodes[j].latLng);
        }
        return latLngs.toString();
      });
    _osm._areas = g.selectAll("area")
      .data(features.areas)
      .enter()
      .append("polygon")
      .attr("style", _osm._options.styles.area)
      .attr("points", function(d, i) {
        var latLngs = new Array(d.nodes.length);
        for (var j = 0; j < d.nodes.length; j++) {
          latLngs[j] = _osm._projection(d.nodes[j].latLng);
        }
        return latLngs.toString();
      });
  }

  function buildFeatures(_osm) {
    var xml = _osm._xml;
    var changesets = _osm.getChangesets(xml),
      nodes  = _osm.getNodes(xml),
      ways  = _osm.getWays(xml, nodes),
      relations  = _osm.getRelations(xml, nodes, ways);
    var features = {
      changesets: 　changesets,
      nodes　: [],
      ways: [],
      areas: []
    }
    for (var node_id in nodes) {
      var node = nodes[node_id];
      if (_osm.interestingNode(node, ways, relations)) {
        features.nodes.push(node);
      }
    }
    for (var i = 0; i < ways.length; i++) {
      var way = ways[i];
      if (_osm.isWayArea(way)) {
        features.areas.push(way);
      } else {
        features.ways.push(way);
      }
    }
    return features;
  }

  function osm(xml) {
    return new Osm(arguments.length ? xml : null);
  }

  exports.osm = osm;

  Object.defineProperty(exports, '__esModule', {
    value: true
  });

}));