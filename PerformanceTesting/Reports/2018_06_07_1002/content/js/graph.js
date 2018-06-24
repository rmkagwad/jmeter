/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
$(document).ready(function() {

    $(".click-title").mouseenter( function(    e){
        e.preventDefault();
        this.style.cursor="pointer";
    });
    $(".click-title").mousedown( function(event){
        event.preventDefault();
    });

    // Ugly code while this script is shared among several pages
    try{
        refreshHitsPerSecond(true);
    } catch(e){}
    try{
        refreshResponseTimeOverTime(true);
    } catch(e){}
    try{
        refreshResponseTimePercentiles();
    } catch(e){}
    $(".portlet-header").css("cursor", "auto");
});

var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

// Fixes time stamps
function fixTimeStamps(series, offset){
    $.each(series, function(index, item) {
        $.each(item.data, function(index, coord) {
            coord[0] += offset;
        });
    });
}

// Check if the specified jquery object is a graph
function isGraph(object){
    return object.data('plot') !== undefined;
}

/**
 * Export graph to a PNG
 */
function exportToPNG(graphName, target) {
    var plot = $("#"+graphName).data('plot');
    var flotCanvas = plot.getCanvas();
    var image = flotCanvas.toDataURL();
    image = image.replace("image/png", "image/octet-stream");
    
    var downloadAttrSupported = ("download" in document.createElement("a"));
    if(downloadAttrSupported === true) {
        target.download = graphName + ".png";
        target.href = image;
    }
    else {
        document.location.href = image;
    }
    
}

// Override the specified graph options to fit the requirements of an overview
function prepareOverviewOptions(graphOptions){
    var overviewOptions = {
        series: {
            shadowSize: 0,
            lines: {
                lineWidth: 1
            },
            points: {
                // Show points on overview only when linked graph does not show
                // lines
                show: getProperty('series.lines.show', graphOptions) == false,
                radius : 1
            }
        },
        xaxis: {
            ticks: 2,
            axisLabel: null
        },
        yaxis: {
            ticks: 2,
            axisLabel: null
        },
        legend: {
            show: false,
            container: null
        },
        grid: {
            hoverable: false
        },
        tooltip: false
    };
    return $.extend(true, {}, graphOptions, overviewOptions);
}

// Force axes boundaries using graph extra options
function prepareOptions(options, data) {
    options.canvas = true;
    var extraOptions = data.extraOptions;
    if(extraOptions !== undefined){
        var xOffset = options.xaxis.mode === "time" ? 19800000 : 0;
        var yOffset = options.yaxis.mode === "time" ? 19800000 : 0;

        if(!isNaN(extraOptions.minX))
        	options.xaxis.min = parseFloat(extraOptions.minX) + xOffset;
        
        if(!isNaN(extraOptions.maxX))
        	options.xaxis.max = parseFloat(extraOptions.maxX) + xOffset;
        
        if(!isNaN(extraOptions.minY))
        	options.yaxis.min = parseFloat(extraOptions.minY) + yOffset;
        
        if(!isNaN(extraOptions.maxY))
        	options.yaxis.max = parseFloat(extraOptions.maxY) + yOffset;
    }
}

// Filter, mark series and sort data
/**
 * @param data
 * @param noMatchColor if defined and true, series.color are not matched with index
 */
function prepareSeries(data, noMatchColor){
    var result = data.result;

    // Keep only series when needed
    if(seriesFilter && (!filtersOnlySampleSeries || result.supportsControllersDiscrimination)){
        // Insensitive case matching
        var regexp = new RegExp(seriesFilter, 'i');
        result.series = $.grep(result.series, function(series, index){
            return regexp.test(series.label);
        });
    }

    // Keep only controllers series when supported and needed
    if(result.supportsControllersDiscrimination && showControllersOnly){
        result.series = $.grep(result.series, function(series, index){
            return series.isController;
        });
    }

    // Sort data and mark series
    $.each(result.series, function(index, series) {
        series.data.sort(compareByXCoordinate);
        if(!(noMatchColor && noMatchColor===true)) {
	        series.color = index;
	    }
    });
}

// Set the zoom on the specified plot object
function zoomPlot(plot, xmin, xmax, ymin, ymax){
    var axes = plot.getAxes();
    // Override axes min and max options
    $.extend(true, axes, {
        xaxis: {
            options : { min: xmin, max: xmax }
        },
        yaxis: {
            options : { min: ymin, max: ymax }
        }
    });

    // Redraw the plot
    plot.setupGrid();
    plot.draw();
}

// Prepares DOM items to add zoom function on the specified graph
function setGraphZoomable(graphSelector, overviewSelector){
    var graph = $(graphSelector);
    var overview = $(overviewSelector);

    // Ignore mouse down event
    graph.bind("mousedown", function() { return false; });
    overview.bind("mousedown", function() { return false; });

    // Zoom on selection
    graph.bind("plotselected", function (event, ranges) {
        // clamp the zooming to prevent infinite zoom
        if (ranges.xaxis.to - ranges.xaxis.from < 0.00001) {
            ranges.xaxis.to = ranges.xaxis.from + 0.00001;
        }
        if (ranges.yaxis.to - ranges.yaxis.from < 0.00001) {
            ranges.yaxis.to = ranges.yaxis.from + 0.00001;
        }

        // Do the zooming
        var plot = graph.data('plot');
        zoomPlot(plot, ranges.xaxis.from, ranges.xaxis.to, ranges.yaxis.from, ranges.yaxis.to);
        plot.clearSelection();

        // Synchronize overview selection
        overview.data('plot').setSelection(ranges, true);
    });

    // Zoom linked graph on overview selection
    overview.bind("plotselected", function (event, ranges) {
        graph.data('plot').setSelection(ranges);
    });

    // Reset linked graph zoom when reseting overview selection
    overview.bind("plotunselected", function () {
        var overviewAxes = overview.data('plot').getAxes();
        zoomPlot(graph.data('plot'), overviewAxes.xaxis.min, overviewAxes.xaxis.max, overviewAxes.yaxis.min, overviewAxes.yaxis.max);
    });
}

var responseTimePercentilesInfos = {
        getOptions: function() {
            return {
                series: {
                    points: { show: false }
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimePercentiles'
                },
                xaxis: {
                    tickDecimals: 1,
                    axisLabel: "Percentiles",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Percentile value in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : %x.2 percentile was %y ms"
                },
                selection: { mode: "xy" },
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimePercentiles"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimesPercentiles"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimesPercentiles"), dataset, prepareOverviewOptions(options));
        }
};

// Response times percentiles
function refreshResponseTimePercentiles() {
    var infos = responseTimePercentilesInfos;
    prepareSeries(infos.data);
    if (isGraph($("#flotResponseTimesPercentiles"))){
        infos.createGraph();
    } else {
        var choiceContainer = $("#choicesResponseTimePercentiles");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimesPercentiles", "#overviewResponseTimesPercentiles");
        $('#bodyResponseTimePercentiles .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var responseTimeDistributionInfos = {
        data: {"result": {"minY": 1.0, "minX": 0.0, "maxY": 10.0, "series": [{"data": [[500.0, 10.0]], "isOverall": false, "label": "84 /include/javascript/calendar.js", "isController": false}, {"data": [[1500.0, 10.0]], "isOverall": false, "label": "143 /modules/Meetings/jsclass_scheduler.js", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "133 /custom/themes/SuiteR/images/end_off.gif", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "115 /include/SugarFields/Fields/Datetimecombo/Datetimecombo.js", "isController": false}, {"data": [[30500.0, 10.0]], "isOverall": false, "label": "81 /cache/include/javascript/sugar_grp1_jquery.js", "isController": false}, {"data": [[14000.0, 10.0]], "isOverall": false, "label": "112 /include/SugarCharts/Jit/js/Jit/jit.js", "isController": false}, {"data": [[1000.0, 10.0]], "isOverall": false, "label": "100 /custom/include/images/20reasons_md.png", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "137 /custom/themes/SuiteR/images/calendar_previous.png", "isController": false}, {"data": [[6500.0, 9.0], [7000.0, 1.0]], "isOverall": false, "label": "123 /modules/Calendar/fullcalendar/lang-all.js", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "146 /custom/themes/SuiteR/images/backtotop.gif", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "140 /custom/themes/SuiteR/images/end.gif", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "217 /include/social/facebook/facebook.js", "isController": false}, {"data": [[13000.0, 10.0]], "isOverall": false, "label": "94 /cache/themes/SuiteR/css/style.css", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "139 /custom/themes/SuiteR/images/calendar_next.png", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "208 /emailMobileExistLead.php", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "149 /vcal_server.php", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "213 /custom/modules/Leads/js/Inspection.js", "isController": false}, {"data": [[2000.0, 10.0]], "isOverall": false, "label": "120 /include/javascript/qtip/jquery.qtip.min.js", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "127 /themes/SuiteR/css/dashboardstyle.css", "isController": false}, {"data": [[26000.0, 10.0]], "isOverall": false, "label": "182 /cache/include/javascript/sugar_grp1_yui.js", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "111 /include/javascript/dashlets.js", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "126 /include/MySugar/javascript/retrievePage.js", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "216 /include/social/facebook/facebook_subpanel.js", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "171 /MasterData/getHAServicePincodelist.php", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "157 /include/SugarFields/Fields/File/SugarFieldFile.js", "isController": false}, {"data": [[8500.0, 10.0]], "isOverall": false, "label": "210 /index.php", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "130 /custom/themes/SuiteR/images/previous_off.gif", "isController": false}, {"data": [[1000.0, 9.0], [2000.0, 1.0]], "isOverall": false, "label": "189 /cache/themes/SuiteR/css/deprecated.css", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "93 /modules/Users/login.js", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "155 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "80 /themes/SuiteR/css/footable.core.css", "isController": false}, {"data": [[2500.0, 1.0], [2000.0, 9.0]], "isOverall": false, "label": "221 /cache/include/javascript/sugar_grp_jsolait.js", "isController": false}, {"data": [[1500.0, 10.0]], "isOverall": false, "label": "95 /include/javascript/jquery/themes/base/jquery-ui.min.css", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "92 /modules/Users/login.css", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "166 /custom/themes/SuiteR/images/id-ff-clear.png", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "175 /getPromoPlans.php", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "89 /cache/themes/SuiteR/css/deprecated.css", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "104 /custom/themes/SuiteR/images/sugar_icon.ico", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "177 /include/javascript/yui/build/assets/skins/sam/sprite.png", "isController": false}, {"data": [[1500.0, 2.0], [1000.0, 8.0]], "isOverall": false, "label": "198 /include/javascript/jquery/themes/base/jquery-ui.theme.min.css", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "129 /custom/themes/SuiteR/images/blank.gif", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "158 /include/SugarFields/Fields/Datetimecombo/Datetimecombo.js", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "88 /include/javascript/jquery/themes/base/jquery.ui.all.css", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "194 /modules/Users/login.css", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "114 /include/SugarCharts/Jit/js/mySugarCharts.js", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "101 /custom/themes/SuiteR/images/advanced_search.gif", "isController": false}, {"data": [[2500.0, 9.0], [3500.0, 1.0]], "isOverall": false, "label": "78 /index.php", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "116 /include/javascript/jsclass_base.js", "isController": false}, {"data": [[8500.0, 7.0], [9000.0, 3.0]], "isOverall": false, "label": "178 /index.php", "isController": false}, {"data": [[9000.0, 10.0]], "isOverall": false, "label": "83 /cache/include/javascript/sugar_grp1.js", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "144 /custom/themes/SuiteR/images/edit_inline.png", "isController": false}, {"data": [[1500.0, 10.0]], "isOverall": false, "label": "91 /themes/SuiteR/js/jscolor.js", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "170 /getCategoryServices.php", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "148 /index.php", "isController": false}, {"data": [[0.0, 4.0], [21000.0, 1.0], [24000.0, 1.0], [500.0, 4.0]], "isOverall": false, "label": "76 /success.txt", "isController": false}, {"data": [[0.0, 9.0], [500.0, 1.0]], "isOverall": false, "label": "201 /index.php", "isController": false}, {"data": [[13000.0, 10.0]], "isOverall": false, "label": "190 /cache/themes/SuiteR/css/style.css", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "138 /index.php", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "191 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "103 /custom/themes/SuiteR/images/sugar_icon.ico", "isController": false}, {"data": [[1500.0, 1.0], [1000.0, 9.0]], "isOverall": false, "label": "96 /cache/include/javascript/sugar_field_grp.js", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "163 /custom/themes/SuiteR/images/jscalendar.gif", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "176 /promotions.php", "isController": false}, {"data": [[1000.0, 10.0]], "isOverall": false, "label": "98 /include/javascript/jquery/themes/base/jquery-ui.theme.min.css", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "167 /custom/themes/SuiteR/images/id-ff-select.png", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "145 /custom/themes/SuiteR/images/print.gif", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "119 /modules/Calendar/fullcalendar/fullcalendar.print.css", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "162 /custom/themes/SuiteR/images/basic_search.gif", "isController": false}, {"data": [[1500.0, 4.0], [1000.0, 6.0]], "isOverall": false, "label": "199 /custom/include/images/20reasons_md.png", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "90 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "128 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "168 /MasterData/product_category_list.json", "isController": false}, {"data": [[500.0, 9.0], [1000.0, 1.0]], "isOverall": false, "label": "188 /include/javascript/jquery/themes/base/jquery.ui.all.css", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "207 /emailMobileExistLead.php", "isController": false}, {"data": [[1000.0, 2.0], [500.0, 8.0]], "isOverall": false, "label": "86 /include/javascript/qtip/jquery.qtip.min.css", "isController": false}, {"data": [[6000.0, 10.0]], "isOverall": false, "label": "122 /modules/Calendar/fullcalendar/fullcalendar.min.js", "isController": false}, {"data": [[1000.0, 10.0]], "isOverall": false, "label": "113 /include/SugarCharts/Jit/js/sugarCharts.js", "isController": false}, {"data": [[10000.0, 10.0]], "isOverall": false, "label": "156 /custom/modules/Leads/LeadValidations.js", "isController": false}, {"data": [[30500.0, 9.0], [31000.0, 1.0]], "isOverall": false, "label": "181 /cache/include/javascript/sugar_grp1_jquery.js", "isController": false}, {"data": [[1500.0, 10.0]], "isOverall": false, "label": "85 /cache/themes/SuiteR/js/style.js", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "218 /include/social/twitter/twitter_feed.js", "isController": false}, {"data": [[8500.0, 9.0], [8000.0, 1.0]], "isOverall": false, "label": "106 /index.php", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "117 /include/javascript/jsclass_async.js", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "164 /custom/themes/20reasons/images/jscalendar.gif", "isController": false}, {"data": [[14500.0, 10.0]], "isOverall": false, "label": "160 /cache/include/javascript/sugar_grp_yui_widgets.js", "isController": false}, {"data": [[1000.0, 10.0]], "isOverall": false, "label": "193 /cache/include/javascript/sugar_field_grp.js", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "222 /include/SubPanel/SubPanel.js", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "131 /custom/themes/SuiteR/images/start_off.gif", "isController": false}, {"data": [[1500.0, 10.0]], "isOverall": false, "label": "186 /cache/themes/SuiteR/js/style.js", "isController": false}, {"data": [[1000.0, 10.0]], "isOverall": false, "label": "141 /include/MySugar/javascript/MySugar.js", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "165 /custom/themes/20reasons/images/jscalendar.gif", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "179 /themes/SuiteR/css/footable.core.css", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "211 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "172 /MasterData/pinCodeMasterData.php", "isController": false}, {"data": [[1500.0, 9.0], [2000.0, 1.0]], "isOverall": false, "label": "192 /themes/SuiteR/js/jscolor.js", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "212 /modules/Leads/Lead.js", "isController": false}, {"data": [[1000.0, 10.0]], "isOverall": false, "label": "197 /include/javascript/jquery/themes/base/jquery-ui.structure.min.css", "isController": false}, {"data": [[0.0, 2.0], [42000.0, 1.0], [28000.0, 1.0], [500.0, 6.0]], "isOverall": false, "label": "77 /success.txt", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "147 /custom/themes/SuiteR/images/next.gif", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "109 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1000.0, 10.0]], "isOverall": false, "label": "108 /cache/jsLanguage/Home/en_us.js", "isController": false}, {"data": [[1500.0, 10.0]], "isOverall": false, "label": "118 /modules/Calendar/fullcalendar/fullcalendar.css", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "159 /modules/Leads/Lead.js", "isController": false}, {"data": [[1500.0, 10.0]], "isOverall": false, "label": "196 /include/javascript/jquery/themes/base/jquery-ui.min.css", "isController": false}, {"data": [[11000.0, 10.0]], "isOverall": false, "label": "187 /cache/themes/SuiteR/css/yui.css", "isController": false}, {"data": [[2500.0, 1.0], [1000.0, 9.0]], "isOverall": false, "label": "202 /emailMobileExistLead.php", "isController": false}, {"data": [[1500.0, 10.0]], "isOverall": false, "label": "154 /cache/jsLanguage/Leads/en_us.js", "isController": false}, {"data": [[1500.0, 10.0]], "isOverall": false, "label": "214 /include/InlineEditing/inlineEditing.js", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "125 /include/MySugar/javascript/AddRemoveDashboardPages.js", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "134 /custom/themes/SuiteR/images/arrow.gif", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "174 /promotions.php", "isController": false}, {"data": [[7500.0, 2.0], [8000.0, 8.0]], "isOverall": false, "label": "107 /cache/jsLanguage/en_us.js", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "132 /custom/themes/SuiteR/images/next_off.gif", "isController": false}, {"data": [[1000.0, 10.0]], "isOverall": false, "label": "184 /include/javascript/calendar.js", "isController": false}, {"data": [[6000.0, 10.0]], "isOverall": false, "label": "173 /getPromoPlans.php", "isController": false}, {"data": [[500.0, 5.0], [1000.0, 5.0]], "isOverall": false, "label": "185 /include/javascript/qtip/jquery.qtip.min.css", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "150 /success.txt", "isController": false}, {"data": [[26000.0, 10.0]], "isOverall": false, "label": "82 /cache/include/javascript/sugar_grp1_yui.js", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "136 /custom/themes/SuiteR/images/arrow_down.gif", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "102 /index.php", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "161 /themes/default/images/create-record.gif", "isController": false}, {"data": [[6000.0, 10.0]], "isOverall": false, "label": "79 /themes/SuiteR/css/bootstrap.min.css", "isController": false}, {"data": [[14500.0, 10.0]], "isOverall": false, "label": "110 /cache/include/javascript/sugar_grp_yui_widgets.js", "isController": false}, {"data": [[1500.0, 10.0]], "isOverall": false, "label": "124 /modules/Calendar/Cal.js", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "99 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "219 /include/social/twitter/twitter.js", "isController": false}, {"data": [[2500.0, 1.0], [1000.0, 9.0]], "isOverall": false, "label": "204 /emailMobileExistLead.php", "isController": false}, {"data": [[9000.0, 10.0]], "isOverall": false, "label": "183 /cache/include/javascript/sugar_grp1.js", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "215 /modules/Favorites/favorites.js", "isController": false}, {"data": [[9000.0, 10.0]], "isOverall": false, "label": "105 /index.php", "isController": false}, {"data": [[1000.0, 10.0]], "isOverall": false, "label": "135 /themes/SuiteR/fonts/glyphicons-halflings-regular.woff2", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "200 /custom/themes/SuiteR/images/advanced_search.gif", "isController": false}, {"data": [[21500.0, 4.0], [20500.0, 3.0], [21000.0, 1.0], [22500.0, 1.0], [22000.0, 1.0]], "isOverall": false, "label": "209 /index.php", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "195 /modules/Users/login.js", "isController": false}, {"data": [[1000.0, 10.0]], "isOverall": false, "label": "205 /emailMobileExistLead.php", "isController": false}, {"data": [[1000.0, 10.0]], "isOverall": false, "label": "97 /include/javascript/jquery/themes/base/jquery-ui.structure.min.css", "isController": false}, {"data": [[3000.0, 10.0]], "isOverall": false, "label": "121 /modules/Calendar/fullcalendar/lib/moment.min.js", "isController": false}, {"data": [[18000.0, 9.0], [18500.0, 1.0]], "isOverall": false, "label": "153 /index.php", "isController": false}, {"data": [[6000.0, 10.0]], "isOverall": false, "label": "180 /themes/SuiteR/css/bootstrap.min.css", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "203 /custom/themes/default/images/checkLoader.gif", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "151 /index.php", "isController": false}, {"data": [[1500.0, 1.0], [1000.0, 9.0]], "isOverall": false, "label": "206 /emailMobileExistLead.php", "isController": false}, {"data": [[0.0, 10.0]], "isOverall": false, "label": "152 /index.php", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "169 /getCategoryProducts.php", "isController": false}, {"data": [[11000.0, 10.0]], "isOverall": false, "label": "87 /cache/themes/SuiteR/css/yui.css", "isController": false}, {"data": [[500.0, 10.0]], "isOverall": false, "label": "142 /index.php", "isController": false}, {"data": [[1500.0, 10.0]], "isOverall": false, "label": "220 /include/SubPanel/SubPanelTiles.js", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 500, "maxX": 42000.0, "title": "Response Time Distribution"}},
        getOptions: function() {
            var granularity = this.data.result.granularity;
            return {
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimeDistribution'
                },
                xaxis:{
                    axisLabel: "Response times in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of responses",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                bars : {
                    show: true,
                    barWidth: this.data.result.granularity
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: function(label, xval, yval, flotItem){
                        return yval + " responses for " + label + " were between " + xval + " and " + (xval + granularity) + " ms";
                    }
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimeDistribution"), prepareData(data.result.series, $("#choicesResponseTimeDistribution")), options);
        }

};

// Response time distribution
function refreshResponseTimeDistribution() {
    var infos = responseTimeDistributionInfos;
    prepareSeries(infos.data);
    if (isGraph($("#flotResponseTimeDistribution"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesResponseTimeDistribution");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        $('#footerResponseTimeDistribution .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var syntheticResponseTimeDistributionInfos = {
        data: {"result": {"minY": 1.0, "minX": 0.0, "ticks": [[0, "Requests having \nresponse time <= 500ms"], [1, "Requests having \nresponse time > 500ms and <= 1,500ms"], [2, "Requests having \nresponse time > 1,500ms"], [3, "Requests in error"]], "maxY": 690.0, "series": [{"data": [[1.0, 690.0]], "isOverall": false, "label": "Requests having \nresponse time > 500ms and <= 1,500ms", "isController": false}, {"data": [[3.0, 1.0]], "isOverall": false, "label": "Requests in error", "isController": false}, {"data": [[0.0, 345.0]], "isOverall": false, "label": "Requests having \nresponse time <= 500ms", "isController": false}, {"data": [[2.0, 434.0]], "isOverall": false, "label": "Requests having \nresponse time > 1,500ms", "isController": false}], "supportsControllersDiscrimination": false, "maxX": 3.0, "title": "Synthetic Response Times Distribution"}},
        getOptions: function() {
            return {
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendSyntheticResponseTimeDistribution'
                },
                xaxis:{
                    axisLabel: "Response times ranges",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                    tickLength:0,
                    min:-0.5,
                    max:3.5
                },
                yaxis: {
                    axisLabel: "Number of responses",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                bars : {
                    show: true,
                    align: "center",
                    barWidth: 0.25,
                    fill:.75
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: function(label, xval, yval, flotItem){
                        return yval + " " + label;
                    }
                },
                colors: ["#9ACD32", "yellow", "orange", "#FF6347"]                
            };
        },
        createGraph: function() {
            var data = this.data;
            var options = this.getOptions();
            prepareOptions(options, data);
            options.xaxis.ticks = data.result.ticks;
            $.plot($("#flotSyntheticResponseTimeDistribution"), prepareData(data.result.series, $("#choicesSyntheticResponseTimeDistribution")), options);
        }

};

// Response time distribution
function refreshSyntheticResponseTimeDistribution() {
    var infos = syntheticResponseTimeDistributionInfos;
    prepareSeries(infos.data, true);
    if (isGraph($("#flotSyntheticResponseTimeDistribution"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesSyntheticResponseTimeDistribution");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        $('#footerSyntheticResponseTimeDistribution .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var activeThreadsOverTimeInfos = {
        data: {"result": {"minY": 3.0714285714285716, "minX": 1.52834592E12, "maxY": 10.0, "series": [{"data": [[1.52834622E12, 10.0], [1.52834604E12, 10.0], [1.52834634E12, 10.0], [1.52834616E12, 10.0], [1.52834598E12, 9.750000000000002], [1.52834646E12, 6.174757281553399], [1.52834628E12, 10.0], [1.5283461E12, 10.0], [1.52834592E12, 3.0714285714285716], [1.5283464E12, 9.859649122807019]], "isOverall": false, "label": "Thread Group", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.52834646E12, "title": "Active Threads Over Time"}},
        getOptions: function() {
            return {
                series: {
                    stack: true,
                    lines: {
                        show: true,
                        fill: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of active threads",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 6,
                    show: true,
                    container: '#legendActiveThreadsOverTime'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                selection: {
                    mode: 'xy'
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : At %x there were %y active threads"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesActiveThreadsOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotActiveThreadsOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewActiveThreadsOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Active Threads Over Time
function refreshActiveThreadsOverTime(fixTimestamps) {
    var infos = activeThreadsOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 19800000);
    }
    if(isGraph($("#flotActiveThreadsOverTime"))) {
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesActiveThreadsOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotActiveThreadsOverTime", "#overviewActiveThreadsOverTime");
        $('#footerActiveThreadsOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var timeVsThreadsInfos = {
        data: {"result": {"minY": 392.7, "minX": 1.0, "maxY": 30932.1, "series": [{"data": [[4.0, 851.0], [9.0, 851.0], [10.0, 851.8571428571429], [3.0, 856.0]], "isOverall": false, "label": "84 /include/javascript/calendar.js", "isController": false}, {"data": [[8.6, 852.0999999999999]], "isOverall": false, "label": "84 /include/javascript/calendar.js-Aggregated", "isController": false}, {"data": [[10.0, 1944.6000000000001]], "isOverall": false, "label": "143 /modules/Meetings/jsclass_scheduler.js", "isController": false}, {"data": [[10.0, 1944.6000000000001]], "isOverall": false, "label": "143 /modules/Meetings/jsclass_scheduler.js-Aggregated", "isController": false}, {"data": [[10.0, 580.8]], "isOverall": false, "label": "133 /custom/themes/SuiteR/images/end_off.gif", "isController": false}, {"data": [[10.0, 580.8]], "isOverall": false, "label": "133 /custom/themes/SuiteR/images/end_off.gif-Aggregated", "isController": false}, {"data": [[10.0, 807.1]], "isOverall": false, "label": "115 /include/SugarFields/Fields/Datetimecombo/Datetimecombo.js", "isController": false}, {"data": [[10.0, 807.1]], "isOverall": false, "label": "115 /include/SugarFields/Fields/Datetimecombo/Datetimecombo.js-Aggregated", "isController": false}, {"data": [[10.0, 30888.9]], "isOverall": false, "label": "81 /cache/include/javascript/sugar_grp1_jquery.js", "isController": false}, {"data": [[10.0, 30888.9]], "isOverall": false, "label": "81 /cache/include/javascript/sugar_grp1_jquery.js-Aggregated", "isController": false}, {"data": [[10.0, 14225.699999999999]], "isOverall": false, "label": "112 /include/SugarCharts/Jit/js/Jit/jit.js", "isController": false}, {"data": [[10.0, 14225.699999999999]], "isOverall": false, "label": "112 /include/SugarCharts/Jit/js/Jit/jit.js-Aggregated", "isController": false}, {"data": [[10.0, 1364.6]], "isOverall": false, "label": "100 /custom/include/images/20reasons_md.png", "isController": false}, {"data": [[10.0, 1364.6]], "isOverall": false, "label": "100 /custom/include/images/20reasons_md.png-Aggregated", "isController": false}, {"data": [[10.0, 399.0]], "isOverall": false, "label": "137 /custom/themes/SuiteR/images/calendar_previous.png", "isController": false}, {"data": [[10.0, 399.0]], "isOverall": false, "label": "137 /custom/themes/SuiteR/images/calendar_previous.png-Aggregated", "isController": false}, {"data": [[10.0, 6988.900000000001]], "isOverall": false, "label": "123 /modules/Calendar/fullcalendar/lang-all.js", "isController": false}, {"data": [[10.0, 6988.900000000001]], "isOverall": false, "label": "123 /modules/Calendar/fullcalendar/lang-all.js-Aggregated", "isController": false}, {"data": [[10.0, 563.4]], "isOverall": false, "label": "146 /custom/themes/SuiteR/images/backtotop.gif", "isController": false}, {"data": [[10.0, 563.4]], "isOverall": false, "label": "146 /custom/themes/SuiteR/images/backtotop.gif-Aggregated", "isController": false}, {"data": [[10.0, 398.40000000000003]], "isOverall": false, "label": "140 /custom/themes/SuiteR/images/end.gif", "isController": false}, {"data": [[10.0, 398.40000000000003]], "isOverall": false, "label": "140 /custom/themes/SuiteR/images/end.gif-Aggregated", "isController": false}, {"data": [[8.0, 541.0], [1.0, 541.0], [10.0, 541.0], [6.0, 540.3333333333334], [7.0, 540.3333333333334]], "isOverall": false, "label": "217 /include/social/facebook/facebook.js", "isController": false}, {"data": [[6.800000000000001, 540.6]], "isOverall": false, "label": "217 /include/social/facebook/facebook.js-Aggregated", "isController": false}, {"data": [[10.0, 13363.2]], "isOverall": false, "label": "94 /cache/themes/SuiteR/css/style.css", "isController": false}, {"data": [[10.0, 13363.2]], "isOverall": false, "label": "94 /cache/themes/SuiteR/css/style.css-Aggregated", "isController": false}, {"data": [[10.0, 561.0]], "isOverall": false, "label": "139 /custom/themes/SuiteR/images/calendar_next.png", "isController": false}, {"data": [[10.0, 561.0]], "isOverall": false, "label": "139 /custom/themes/SuiteR/images/calendar_next.png-Aggregated", "isController": false}, {"data": [[8.0, 575.0], [10.0, 565.6666666666666]], "isOverall": false, "label": "208 /emailMobileExistLead.php", "isController": false}, {"data": [[9.8, 566.5999999999999]], "isOverall": false, "label": "208 /emailMobileExistLead.php-Aggregated", "isController": false}, {"data": [[10.0, 401.2]], "isOverall": false, "label": "149 /vcal_server.php", "isController": false}, {"data": [[10.0, 401.2]], "isOverall": false, "label": "149 /vcal_server.php-Aggregated", "isController": false}, {"data": [[8.0, 835.0], [1.0, 834.0], [10.0, 834.0], [6.0, 834.0], [7.0, 833.6666666666666]], "isOverall": false, "label": "213 /custom/modules/Leads/js/Inspection.js", "isController": false}, {"data": [[6.800000000000001, 834.0]], "isOverall": false, "label": "213 /custom/modules/Leads/js/Inspection.js-Aggregated", "isController": false}, {"data": [[10.0, 2333.2999999999997]], "isOverall": false, "label": "120 /include/javascript/qtip/jquery.qtip.min.js", "isController": false}, {"data": [[10.0, 2333.2999999999997]], "isOverall": false, "label": "120 /include/javascript/qtip/jquery.qtip.min.js-Aggregated", "isController": false}, {"data": [[10.0, 572.0]], "isOverall": false, "label": "127 /themes/SuiteR/css/dashboardstyle.css", "isController": false}, {"data": [[10.0, 572.0]], "isOverall": false, "label": "127 /themes/SuiteR/css/dashboardstyle.css-Aggregated", "isController": false}, {"data": [[10.0, 26245.2]], "isOverall": false, "label": "182 /cache/include/javascript/sugar_grp1_yui.js", "isController": false}, {"data": [[10.0, 26245.2]], "isOverall": false, "label": "182 /cache/include/javascript/sugar_grp1_yui.js-Aggregated", "isController": false}, {"data": [[10.0, 700.3]], "isOverall": false, "label": "111 /include/javascript/dashlets.js", "isController": false}, {"data": [[10.0, 700.3]], "isOverall": false, "label": "111 /include/javascript/dashlets.js-Aggregated", "isController": false}, {"data": [[10.0, 587.8000000000001]], "isOverall": false, "label": "126 /include/MySugar/javascript/retrievePage.js", "isController": false}, {"data": [[10.0, 587.8000000000001]], "isOverall": false, "label": "126 /include/MySugar/javascript/retrievePage.js-Aggregated", "isController": false}, {"data": [[8.0, 581.0], [4.0, 582.0], [10.0, 581.0], [7.0, 582.6]], "isOverall": false, "label": "216 /include/social/facebook/facebook_subpanel.js", "isController": false}, {"data": [[7.5, 581.8999999999999]], "isOverall": false, "label": "216 /include/social/facebook/facebook_subpanel.js-Aggregated", "isController": false}, {"data": [[10.0, 589.4]], "isOverall": false, "label": "171 /MasterData/getHAServicePincodelist.php", "isController": false}, {"data": [[10.0, 589.4]], "isOverall": false, "label": "171 /MasterData/getHAServicePincodelist.php-Aggregated", "isController": false}, {"data": [[10.0, 763.5]], "isOverall": false, "label": "157 /include/SugarFields/Fields/File/SugarFieldFile.js", "isController": false}, {"data": [[10.0, 763.5]], "isOverall": false, "label": "157 /include/SugarFields/Fields/File/SugarFieldFile.js-Aggregated", "isController": false}, {"data": [[8.0, 8525.5], [10.0, 8520.0], [5.0, 8518.0], [7.0, 8516.666666666666]], "isOverall": false, "label": "210 /index.php", "isController": false}, {"data": [[7.8, 8521.000000000002]], "isOverall": false, "label": "210 /index.php-Aggregated", "isController": false}, {"data": [[10.0, 552.0]], "isOverall": false, "label": "130 /custom/themes/SuiteR/images/previous_off.gif", "isController": false}, {"data": [[10.0, 552.0]], "isOverall": false, "label": "130 /custom/themes/SuiteR/images/previous_off.gif-Aggregated", "isController": false}, {"data": [[10.0, 1145.5]], "isOverall": false, "label": "189 /cache/themes/SuiteR/css/deprecated.css", "isController": false}, {"data": [[10.0, 1145.5]], "isOverall": false, "label": "189 /cache/themes/SuiteR/css/deprecated.css-Aggregated", "isController": false}, {"data": [[10.0, 605.9000000000001]], "isOverall": false, "label": "93 /modules/Users/login.js", "isController": false}, {"data": [[10.0, 605.9000000000001]], "isOverall": false, "label": "93 /modules/Users/login.js-Aggregated", "isController": false}, {"data": [[10.0, 403.4]], "isOverall": false, "label": "155 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[10.0, 403.4]], "isOverall": false, "label": "155 /themes/SuiteR/css/colourSelector.php-Aggregated", "isController": false}, {"data": [[4.0, 799.0], [9.0, 816.0], [10.0, 801.0], [3.0, 831.0]], "isOverall": false, "label": "80 /themes/SuiteR/css/footable.core.css", "isController": false}, {"data": [[8.6, 805.3]], "isOverall": false, "label": "80 /themes/SuiteR/css/footable.core.css-Aggregated", "isController": false}, {"data": [[8.0, 2463.0], [4.0, 2473.0], [1.0, 2485.0], [10.0, 2464.0], [6.0, 2485.5], [7.0, 2499.0]], "isOverall": false, "label": "221 /cache/include/javascript/sugar_grp_jsolait.js", "isController": false}, {"data": [[6.0, 2476.5]], "isOverall": false, "label": "221 /cache/include/javascript/sugar_grp_jsolait.js-Aggregated", "isController": false}, {"data": [[10.0, 1773.5000000000002]], "isOverall": false, "label": "95 /include/javascript/jquery/themes/base/jquery-ui.min.css", "isController": false}, {"data": [[10.0, 1773.5000000000002]], "isOverall": false, "label": "95 /include/javascript/jquery/themes/base/jquery-ui.min.css-Aggregated", "isController": false}, {"data": [[10.0, 698.6999999999999]], "isOverall": false, "label": "92 /modules/Users/login.css", "isController": false}, {"data": [[10.0, 698.6999999999999]], "isOverall": false, "label": "92 /modules/Users/login.css-Aggregated", "isController": false}, {"data": [[10.0, 401.1]], "isOverall": false, "label": "166 /custom/themes/SuiteR/images/id-ff-clear.png", "isController": false}, {"data": [[10.0, 401.1]], "isOverall": false, "label": "166 /custom/themes/SuiteR/images/id-ff-clear.png-Aggregated", "isController": false}, {"data": [[10.0, 587.6]], "isOverall": false, "label": "175 /getPromoPlans.php", "isController": false}, {"data": [[10.0, 587.6]], "isOverall": false, "label": "175 /getPromoPlans.php-Aggregated", "isController": false}, {"data": [[10.0, 867.2]], "isOverall": false, "label": "89 /cache/themes/SuiteR/css/deprecated.css", "isController": false}, {"data": [[10.0, 867.2]], "isOverall": false, "label": "89 /cache/themes/SuiteR/css/deprecated.css-Aggregated", "isController": false}, {"data": [[10.0, 392.7]], "isOverall": false, "label": "104 /custom/themes/SuiteR/images/sugar_icon.ico", "isController": false}, {"data": [[10.0, 392.7]], "isOverall": false, "label": "104 /custom/themes/SuiteR/images/sugar_icon.ico-Aggregated", "isController": false}, {"data": [[10.0, 782.0999999999999]], "isOverall": false, "label": "177 /include/javascript/yui/build/assets/skins/sam/sprite.png", "isController": false}, {"data": [[10.0, 782.0999999999999]], "isOverall": false, "label": "177 /include/javascript/yui/build/assets/skins/sam/sprite.png-Aggregated", "isController": false}, {"data": [[10.0, 1291.6]], "isOverall": false, "label": "198 /include/javascript/jquery/themes/base/jquery-ui.theme.min.css", "isController": false}, {"data": [[10.0, 1291.6]], "isOverall": false, "label": "198 /include/javascript/jquery/themes/base/jquery-ui.theme.min.css-Aggregated", "isController": false}, {"data": [[10.0, 398.4]], "isOverall": false, "label": "129 /custom/themes/SuiteR/images/blank.gif", "isController": false}, {"data": [[10.0, 398.4]], "isOverall": false, "label": "129 /custom/themes/SuiteR/images/blank.gif-Aggregated", "isController": false}, {"data": [[10.0, 772.1999999999999]], "isOverall": false, "label": "158 /include/SugarFields/Fields/Datetimecombo/Datetimecombo.js", "isController": false}, {"data": [[10.0, 772.1999999999999]], "isOverall": false, "label": "158 /include/SugarFields/Fields/Datetimecombo/Datetimecombo.js-Aggregated", "isController": false}, {"data": [[10.0, 552.3]], "isOverall": false, "label": "88 /include/javascript/jquery/themes/base/jquery.ui.all.css", "isController": false}, {"data": [[10.0, 552.3]], "isOverall": false, "label": "88 /include/javascript/jquery/themes/base/jquery.ui.all.css-Aggregated", "isController": false}, {"data": [[10.0, 582.0]], "isOverall": false, "label": "194 /modules/Users/login.css", "isController": false}, {"data": [[10.0, 582.0]], "isOverall": false, "label": "194 /modules/Users/login.css-Aggregated", "isController": false}, {"data": [[10.0, 747.0]], "isOverall": false, "label": "114 /include/SugarCharts/Jit/js/mySugarCharts.js", "isController": false}, {"data": [[10.0, 747.0]], "isOverall": false, "label": "114 /include/SugarCharts/Jit/js/mySugarCharts.js-Aggregated", "isController": false}, {"data": [[10.0, 395.3]], "isOverall": false, "label": "101 /custom/themes/SuiteR/images/advanced_search.gif", "isController": false}, {"data": [[10.0, 395.3]], "isOverall": false, "label": "101 /custom/themes/SuiteR/images/advanced_search.gif-Aggregated", "isController": false}, {"data": [[9.0, 2892.0], [10.0, 2896.8571428571427], [3.0, 3252.5]], "isOverall": false, "label": "78 /index.php", "isController": false}, {"data": [[8.5, 2967.5]], "isOverall": false, "label": "78 /index.php-Aggregated", "isController": false}, {"data": [[10.0, 902.7999999999998]], "isOverall": false, "label": "116 /include/javascript/jsclass_base.js", "isController": false}, {"data": [[10.0, 902.7999999999998]], "isOverall": false, "label": "116 /include/javascript/jsclass_base.js-Aggregated", "isController": false}, {"data": [[10.0, 8994.0]], "isOverall": false, "label": "178 /index.php", "isController": false}, {"data": [[10.0, 8994.0]], "isOverall": false, "label": "178 /index.php-Aggregated", "isController": false}, {"data": [[10.0, 9274.125000000002], [6.0, 9257.0], [7.0, 9314.0]], "isOverall": false, "label": "83 /cache/include/javascript/sugar_grp1.js", "isController": false}, {"data": [[9.299999999999999, 9276.4]], "isOverall": false, "label": "83 /cache/include/javascript/sugar_grp1.js-Aggregated", "isController": false}, {"data": [[10.0, 398.3]], "isOverall": false, "label": "144 /custom/themes/SuiteR/images/edit_inline.png", "isController": false}, {"data": [[10.0, 398.3]], "isOverall": false, "label": "144 /custom/themes/SuiteR/images/edit_inline.png-Aggregated", "isController": false}, {"data": [[10.0, 1875.1]], "isOverall": false, "label": "91 /themes/SuiteR/js/jscolor.js", "isController": false}, {"data": [[10.0, 1875.1]], "isOverall": false, "label": "91 /themes/SuiteR/js/jscolor.js-Aggregated", "isController": false}, {"data": [[10.0, 400.50000000000006]], "isOverall": false, "label": "170 /getCategoryServices.php", "isController": false}, {"data": [[10.0, 400.50000000000006]], "isOverall": false, "label": "170 /getCategoryServices.php-Aggregated", "isController": false}, {"data": [[10.0, 401.59999999999997]], "isOverall": false, "label": "148 /index.php", "isController": false}, {"data": [[10.0, 401.59999999999997]], "isOverall": false, "label": "148 /index.php-Aggregated", "isController": false}, {"data": [[1.0, 647.0], [2.0, 431.0], [4.0, 429.0], [8.0, 529.0], [9.0, 527.0], [10.0, 15461.666666666666], [3.0, 423.0], [7.0, 432.0]], "isOverall": false, "label": "76 /success.txt", "isController": false}, {"data": [[6.4, 4980.3]], "isOverall": false, "label": "76 /success.txt-Aggregated", "isController": false}, {"data": [[10.0, 419.7]], "isOverall": false, "label": "201 /index.php", "isController": false}, {"data": [[10.0, 419.7]], "isOverall": false, "label": "201 /index.php-Aggregated", "isController": false}, {"data": [[10.0, 13361.2]], "isOverall": false, "label": "190 /cache/themes/SuiteR/css/style.css", "isController": false}, {"data": [[10.0, 13361.2]], "isOverall": false, "label": "190 /cache/themes/SuiteR/css/style.css-Aggregated", "isController": false}, {"data": [[10.0, 398.5]], "isOverall": false, "label": "138 /index.php", "isController": false}, {"data": [[10.0, 398.5]], "isOverall": false, "label": "138 /index.php-Aggregated", "isController": false}, {"data": [[10.0, 402.2]], "isOverall": false, "label": "191 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[10.0, 402.2]], "isOverall": false, "label": "191 /themes/SuiteR/css/colourSelector.php-Aggregated", "isController": false}, {"data": [[10.0, 578.8]], "isOverall": false, "label": "103 /custom/themes/SuiteR/images/sugar_icon.ico", "isController": false}, {"data": [[10.0, 578.8]], "isOverall": false, "label": "103 /custom/themes/SuiteR/images/sugar_icon.ico-Aggregated", "isController": false}, {"data": [[10.0, 1502.0]], "isOverall": false, "label": "96 /cache/include/javascript/sugar_field_grp.js", "isController": false}, {"data": [[10.0, 1502.0]], "isOverall": false, "label": "96 /cache/include/javascript/sugar_field_grp.js-Aggregated", "isController": false}, {"data": [[10.0, 401.29999999999995]], "isOverall": false, "label": "163 /custom/themes/SuiteR/images/jscalendar.gif", "isController": false}, {"data": [[10.0, 401.29999999999995]], "isOverall": false, "label": "163 /custom/themes/SuiteR/images/jscalendar.gif-Aggregated", "isController": false}, {"data": [[10.0, 401.09999999999997]], "isOverall": false, "label": "176 /promotions.php", "isController": false}, {"data": [[10.0, 401.09999999999997]], "isOverall": false, "label": "176 /promotions.php-Aggregated", "isController": false}, {"data": [[10.0, 1029.5]], "isOverall": false, "label": "98 /include/javascript/jquery/themes/base/jquery-ui.theme.min.css", "isController": false}, {"data": [[10.0, 1029.5]], "isOverall": false, "label": "98 /include/javascript/jquery/themes/base/jquery-ui.theme.min.css-Aggregated", "isController": false}, {"data": [[10.0, 401.5]], "isOverall": false, "label": "167 /custom/themes/SuiteR/images/id-ff-select.png", "isController": false}, {"data": [[10.0, 401.5]], "isOverall": false, "label": "167 /custom/themes/SuiteR/images/id-ff-select.png-Aggregated", "isController": false}, {"data": [[10.0, 398.2]], "isOverall": false, "label": "145 /custom/themes/SuiteR/images/print.gif", "isController": false}, {"data": [[10.0, 398.2]], "isOverall": false, "label": "145 /custom/themes/SuiteR/images/print.gif-Aggregated", "isController": false}, {"data": [[10.0, 815.9]], "isOverall": false, "label": "119 /modules/Calendar/fullcalendar/fullcalendar.print.css", "isController": false}, {"data": [[10.0, 815.9]], "isOverall": false, "label": "119 /modules/Calendar/fullcalendar/fullcalendar.print.css-Aggregated", "isController": false}, {"data": [[10.0, 400.90000000000003]], "isOverall": false, "label": "162 /custom/themes/SuiteR/images/basic_search.gif", "isController": false}, {"data": [[10.0, 400.90000000000003]], "isOverall": false, "label": "162 /custom/themes/SuiteR/images/basic_search.gif-Aggregated", "isController": false}, {"data": [[10.0, 1443.9]], "isOverall": false, "label": "199 /custom/include/images/20reasons_md.png", "isController": false}, {"data": [[10.0, 1443.9]], "isOverall": false, "label": "199 /custom/include/images/20reasons_md.png-Aggregated", "isController": false}, {"data": [[10.0, 398.09999999999997]], "isOverall": false, "label": "90 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[10.0, 398.09999999999997]], "isOverall": false, "label": "90 /themes/SuiteR/css/colourSelector.php-Aggregated", "isController": false}, {"data": [[10.0, 400.29999999999995]], "isOverall": false, "label": "128 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[10.0, 400.29999999999995]], "isOverall": false, "label": "128 /themes/SuiteR/css/colourSelector.php-Aggregated", "isController": false}, {"data": [[10.0, 405.70000000000005]], "isOverall": false, "label": "168 /MasterData/product_category_list.json", "isController": false}, {"data": [[10.0, 405.70000000000005]], "isOverall": false, "label": "168 /MasterData/product_category_list.json-Aggregated", "isController": false}, {"data": [[10.0, 650.7999999999998]], "isOverall": false, "label": "188 /include/javascript/jquery/themes/base/jquery.ui.all.css", "isController": false}, {"data": [[10.0, 650.7999999999998]], "isOverall": false, "label": "188 /include/javascript/jquery/themes/base/jquery.ui.all.css-Aggregated", "isController": false}, {"data": [[8.0, 404.0], [10.0, 403.33333333333326]], "isOverall": false, "label": "207 /emailMobileExistLead.php", "isController": false}, {"data": [[9.8, 403.3999999999999]], "isOverall": false, "label": "207 /emailMobileExistLead.php-Aggregated", "isController": false}, {"data": [[10.0, 969.0999999999999]], "isOverall": false, "label": "86 /include/javascript/qtip/jquery.qtip.min.css", "isController": false}, {"data": [[10.0, 969.0999999999999]], "isOverall": false, "label": "86 /include/javascript/qtip/jquery.qtip.min.css-Aggregated", "isController": false}, {"data": [[10.0, 6267.299999999999]], "isOverall": false, "label": "122 /modules/Calendar/fullcalendar/fullcalendar.min.js", "isController": false}, {"data": [[10.0, 6267.299999999999]], "isOverall": false, "label": "122 /modules/Calendar/fullcalendar/fullcalendar.min.js-Aggregated", "isController": false}, {"data": [[10.0, 1219.5]], "isOverall": false, "label": "113 /include/SugarCharts/Jit/js/sugarCharts.js", "isController": false}, {"data": [[10.0, 1219.5]], "isOverall": false, "label": "113 /include/SugarCharts/Jit/js/sugarCharts.js-Aggregated", "isController": false}, {"data": [[10.0, 10130.6]], "isOverall": false, "label": "156 /custom/modules/Leads/LeadValidations.js", "isController": false}, {"data": [[10.0, 10130.6]], "isOverall": false, "label": "156 /custom/modules/Leads/LeadValidations.js-Aggregated", "isController": false}, {"data": [[10.0, 30932.1]], "isOverall": false, "label": "181 /cache/include/javascript/sugar_grp1_jquery.js", "isController": false}, {"data": [[10.0, 30932.1]], "isOverall": false, "label": "181 /cache/include/javascript/sugar_grp1_jquery.js-Aggregated", "isController": false}, {"data": [[10.0, 1755.3999999999999]], "isOverall": false, "label": "85 /cache/themes/SuiteR/js/style.js", "isController": false}, {"data": [[10.0, 1755.3999999999999]], "isOverall": false, "label": "85 /cache/themes/SuiteR/js/style.js-Aggregated", "isController": false}, {"data": [[8.0, 733.0], [1.0, 774.0], [10.0, 781.5], [6.0, 749.6666666666666], [7.0, 748.6666666666666]], "isOverall": false, "label": "218 /include/social/twitter/twitter_feed.js", "isController": false}, {"data": [[6.800000000000001, 756.5]], "isOverall": false, "label": "218 /include/social/twitter/twitter_feed.js-Aggregated", "isController": false}, {"data": [[10.0, 8525.3]], "isOverall": false, "label": "106 /index.php", "isController": false}, {"data": [[10.0, 8525.3]], "isOverall": false, "label": "106 /index.php-Aggregated", "isController": false}, {"data": [[10.0, 723.3]], "isOverall": false, "label": "117 /include/javascript/jsclass_async.js", "isController": false}, {"data": [[10.0, 723.3]], "isOverall": false, "label": "117 /include/javascript/jsclass_async.js-Aggregated", "isController": false}, {"data": [[10.0, 401.09999999999997]], "isOverall": false, "label": "164 /custom/themes/20reasons/images/jscalendar.gif", "isController": false}, {"data": [[10.0, 401.09999999999997]], "isOverall": false, "label": "164 /custom/themes/20reasons/images/jscalendar.gif-Aggregated", "isController": false}, {"data": [[10.0, 14608.0]], "isOverall": false, "label": "160 /cache/include/javascript/sugar_grp_yui_widgets.js", "isController": false}, {"data": [[10.0, 14608.0]], "isOverall": false, "label": "160 /cache/include/javascript/sugar_grp_yui_widgets.js-Aggregated", "isController": false}, {"data": [[10.0, 1351.3]], "isOverall": false, "label": "193 /cache/include/javascript/sugar_field_grp.js", "isController": false}, {"data": [[10.0, 1351.3]], "isOverall": false, "label": "193 /cache/include/javascript/sugar_field_grp.js-Aggregated", "isController": false}, {"data": [[8.0, 543.0], [1.0, 547.0], [10.0, 544.0], [5.0, 543.0], [7.0, 544.0]], "isOverall": false, "label": "222 /include/SubPanel/SubPanel.js", "isController": false}, {"data": [[6.5, 543.9]], "isOverall": false, "label": "222 /include/SubPanel/SubPanel.js-Aggregated", "isController": false}, {"data": [[10.0, 398.4]], "isOverall": false, "label": "131 /custom/themes/SuiteR/images/start_off.gif", "isController": false}, {"data": [[10.0, 398.4]], "isOverall": false, "label": "131 /custom/themes/SuiteR/images/start_off.gif-Aggregated", "isController": false}, {"data": [[10.0, 1761.1]], "isOverall": false, "label": "186 /cache/themes/SuiteR/js/style.js", "isController": false}, {"data": [[10.0, 1761.1]], "isOverall": false, "label": "186 /cache/themes/SuiteR/js/style.js-Aggregated", "isController": false}, {"data": [[10.0, 1353.0999999999997]], "isOverall": false, "label": "141 /include/MySugar/javascript/MySugar.js", "isController": false}, {"data": [[10.0, 1353.0999999999997]], "isOverall": false, "label": "141 /include/MySugar/javascript/MySugar.js-Aggregated", "isController": false}, {"data": [[10.0, 627.1]], "isOverall": false, "label": "165 /custom/themes/20reasons/images/jscalendar.gif", "isController": false}, {"data": [[10.0, 627.1]], "isOverall": false, "label": "165 /custom/themes/20reasons/images/jscalendar.gif-Aggregated", "isController": false}, {"data": [[10.0, 653.2]], "isOverall": false, "label": "179 /themes/SuiteR/css/footable.core.css", "isController": false}, {"data": [[10.0, 653.2]], "isOverall": false, "label": "179 /themes/SuiteR/css/footable.core.css-Aggregated", "isController": false}, {"data": [[8.0, 550.75], [4.0, 557.0], [10.0, 552.0], [7.0, 578.3333333333334]], "isOverall": false, "label": "211 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[7.699999999999999, 559.9]], "isOverall": false, "label": "211 /themes/SuiteR/css/colourSelector.php-Aggregated", "isController": false}, {"data": [[10.0, 401.3]], "isOverall": false, "label": "172 /MasterData/pinCodeMasterData.php", "isController": false}, {"data": [[10.0, 401.3]], "isOverall": false, "label": "172 /MasterData/pinCodeMasterData.php-Aggregated", "isController": false}, {"data": [[10.0, 1889.4]], "isOverall": false, "label": "192 /themes/SuiteR/js/jscolor.js", "isController": false}, {"data": [[10.0, 1889.4]], "isOverall": false, "label": "192 /themes/SuiteR/js/jscolor.js-Aggregated", "isController": false}, {"data": [[8.0, 573.0], [4.0, 573.0], [10.0, 573.0], [7.0, 573.0]], "isOverall": false, "label": "212 /modules/Leads/Lead.js", "isController": false}, {"data": [[7.6, 573.0]], "isOverall": false, "label": "212 /modules/Leads/Lead.js-Aggregated", "isController": false}, {"data": [[10.0, 1080.9999999999998]], "isOverall": false, "label": "197 /include/javascript/jquery/themes/base/jquery-ui.structure.min.css", "isController": false}, {"data": [[10.0, 1080.9999999999998]], "isOverall": false, "label": "197 /include/javascript/jquery/themes/base/jquery-ui.structure.min.css-Aggregated", "isController": false}, {"data": [[2.0, 436.5], [8.0, 795.0], [9.0, 714.0], [10.0, 12166.0]], "isOverall": false, "label": "77 /success.txt", "isController": false}, {"data": [[8.1, 7537.8]], "isOverall": false, "label": "77 /success.txt-Aggregated", "isController": false}, {"data": [[10.0, 398.29999999999995]], "isOverall": false, "label": "147 /custom/themes/SuiteR/images/next.gif", "isController": false}, {"data": [[10.0, 398.29999999999995]], "isOverall": false, "label": "147 /custom/themes/SuiteR/images/next.gif-Aggregated", "isController": false}, {"data": [[10.0, 400.2]], "isOverall": false, "label": "109 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[10.0, 400.2]], "isOverall": false, "label": "109 /themes/SuiteR/css/colourSelector.php-Aggregated", "isController": false}, {"data": [[10.0, 1057.1000000000001]], "isOverall": false, "label": "108 /cache/jsLanguage/Home/en_us.js", "isController": false}, {"data": [[10.0, 1057.1000000000001]], "isOverall": false, "label": "108 /cache/jsLanguage/Home/en_us.js-Aggregated", "isController": false}, {"data": [[10.0, 1806.9]], "isOverall": false, "label": "118 /modules/Calendar/fullcalendar/fullcalendar.css", "isController": false}, {"data": [[10.0, 1806.9]], "isOverall": false, "label": "118 /modules/Calendar/fullcalendar/fullcalendar.css-Aggregated", "isController": false}, {"data": [[10.0, 745.2]], "isOverall": false, "label": "159 /modules/Leads/Lead.js", "isController": false}, {"data": [[10.0, 745.2]], "isOverall": false, "label": "159 /modules/Leads/Lead.js-Aggregated", "isController": false}, {"data": [[10.0, 1816.1999999999998]], "isOverall": false, "label": "196 /include/javascript/jquery/themes/base/jquery-ui.min.css", "isController": false}, {"data": [[10.0, 1816.1999999999998]], "isOverall": false, "label": "196 /include/javascript/jquery/themes/base/jquery-ui.min.css-Aggregated", "isController": false}, {"data": [[10.0, 11449.199999999999]], "isOverall": false, "label": "187 /cache/themes/SuiteR/css/yui.css", "isController": false}, {"data": [[10.0, 11449.199999999999]], "isOverall": false, "label": "187 /cache/themes/SuiteR/css/yui.css-Aggregated", "isController": false}, {"data": [[10.0, 1312.2]], "isOverall": false, "label": "202 /emailMobileExistLead.php", "isController": false}, {"data": [[10.0, 1312.2]], "isOverall": false, "label": "202 /emailMobileExistLead.php-Aggregated", "isController": false}, {"data": [[10.0, 1680.8]], "isOverall": false, "label": "154 /cache/jsLanguage/Leads/en_us.js", "isController": false}, {"data": [[10.0, 1680.8]], "isOverall": false, "label": "154 /cache/jsLanguage/Leads/en_us.js-Aggregated", "isController": false}, {"data": [[8.0, 1595.0], [10.0, 1602.0], [6.0, 1620.5], [3.0, 1603.0], [7.0, 1563.3333333333333]], "isOverall": false, "label": "214 /include/InlineEditing/inlineEditing.js", "isController": false}, {"data": [[7.2, 1592.8000000000002]], "isOverall": false, "label": "214 /include/InlineEditing/inlineEditing.js-Aggregated", "isController": false}, {"data": [[10.0, 746.7]], "isOverall": false, "label": "125 /include/MySugar/javascript/AddRemoveDashboardPages.js", "isController": false}, {"data": [[10.0, 746.7]], "isOverall": false, "label": "125 /include/MySugar/javascript/AddRemoveDashboardPages.js-Aggregated", "isController": false}, {"data": [[10.0, 398.50000000000006]], "isOverall": false, "label": "134 /custom/themes/SuiteR/images/arrow.gif", "isController": false}, {"data": [[10.0, 398.50000000000006]], "isOverall": false, "label": "134 /custom/themes/SuiteR/images/arrow.gif-Aggregated", "isController": false}, {"data": [[10.0, 639.8]], "isOverall": false, "label": "174 /promotions.php", "isController": false}, {"data": [[10.0, 639.8]], "isOverall": false, "label": "174 /promotions.php-Aggregated", "isController": false}, {"data": [[10.0, 8055.799999999999]], "isOverall": false, "label": "107 /cache/jsLanguage/en_us.js", "isController": false}, {"data": [[10.0, 8055.799999999999]], "isOverall": false, "label": "107 /cache/jsLanguage/en_us.js-Aggregated", "isController": false}, {"data": [[10.0, 398.3]], "isOverall": false, "label": "132 /custom/themes/SuiteR/images/next_off.gif", "isController": false}, {"data": [[10.0, 398.3]], "isOverall": false, "label": "132 /custom/themes/SuiteR/images/next_off.gif-Aggregated", "isController": false}, {"data": [[10.0, 1030.0]], "isOverall": false, "label": "184 /include/javascript/calendar.js", "isController": false}, {"data": [[10.0, 1030.0]], "isOverall": false, "label": "184 /include/javascript/calendar.js-Aggregated", "isController": false}, {"data": [[10.0, 6031.0]], "isOverall": false, "label": "173 /getPromoPlans.php", "isController": false}, {"data": [[10.0, 6031.0]], "isOverall": false, "label": "173 /getPromoPlans.php-Aggregated", "isController": false}, {"data": [[10.0, 997.2]], "isOverall": false, "label": "185 /include/javascript/qtip/jquery.qtip.min.css", "isController": false}, {"data": [[10.0, 997.2]], "isOverall": false, "label": "185 /include/javascript/qtip/jquery.qtip.min.css-Aggregated", "isController": false}, {"data": [[10.0, 615.9]], "isOverall": false, "label": "150 /success.txt", "isController": false}, {"data": [[10.0, 615.9]], "isOverall": false, "label": "150 /success.txt-Aggregated", "isController": false}, {"data": [[10.0, 26033.9]], "isOverall": false, "label": "82 /cache/include/javascript/sugar_grp1_yui.js", "isController": false}, {"data": [[10.0, 26033.9]], "isOverall": false, "label": "82 /cache/include/javascript/sugar_grp1_yui.js-Aggregated", "isController": false}, {"data": [[10.0, 398.70000000000005]], "isOverall": false, "label": "136 /custom/themes/SuiteR/images/arrow_down.gif", "isController": false}, {"data": [[10.0, 398.70000000000005]], "isOverall": false, "label": "136 /custom/themes/SuiteR/images/arrow_down.gif-Aggregated", "isController": false}, {"data": [[10.0, 398.40000000000003]], "isOverall": false, "label": "102 /index.php", "isController": false}, {"data": [[10.0, 398.40000000000003]], "isOverall": false, "label": "102 /index.php-Aggregated", "isController": false}, {"data": [[10.0, 562.5]], "isOverall": false, "label": "161 /themes/default/images/create-record.gif", "isController": false}, {"data": [[10.0, 562.5]], "isOverall": false, "label": "161 /themes/default/images/create-record.gif-Aggregated", "isController": false}, {"data": [[4.0, 6008.0], [5.0, 6005.0], [10.0, 6005.125]], "isOverall": false, "label": "79 /themes/SuiteR/css/bootstrap.min.css", "isController": false}, {"data": [[8.9, 6005.4]], "isOverall": false, "label": "79 /themes/SuiteR/css/bootstrap.min.css-Aggregated", "isController": false}, {"data": [[10.0, 14585.3]], "isOverall": false, "label": "110 /cache/include/javascript/sugar_grp_yui_widgets.js", "isController": false}, {"data": [[10.0, 14585.3]], "isOverall": false, "label": "110 /cache/include/javascript/sugar_grp_yui_widgets.js-Aggregated", "isController": false}, {"data": [[10.0, 1892.4]], "isOverall": false, "label": "124 /modules/Calendar/Cal.js", "isController": false}, {"data": [[10.0, 1892.4]], "isOverall": false, "label": "124 /modules/Calendar/Cal.js-Aggregated", "isController": false}, {"data": [[10.0, 598.1]], "isOverall": false, "label": "99 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[10.0, 598.1]], "isOverall": false, "label": "99 /themes/SuiteR/css/colourSelector.php-Aggregated", "isController": false}, {"data": [[8.0, 537.0], [1.0, 540.0], [10.0, 538.5], [5.0, 538.5], [6.0, 537.0], [7.0, 538.3333333333334]], "isOverall": false, "label": "219 /include/social/twitter/twitter.js", "isController": false}, {"data": [[6.6000000000000005, 538.3000000000001]], "isOverall": false, "label": "219 /include/social/twitter/twitter.js-Aggregated", "isController": false}, {"data": [[10.0, 1284.5]], "isOverall": false, "label": "204 /emailMobileExistLead.php", "isController": false}, {"data": [[10.0, 1284.5]], "isOverall": false, "label": "204 /emailMobileExistLead.php-Aggregated", "isController": false}, {"data": [[10.0, 9318.7]], "isOverall": false, "label": "183 /cache/include/javascript/sugar_grp1.js", "isController": false}, {"data": [[10.0, 9318.7]], "isOverall": false, "label": "183 /cache/include/javascript/sugar_grp1.js-Aggregated", "isController": false}, {"data": [[8.0, 579.6666666666666], [4.0, 581.0], [10.0, 579.5], [7.0, 580.25]], "isOverall": false, "label": "215 /modules/Favorites/favorites.js", "isController": false}, {"data": [[7.6, 580.0]], "isOverall": false, "label": "215 /modules/Favorites/favorites.js-Aggregated", "isController": false}, {"data": [[10.0, 9021.999999999998]], "isOverall": false, "label": "105 /index.php", "isController": false}, {"data": [[10.0, 9021.999999999998]], "isOverall": false, "label": "105 /index.php-Aggregated", "isController": false}, {"data": [[10.0, 1228.6999999999998]], "isOverall": false, "label": "135 /themes/SuiteR/fonts/glyphicons-halflings-regular.woff2", "isController": false}, {"data": [[10.0, 1228.6999999999998]], "isOverall": false, "label": "135 /themes/SuiteR/fonts/glyphicons-halflings-regular.woff2-Aggregated", "isController": false}, {"data": [[10.0, 401.09999999999997]], "isOverall": false, "label": "200 /custom/themes/SuiteR/images/advanced_search.gif", "isController": false}, {"data": [[10.0, 401.09999999999997]], "isOverall": false, "label": "200 /custom/themes/SuiteR/images/advanced_search.gif-Aggregated", "isController": false}, {"data": [[8.0, 21360.0], [10.0, 22474.5], [7.0, 21918.0]], "isOverall": false, "label": "209 /index.php", "isController": false}, {"data": [[8.300000000000002, 21638.7]], "isOverall": false, "label": "209 /index.php-Aggregated", "isController": false}, {"data": [[10.0, 756.5]], "isOverall": false, "label": "195 /modules/Users/login.js", "isController": false}, {"data": [[10.0, 756.5]], "isOverall": false, "label": "195 /modules/Users/login.js-Aggregated", "isController": false}, {"data": [[10.0, 1312.8000000000002]], "isOverall": false, "label": "205 /emailMobileExistLead.php", "isController": false}, {"data": [[10.0, 1312.8000000000002]], "isOverall": false, "label": "205 /emailMobileExistLead.php-Aggregated", "isController": false}, {"data": [[10.0, 1243.0]], "isOverall": false, "label": "97 /include/javascript/jquery/themes/base/jquery-ui.structure.min.css", "isController": false}, {"data": [[10.0, 1243.0]], "isOverall": false, "label": "97 /include/javascript/jquery/themes/base/jquery-ui.structure.min.css-Aggregated", "isController": false}, {"data": [[10.0, 3087.9]], "isOverall": false, "label": "121 /modules/Calendar/fullcalendar/lib/moment.min.js", "isController": false}, {"data": [[10.0, 3087.9]], "isOverall": false, "label": "121 /modules/Calendar/fullcalendar/lib/moment.min.js-Aggregated", "isController": false}, {"data": [[10.0, 18267.1]], "isOverall": false, "label": "153 /index.php", "isController": false}, {"data": [[10.0, 18267.1]], "isOverall": false, "label": "153 /index.php-Aggregated", "isController": false}, {"data": [[10.0, 6014.700000000001]], "isOverall": false, "label": "180 /themes/SuiteR/css/bootstrap.min.css", "isController": false}, {"data": [[10.0, 6014.700000000001]], "isOverall": false, "label": "180 /themes/SuiteR/css/bootstrap.min.css-Aggregated", "isController": false}, {"data": [[10.0, 711.0]], "isOverall": false, "label": "203 /custom/themes/default/images/checkLoader.gif", "isController": false}, {"data": [[10.0, 711.0]], "isOverall": false, "label": "203 /custom/themes/default/images/checkLoader.gif-Aggregated", "isController": false}, {"data": [[10.0, 587.4000000000001]], "isOverall": false, "label": "151 /index.php", "isController": false}, {"data": [[10.0, 587.4000000000001]], "isOverall": false, "label": "151 /index.php-Aggregated", "isController": false}, {"data": [[9.0, 1294.0], [10.0, 1337.3333333333333]], "isOverall": false, "label": "206 /emailMobileExistLead.php", "isController": false}, {"data": [[9.9, 1333.0]], "isOverall": false, "label": "206 /emailMobileExistLead.php-Aggregated", "isController": false}, {"data": [[10.0, 399.2]], "isOverall": false, "label": "152 /index.php", "isController": false}, {"data": [[10.0, 399.2]], "isOverall": false, "label": "152 /index.php-Aggregated", "isController": false}, {"data": [[10.0, 618.9000000000001]], "isOverall": false, "label": "169 /getCategoryProducts.php", "isController": false}, {"data": [[10.0, 618.9000000000001]], "isOverall": false, "label": "169 /getCategoryProducts.php-Aggregated", "isController": false}, {"data": [[10.0, 11433.4]], "isOverall": false, "label": "87 /cache/themes/SuiteR/css/yui.css", "isController": false}, {"data": [[10.0, 11433.4]], "isOverall": false, "label": "87 /cache/themes/SuiteR/css/yui.css-Aggregated", "isController": false}, {"data": [[10.0, 604.4000000000001]], "isOverall": false, "label": "142 /index.php", "isController": false}, {"data": [[10.0, 604.4000000000001]], "isOverall": false, "label": "142 /index.php-Aggregated", "isController": false}, {"data": [[8.0, 1574.0], [4.0, 1627.0], [2.0, 1621.0], [1.0, 1612.0], [9.0, 1605.0], [10.0, 1589.0], [5.0, 1617.0], [6.0, 1593.0], [3.0, 1580.0], [7.0, 1613.0]], "isOverall": false, "label": "220 /include/SubPanel/SubPanelTiles.js", "isController": false}, {"data": [[5.5, 1603.1]], "isOverall": false, "label": "220 /include/SubPanel/SubPanelTiles.js-Aggregated", "isController": false}], "supportsControllersDiscrimination": true, "maxX": 10.0, "title": "Time VS Threads"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    axisLabel: "Number of active threads",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average response times in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: { noColumns: 2,show: true, container: '#legendTimeVsThreads' },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s: At %x.2 active threads, Average response time was %y.2 ms"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesTimeVsThreads"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotTimesVsThreads"), dataset, options);
            // setup overview
            $.plot($("#overviewTimesVsThreads"), dataset, prepareOverviewOptions(options));
        }
};

// Time vs threads
function refreshTimeVsThreads(){
    var infos = timeVsThreadsInfos;
    prepareSeries(infos.data);
    if(isGraph($("#flotTimesVsThreads"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesTimeVsThreads");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotTimesVsThreads", "#overviewTimesVsThreads");
        $('#footerTimeVsThreads .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var bytesThroughputOverTimeInfos = {
        data : {"result": {"minY": 95.23333333333333, "minX": 1.52834592E12, "maxY": 239293.48333333334, "series": [{"data": [[1.52834622E12, 159756.23333333334], [1.52834604E12, 197308.98333333334], [1.52834634E12, 239293.48333333334], [1.52834616E12, 177132.58333333334], [1.52834598E12, 85994.5], [1.52834646E12, 45250.61666666667], [1.52834628E12, 112774.18333333333], [1.5283461E12, 202616.98333333334], [1.52834592E12, 5288.566666666667], [1.5283464E12, 88854.83333333333]], "isOverall": false, "label": "Bytes received per second", "isController": false}, {"data": [[1.52834622E12, 2313.5], [1.52834604E12, 862.65], [1.52834634E12, 1186.35], [1.52834616E12, 3035.25], [1.52834598E12, 538.9166666666666], [1.52834646E12, 2445.483333333333], [1.52834628E12, 1253.1166666666666], [1.5283461E12, 1576.7166666666667], [1.52834592E12, 95.23333333333333], [1.5283464E12, 3742.7166666666667]], "isOverall": false, "label": "Bytes sent per second", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.52834646E12, "title": "Bytes Throughput Over Time"}},
        getOptions : function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity) ,
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Bytes/sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendBytesThroughputOverTime'
                },
                selection: {
                    mode: "xy"
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y"
                }
            };
        },
        createGraph : function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesBytesThroughputOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotBytesThroughputOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewBytesThroughputOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Bytes throughput Over Time
function refreshBytesThroughputOverTime(fixTimestamps) {
    var infos = bytesThroughputOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 19800000);
    }
    if(isGraph($("#flotBytesThroughputOverTime"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesBytesThroughputOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotBytesThroughputOverTime", "#overviewBytesThroughputOverTime");
        $('#footerBytesThroughputOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var responseTimesOverTimeInfos = {
        data: {"result": {"minY": 392.5, "minX": 1.52834592E12, "maxY": 30983.5, "series": [{"data": [[1.52834598E12, 851.75], [1.52834592E12, 853.5]], "isOverall": false, "label": "84 /include/javascript/calendar.js", "isController": false}, {"data": [[1.52834622E12, 1945.2], [1.52834616E12, 1944.0]], "isOverall": false, "label": "143 /modules/Meetings/jsclass_scheduler.js", "isController": false}, {"data": [[1.52834622E12, 570.0], [1.52834616E12, 582.0]], "isOverall": false, "label": "133 /custom/themes/SuiteR/images/end_off.gif", "isController": false}, {"data": [[1.52834616E12, 815.75], [1.5283461E12, 772.5]], "isOverall": false, "label": "115 /include/SugarFields/Fields/Datetimecombo/Datetimecombo.js", "isController": false}, {"data": [[1.52834604E12, 30883.875], [1.52834598E12, 30909.0]], "isOverall": false, "label": "81 /cache/include/javascript/sugar_grp1_jquery.js", "isController": false}, {"data": [[1.52834616E12, 14221.625], [1.5283461E12, 14242.0]], "isOverall": false, "label": "112 /include/SugarCharts/Jit/js/Jit/jit.js", "isController": false}, {"data": [[1.52834604E12, 1365.0], [1.5283461E12, 1364.5]], "isOverall": false, "label": "100 /custom/include/images/20reasons_md.png", "isController": false}, {"data": [[1.52834622E12, 399.0], [1.52834616E12, 399.0]], "isOverall": false, "label": "137 /custom/themes/SuiteR/images/calendar_previous.png", "isController": false}, {"data": [[1.52834622E12, 6986.0], [1.52834616E12, 6989.222222222223]], "isOverall": false, "label": "123 /modules/Calendar/fullcalendar/lang-all.js", "isController": false}, {"data": [[1.52834622E12, 572.8], [1.52834616E12, 554.0]], "isOverall": false, "label": "146 /custom/themes/SuiteR/images/backtotop.gif", "isController": false}, {"data": [[1.52834622E12, 398.0], [1.52834616E12, 398.44444444444446]], "isOverall": false, "label": "140 /custom/themes/SuiteR/images/end.gif", "isController": false}, {"data": [[1.52834646E12, 540.5], [1.5283464E12, 541.0]], "isOverall": false, "label": "217 /include/social/facebook/facebook.js", "isController": false}, {"data": [[1.52834604E12, 13362.5], [1.5283461E12, 13363.375]], "isOverall": false, "label": "94 /cache/themes/SuiteR/css/style.css", "isController": false}, {"data": [[1.52834622E12, 533.0], [1.52834616E12, 564.1111111111111]], "isOverall": false, "label": "139 /custom/themes/SuiteR/images/calendar_next.png", "isController": false}, {"data": [[1.52834634E12, 564.5], [1.5283464E12, 567.125]], "isOverall": false, "label": "208 /emailMobileExistLead.php", "isController": false}, {"data": [[1.52834622E12, 401.1666666666667], [1.52834616E12, 401.25]], "isOverall": false, "label": "149 /vcal_server.php", "isController": false}, {"data": [[1.52834646E12, 834.0], [1.5283464E12, 834.0]], "isOverall": false, "label": "213 /custom/modules/Leads/js/Inspection.js", "isController": false}, {"data": [[1.52834616E12, 2333.375], [1.5283461E12, 2333.0]], "isOverall": false, "label": "120 /include/javascript/qtip/jquery.qtip.min.js", "isController": false}, {"data": [[1.52834616E12, 572.0]], "isOverall": false, "label": "127 /themes/SuiteR/css/dashboardstyle.css", "isController": false}, {"data": [[1.52834634E12, 26245.2]], "isOverall": false, "label": "182 /cache/include/javascript/sugar_grp1_yui.js", "isController": false}, {"data": [[1.5283461E12, 700.3]], "isOverall": false, "label": "111 /include/javascript/dashlets.js", "isController": false}, {"data": [[1.52834616E12, 589.5], [1.5283461E12, 581.0]], "isOverall": false, "label": "126 /include/MySugar/javascript/retrievePage.js", "isController": false}, {"data": [[1.52834646E12, 582.4285714285714], [1.5283464E12, 580.6666666666666]], "isOverall": false, "label": "216 /include/social/facebook/facebook_subpanel.js", "isController": false}, {"data": [[1.52834622E12, 562.0], [1.52834628E12, 607.6666666666666]], "isOverall": false, "label": "171 /MasterData/getHAServicePincodelist.php", "isController": false}, {"data": [[1.52834622E12, 763.625], [1.52834616E12, 763.0]], "isOverall": false, "label": "157 /include/SugarFields/Fields/File/SugarFieldFile.js", "isController": false}, {"data": [[1.52834646E12, 8518.285714285716], [1.5283464E12, 8527.333333333334]], "isOverall": false, "label": "210 /index.php", "isController": false}, {"data": [[1.52834622E12, 540.0], [1.52834616E12, 553.3333333333334]], "isOverall": false, "label": "130 /custom/themes/SuiteR/images/previous_off.gif", "isController": false}, {"data": [[1.52834634E12, 1047.8333333333333], [1.5283464E12, 1292.0]], "isOverall": false, "label": "189 /cache/themes/SuiteR/css/deprecated.css", "isController": false}, {"data": [[1.52834604E12, 605.75], [1.52834598E12, 606.5]], "isOverall": false, "label": "93 /modules/Users/login.js", "isController": false}, {"data": [[1.52834622E12, 403.5], [1.52834616E12, 403.0]], "isOverall": false, "label": "155 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.52834598E12, 802.8750000000001], [1.52834592E12, 815.0]], "isOverall": false, "label": "80 /themes/SuiteR/css/footable.core.css", "isController": false}, {"data": [[1.52834646E12, 2479.625], [1.5283464E12, 2464.0]], "isOverall": false, "label": "221 /cache/include/javascript/sugar_grp_jsolait.js", "isController": false}, {"data": [[1.52834604E12, 1772.5], [1.5283461E12, 1773.7499999999998]], "isOverall": false, "label": "95 /include/javascript/jquery/themes/base/jquery-ui.min.css", "isController": false}, {"data": [[1.52834604E12, 703.0], [1.52834598E12, 681.5]], "isOverall": false, "label": "92 /modules/Users/login.css", "isController": false}, {"data": [[1.52834622E12, 401.0], [1.52834628E12, 401.3333333333333]], "isOverall": false, "label": "166 /custom/themes/SuiteR/images/id-ff-clear.png", "isController": false}, {"data": [[1.52834622E12, 557.0], [1.52834628E12, 595.25]], "isOverall": false, "label": "175 /getPromoPlans.php", "isController": false}, {"data": [[1.52834604E12, 867.0], [1.52834598E12, 868.0]], "isOverall": false, "label": "89 /cache/themes/SuiteR/css/deprecated.css", "isController": false}, {"data": [[1.52834604E12, 393.5], [1.5283461E12, 392.5]], "isOverall": false, "label": "104 /custom/themes/SuiteR/images/sugar_icon.ico", "isController": false}, {"data": [[1.52834622E12, 733.5], [1.52834628E12, 794.25]], "isOverall": false, "label": "177 /include/javascript/yui/build/assets/skins/sam/sprite.png", "isController": false}, {"data": [[1.52834634E12, 1457.5], [1.5283464E12, 1250.125]], "isOverall": false, "label": "198 /include/javascript/jquery/themes/base/jquery-ui.theme.min.css", "isController": false}, {"data": [[1.52834622E12, 399.0], [1.52834616E12, 398.3333333333333]], "isOverall": false, "label": "129 /custom/themes/SuiteR/images/blank.gif", "isController": false}, {"data": [[1.52834622E12, 772.125], [1.52834616E12, 772.5]], "isOverall": false, "label": "158 /include/SugarFields/Fields/Datetimecombo/Datetimecombo.js", "isController": false}, {"data": [[1.52834604E12, 550.6250000000001], [1.52834598E12, 559.0]], "isOverall": false, "label": "88 /include/javascript/jquery/themes/base/jquery.ui.all.css", "isController": false}, {"data": [[1.52834634E12, 584.6], [1.5283464E12, 579.4]], "isOverall": false, "label": "194 /modules/Users/login.css", "isController": false}, {"data": [[1.52834616E12, 764.75], [1.5283461E12, 676.0]], "isOverall": false, "label": "114 /include/SugarCharts/Jit/js/mySugarCharts.js", "isController": false}, {"data": [[1.52834604E12, 395.5], [1.5283461E12, 395.25]], "isOverall": false, "label": "101 /custom/themes/SuiteR/images/advanced_search.gif", "isController": false}, {"data": [[1.52834598E12, 2896.25], [1.52834592E12, 3252.5]], "isOverall": false, "label": "78 /index.php", "isController": false}, {"data": [[1.52834616E12, 911.25], [1.5283461E12, 869.0]], "isOverall": false, "label": "116 /include/javascript/jsclass_base.js", "isController": false}, {"data": [[1.52834622E12, 8923.5], [1.52834628E12, 9011.625]], "isOverall": false, "label": "178 /index.php", "isController": false}, {"data": [[1.52834598E12, 9276.4]], "isOverall": false, "label": "83 /cache/include/javascript/sugar_grp1.js", "isController": false}, {"data": [[1.52834622E12, 398.25], [1.52834616E12, 398.33333333333337]], "isOverall": false, "label": "144 /custom/themes/SuiteR/images/edit_inline.png", "isController": false}, {"data": [[1.52834604E12, 1874.75], [1.52834598E12, 1876.5]], "isOverall": false, "label": "91 /themes/SuiteR/js/jscolor.js", "isController": false}, {"data": [[1.52834622E12, 400.8], [1.52834628E12, 400.2]], "isOverall": false, "label": "170 /getCategoryServices.php", "isController": false}, {"data": [[1.52834622E12, 401.83333333333337], [1.52834616E12, 401.25]], "isOverall": false, "label": "148 /index.php", "isController": false}, {"data": [[1.52834598E12, 7978.833333333333], [1.52834592E12, 482.5]], "isOverall": false, "label": "76 /success.txt", "isController": false}, {"data": [[1.52834634E12, 482.0], [1.5283464E12, 404.125]], "isOverall": false, "label": "201 /index.php", "isController": false}, {"data": [[1.52834634E12, 13379.5], [1.5283464E12, 13356.625]], "isOverall": false, "label": "190 /cache/themes/SuiteR/css/style.css", "isController": false}, {"data": [[1.52834622E12, 399.0], [1.52834616E12, 398.44444444444446]], "isOverall": false, "label": "138 /index.php", "isController": false}, {"data": [[1.52834634E12, 402.2]], "isOverall": false, "label": "191 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.52834604E12, 617.5], [1.5283461E12, 569.125]], "isOverall": false, "label": "103 /custom/themes/SuiteR/images/sugar_icon.ico", "isController": false}, {"data": [[1.52834604E12, 1487.0], [1.5283461E12, 1505.75]], "isOverall": false, "label": "96 /cache/include/javascript/sugar_field_grp.js", "isController": false}, {"data": [[1.52834622E12, 401.25], [1.52834616E12, 401.5]], "isOverall": false, "label": "163 /custom/themes/SuiteR/images/jscalendar.gif", "isController": false}, {"data": [[1.52834622E12, 401.0], [1.52834628E12, 401.125]], "isOverall": false, "label": "176 /promotions.php", "isController": false}, {"data": [[1.52834604E12, 1030.0], [1.5283461E12, 1029.3750000000002]], "isOverall": false, "label": "98 /include/javascript/jquery/themes/base/jquery-ui.theme.min.css", "isController": false}, {"data": [[1.52834622E12, 401.57142857142856], [1.52834628E12, 401.3333333333333]], "isOverall": false, "label": "167 /custom/themes/SuiteR/images/id-ff-select.png", "isController": false}, {"data": [[1.52834622E12, 398.2], [1.52834616E12, 398.2]], "isOverall": false, "label": "145 /custom/themes/SuiteR/images/print.gif", "isController": false}, {"data": [[1.52834616E12, 819.125], [1.5283461E12, 803.0]], "isOverall": false, "label": "119 /modules/Calendar/fullcalendar/fullcalendar.print.css", "isController": false}, {"data": [[1.52834622E12, 400.875], [1.52834616E12, 401.0]], "isOverall": false, "label": "162 /custom/themes/SuiteR/images/basic_search.gif", "isController": false}, {"data": [[1.52834634E12, 1462.5], [1.5283464E12, 1439.25]], "isOverall": false, "label": "199 /custom/include/images/20reasons_md.png", "isController": false}, {"data": [[1.52834604E12, 398.125], [1.52834598E12, 398.0]], "isOverall": false, "label": "90 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.52834616E12, 400.29999999999995]], "isOverall": false, "label": "128 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.52834622E12, 405.8571428571429], [1.52834628E12, 405.3333333333333]], "isOverall": false, "label": "168 /MasterData/product_category_list.json", "isController": false}, {"data": [[1.52834634E12, 650.7999999999998]], "isOverall": false, "label": "188 /include/javascript/jquery/themes/base/jquery.ui.all.css", "isController": false}, {"data": [[1.52834634E12, 402.5], [1.5283464E12, 403.62500000000006]], "isOverall": false, "label": "207 /emailMobileExistLead.php", "isController": false}, {"data": [[1.52834604E12, 959.5], [1.52834598E12, 1007.5]], "isOverall": false, "label": "86 /include/javascript/qtip/jquery.qtip.min.css", "isController": false}, {"data": [[1.52834616E12, 6267.299999999999]], "isOverall": false, "label": "122 /modules/Calendar/fullcalendar/fullcalendar.min.js", "isController": false}, {"data": [[1.52834616E12, 1219.625], [1.5283461E12, 1219.0]], "isOverall": false, "label": "113 /include/SugarCharts/Jit/js/sugarCharts.js", "isController": false}, {"data": [[1.52834622E12, 10130.6]], "isOverall": false, "label": "156 /custom/modules/Leads/LeadValidations.js", "isController": false}, {"data": [[1.52834634E12, 30919.25], [1.52834628E12, 30983.5]], "isOverall": false, "label": "181 /cache/include/javascript/sugar_grp1_jquery.js", "isController": false}, {"data": [[1.52834604E12, 1755.75], [1.52834598E12, 1754.0]], "isOverall": false, "label": "85 /cache/themes/SuiteR/js/style.js", "isController": false}, {"data": [[1.52834646E12, 750.25], [1.5283464E12, 781.5]], "isOverall": false, "label": "218 /include/social/twitter/twitter_feed.js", "isController": false}, {"data": [[1.5283461E12, 8525.3]], "isOverall": false, "label": "106 /index.php", "isController": false}, {"data": [[1.52834616E12, 723.25], [1.5283461E12, 723.5]], "isOverall": false, "label": "117 /include/javascript/jsclass_async.js", "isController": false}, {"data": [[1.52834622E12, 401.125], [1.52834616E12, 401.0]], "isOverall": false, "label": "164 /custom/themes/20reasons/images/jscalendar.gif", "isController": false}, {"data": [[1.52834622E12, 14602.888888888889], [1.52834628E12, 14654.0]], "isOverall": false, "label": "160 /cache/include/javascript/sugar_grp_yui_widgets.js", "isController": false}, {"data": [[1.52834634E12, 1335.1666666666667], [1.5283464E12, 1375.5]], "isOverall": false, "label": "193 /cache/include/javascript/sugar_field_grp.js", "isController": false}, {"data": [[1.52834646E12, 543.875], [1.5283464E12, 544.0]], "isOverall": false, "label": "222 /include/SubPanel/SubPanel.js", "isController": false}, {"data": [[1.52834622E12, 399.0], [1.52834616E12, 398.3333333333333]], "isOverall": false, "label": "131 /custom/themes/SuiteR/images/start_off.gif", "isController": false}, {"data": [[1.52834634E12, 1761.5], [1.52834628E12, 1759.5]], "isOverall": false, "label": "186 /cache/themes/SuiteR/js/style.js", "isController": false}, {"data": [[1.52834622E12, 1354.0], [1.52834616E12, 1352.7142857142856]], "isOverall": false, "label": "141 /include/MySugar/javascript/MySugar.js", "isController": false}, {"data": [[1.52834622E12, 633.875], [1.52834628E12, 600.0]], "isOverall": false, "label": "165 /custom/themes/20reasons/images/jscalendar.gif", "isController": false}, {"data": [[1.52834622E12, 653.0], [1.52834628E12, 653.25]], "isOverall": false, "label": "179 /themes/SuiteR/css/footable.core.css", "isController": false}, {"data": [[1.52834646E12, 563.2857142857142], [1.5283464E12, 552.0]], "isOverall": false, "label": "211 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.52834622E12, 401.25], [1.52834628E12, 401.3333333333333]], "isOverall": false, "label": "172 /MasterData/pinCodeMasterData.php", "isController": false}, {"data": [[1.52834634E12, 1918.0], [1.5283464E12, 1860.8]], "isOverall": false, "label": "192 /themes/SuiteR/js/jscolor.js", "isController": false}, {"data": [[1.52834646E12, 573.0], [1.5283464E12, 573.0]], "isOverall": false, "label": "212 /modules/Leads/Lead.js", "isController": false}, {"data": [[1.52834634E12, 1080.5], [1.5283464E12, 1081.3333333333335]], "isOverall": false, "label": "197 /include/javascript/jquery/themes/base/jquery-ui.structure.min.css", "isController": false}, {"data": [[1.52834598E12, 9313.125], [1.52834592E12, 436.5]], "isOverall": false, "label": "77 /success.txt", "isController": false}, {"data": [[1.52834622E12, 398.5], [1.52834616E12, 398.0]], "isOverall": false, "label": "147 /custom/themes/SuiteR/images/next.gif", "isController": false}, {"data": [[1.5283461E12, 400.2]], "isOverall": false, "label": "109 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.5283461E12, 1057.1000000000001]], "isOverall": false, "label": "108 /cache/jsLanguage/Home/en_us.js", "isController": false}, {"data": [[1.52834616E12, 1806.7499999999998], [1.5283461E12, 1807.5]], "isOverall": false, "label": "118 /modules/Calendar/fullcalendar/fullcalendar.css", "isController": false}, {"data": [[1.52834622E12, 753.125], [1.52834616E12, 713.5]], "isOverall": false, "label": "159 /modules/Leads/Lead.js", "isController": false}, {"data": [[1.52834634E12, 1778.5], [1.5283464E12, 1841.3333333333333]], "isOverall": false, "label": "196 /include/javascript/jquery/themes/base/jquery-ui.min.css", "isController": false}, {"data": [[1.52834634E12, 11448.499999999998], [1.5283464E12, 11452.0]], "isOverall": false, "label": "187 /cache/themes/SuiteR/css/yui.css", "isController": false}, {"data": [[1.52834634E12, 1971.0], [1.5283464E12, 1147.5000000000002]], "isOverall": false, "label": "202 /emailMobileExistLead.php", "isController": false}, {"data": [[1.52834622E12, 1681.0000000000002], [1.52834616E12, 1680.0]], "isOverall": false, "label": "154 /cache/jsLanguage/Leads/en_us.js", "isController": false}, {"data": [[1.52834646E12, 1590.5], [1.5283464E12, 1602.0]], "isOverall": false, "label": "214 /include/InlineEditing/inlineEditing.js", "isController": false}, {"data": [[1.52834616E12, 748.5], [1.5283461E12, 739.5]], "isOverall": false, "label": "125 /include/MySugar/javascript/AddRemoveDashboardPages.js", "isController": false}, {"data": [[1.52834622E12, 398.0], [1.52834616E12, 398.5555555555556]], "isOverall": false, "label": "134 /custom/themes/SuiteR/images/arrow.gif", "isController": false}, {"data": [[1.52834622E12, 637.6666666666666], [1.52834628E12, 640.7142857142858]], "isOverall": false, "label": "174 /promotions.php", "isController": false}, {"data": [[1.52834616E12, 8048.375], [1.5283461E12, 8085.5]], "isOverall": false, "label": "107 /cache/jsLanguage/en_us.js", "isController": false}, {"data": [[1.52834622E12, 399.0], [1.52834616E12, 398.22222222222223]], "isOverall": false, "label": "132 /custom/themes/SuiteR/images/next_off.gif", "isController": false}, {"data": [[1.52834622E12, 1047.5], [1.52834628E12, 1025.625]], "isOverall": false, "label": "184 /include/javascript/calendar.js", "isController": false}, {"data": [[1.52834622E12, 6027.333333333333], [1.52834628E12, 6032.571428571428]], "isOverall": false, "label": "173 /getPromoPlans.php", "isController": false}, {"data": [[1.52834634E12, 1001.875], [1.52834628E12, 978.5]], "isOverall": false, "label": "185 /include/javascript/qtip/jquery.qtip.min.css", "isController": false}, {"data": [[1.52834622E12, 585.1666666666667], [1.52834616E12, 662.0]], "isOverall": false, "label": "150 /success.txt", "isController": false}, {"data": [[1.52834604E12, 26034.6], [1.5283461E12, 26033.2]], "isOverall": false, "label": "82 /cache/include/javascript/sugar_grp1_yui.js", "isController": false}, {"data": [[1.52834622E12, 399.0], [1.52834616E12, 398.66666666666674]], "isOverall": false, "label": "136 /custom/themes/SuiteR/images/arrow_down.gif", "isController": false}, {"data": [[1.52834604E12, 399.0], [1.5283461E12, 398.25]], "isOverall": false, "label": "102 /index.php", "isController": false}, {"data": [[1.52834622E12, 558.375], [1.52834616E12, 579.0]], "isOverall": false, "label": "161 /themes/default/images/create-record.gif", "isController": false}, {"data": [[1.52834598E12, 6005.125], [1.52834592E12, 6006.5]], "isOverall": false, "label": "79 /themes/SuiteR/css/bootstrap.min.css", "isController": false}, {"data": [[1.52834616E12, 14592.5], [1.5283461E12, 14580.5]], "isOverall": false, "label": "110 /cache/include/javascript/sugar_grp_yui_widgets.js", "isController": false}, {"data": [[1.52834616E12, 1893.125], [1.5283461E12, 1889.5]], "isOverall": false, "label": "124 /modules/Calendar/Cal.js", "isController": false}, {"data": [[1.52834604E12, 595.5], [1.5283461E12, 598.75]], "isOverall": false, "label": "99 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.52834646E12, 538.25], [1.5283464E12, 538.5]], "isOverall": false, "label": "219 /include/social/twitter/twitter.js", "isController": false}, {"data": [[1.52834634E12, 1251.5], [1.5283464E12, 1292.75]], "isOverall": false, "label": "204 /emailMobileExistLead.php", "isController": false}, {"data": [[1.52834628E12, 9318.7]], "isOverall": false, "label": "183 /cache/include/javascript/sugar_grp1.js", "isController": false}, {"data": [[1.52834646E12, 580.2857142857143], [1.5283464E12, 579.3333333333334]], "isOverall": false, "label": "215 /modules/Favorites/favorites.js", "isController": false}, {"data": [[1.52834604E12, 9013.0], [1.5283461E12, 9024.25]], "isOverall": false, "label": "105 /index.php", "isController": false}, {"data": [[1.52834622E12, 1228.0], [1.52834616E12, 1228.8749999999998]], "isOverall": false, "label": "135 /themes/SuiteR/fonts/glyphicons-halflings-regular.woff2", "isController": false}, {"data": [[1.52834634E12, 401.5], [1.5283464E12, 401.00000000000006]], "isOverall": false, "label": "200 /custom/themes/SuiteR/images/advanced_search.gif", "isController": false}, {"data": [[1.52834646E12, 21307.0], [1.5283464E12, 21859.833333333332]], "isOverall": false, "label": "209 /index.php", "isController": false}, {"data": [[1.52834634E12, 803.75], [1.5283464E12, 725.0]], "isOverall": false, "label": "195 /modules/Users/login.js", "isController": false}, {"data": [[1.52834634E12, 1307.0], [1.5283464E12, 1314.25]], "isOverall": false, "label": "205 /emailMobileExistLead.php", "isController": false}, {"data": [[1.52834604E12, 1247.0], [1.5283461E12, 1242.0]], "isOverall": false, "label": "97 /include/javascript/jquery/themes/base/jquery-ui.structure.min.css", "isController": false}, {"data": [[1.52834616E12, 3088.5], [1.5283461E12, 3085.5]], "isOverall": false, "label": "121 /modules/Calendar/fullcalendar/lib/moment.min.js", "isController": false}, {"data": [[1.52834622E12, 18231.375000000004], [1.52834616E12, 18410.0]], "isOverall": false, "label": "153 /index.php", "isController": false}, {"data": [[1.52834622E12, 6013.0], [1.52834628E12, 6015.125]], "isOverall": false, "label": "180 /themes/SuiteR/css/bootstrap.min.css", "isController": false}, {"data": [[1.52834634E12, 730.0], [1.5283464E12, 706.25]], "isOverall": false, "label": "203 /custom/themes/default/images/checkLoader.gif", "isController": false}, {"data": [[1.52834622E12, 568.0], [1.52834616E12, 616.5]], "isOverall": false, "label": "151 /index.php", "isController": false}, {"data": [[1.52834634E12, 1382.5], [1.5283464E12, 1320.625]], "isOverall": false, "label": "206 /emailMobileExistLead.php", "isController": false}, {"data": [[1.52834622E12, 399.5], [1.52834616E12, 398.75]], "isOverall": false, "label": "152 /index.php", "isController": false}, {"data": [[1.52834622E12, 663.4], [1.52834628E12, 574.4]], "isOverall": false, "label": "169 /getCategoryProducts.php", "isController": false}, {"data": [[1.52834604E12, 11433.5], [1.52834598E12, 11433.0]], "isOverall": false, "label": "87 /cache/themes/SuiteR/css/yui.css", "isController": false}, {"data": [[1.52834622E12, 562.5], [1.52834616E12, 632.3333333333334]], "isOverall": false, "label": "142 /index.php", "isController": false}, {"data": [[1.52834646E12, 1604.625], [1.5283464E12, 1597.0]], "isOverall": false, "label": "220 /include/SubPanel/SubPanelTiles.js", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.52834646E12, "title": "Response Time Over Time"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Response time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average response time was %y ms"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Response Times Over Time
function refreshResponseTimeOverTime(fixTimestamps) {
    var infos = responseTimesOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 19800000);
    }
    if(isGraph($("#flotResponseTimesOverTime"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesResponseTimesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimesOverTime", "#overviewResponseTimesOverTime");
        $('#footerResponseTimesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var latenciesOverTimeInfos = {
        data: {"result": {"minY": 392.375, "minX": 1.52834592E12, "maxY": 13270.166666666668, "series": [{"data": [[1.52834598E12, 769.625], [1.52834592E12, 771.5]], "isOverall": false, "label": "84 /include/javascript/calendar.js", "isController": false}, {"data": [[1.52834622E12, 776.0], [1.52834616E12, 775.6]], "isOverall": false, "label": "143 /modules/Meetings/jsclass_scheduler.js", "isController": false}, {"data": [[1.52834622E12, 570.0], [1.52834616E12, 581.8888888888889]], "isOverall": false, "label": "133 /custom/themes/SuiteR/images/end_off.gif", "isController": false}, {"data": [[1.52834616E12, 815.75], [1.5283461E12, 772.5]], "isOverall": false, "label": "115 /include/SugarFields/Fields/Datetimecombo/Datetimecombo.js", "isController": false}, {"data": [[1.52834604E12, 931.75], [1.52834598E12, 950.5]], "isOverall": false, "label": "81 /cache/include/javascript/sugar_grp1_jquery.js", "isController": false}, {"data": [[1.52834616E12, 927.125], [1.5283461E12, 946.5]], "isOverall": false, "label": "112 /include/SugarCharts/Jit/js/Jit/jit.js", "isController": false}, {"data": [[1.52834604E12, 772.0], [1.5283461E12, 771.375]], "isOverall": false, "label": "100 /custom/include/images/20reasons_md.png", "isController": false}, {"data": [[1.52834622E12, 399.0], [1.52834616E12, 399.0]], "isOverall": false, "label": "137 /custom/themes/SuiteR/images/calendar_previous.png", "isController": false}, {"data": [[1.52834622E12, 774.0], [1.52834616E12, 773.6666666666666]], "isOverall": false, "label": "123 /modules/Calendar/fullcalendar/lang-all.js", "isController": false}, {"data": [[1.52834622E12, 572.8], [1.52834616E12, 554.0]], "isOverall": false, "label": "146 /custom/themes/SuiteR/images/backtotop.gif", "isController": false}, {"data": [[1.52834622E12, 398.0], [1.52834616E12, 398.44444444444446]], "isOverall": false, "label": "140 /custom/themes/SuiteR/images/end.gif", "isController": false}, {"data": [[1.52834646E12, 540.5], [1.5283464E12, 541.0]], "isOverall": false, "label": "217 /include/social/facebook/facebook.js", "isController": false}, {"data": [[1.52834604E12, 932.5], [1.5283461E12, 931.375]], "isOverall": false, "label": "94 /cache/themes/SuiteR/css/style.css", "isController": false}, {"data": [[1.52834622E12, 533.0], [1.52834616E12, 564.1111111111111]], "isOverall": false, "label": "139 /custom/themes/SuiteR/images/calendar_next.png", "isController": false}, {"data": [[1.52834634E12, 564.0], [1.5283464E12, 567.125]], "isOverall": false, "label": "208 /emailMobileExistLead.php", "isController": false}, {"data": [[1.52834622E12, 401.1666666666667], [1.52834616E12, 401.25]], "isOverall": false, "label": "149 /vcal_server.php", "isController": false}, {"data": [[1.52834646E12, 779.75], [1.5283464E12, 779.5]], "isOverall": false, "label": "213 /custom/modules/Leads/js/Inspection.js", "isController": false}, {"data": [[1.52834616E12, 774.0], [1.5283461E12, 774.0]], "isOverall": false, "label": "120 /include/javascript/qtip/jquery.qtip.min.js", "isController": false}, {"data": [[1.52834616E12, 572.0]], "isOverall": false, "label": "127 /themes/SuiteR/css/dashboardstyle.css", "isController": false}, {"data": [[1.52834634E12, 958.2]], "isOverall": false, "label": "182 /cache/include/javascript/sugar_grp1_yui.js", "isController": false}, {"data": [[1.5283461E12, 700.3]], "isOverall": false, "label": "111 /include/javascript/dashlets.js", "isController": false}, {"data": [[1.52834616E12, 589.5], [1.5283461E12, 581.0]], "isOverall": false, "label": "126 /include/MySugar/javascript/retrievePage.js", "isController": false}, {"data": [[1.52834646E12, 582.4285714285714], [1.5283464E12, 580.6666666666666]], "isOverall": false, "label": "216 /include/social/facebook/facebook_subpanel.js", "isController": false}, {"data": [[1.52834622E12, 562.0], [1.52834628E12, 607.6666666666666]], "isOverall": false, "label": "171 /MasterData/getHAServicePincodelist.php", "isController": false}, {"data": [[1.52834622E12, 763.625], [1.52834616E12, 763.0]], "isOverall": false, "label": "157 /include/SugarFields/Fields/File/SugarFieldFile.js", "isController": false}, {"data": [[1.52834646E12, 945.5714285714286], [1.5283464E12, 953.6666666666666]], "isOverall": false, "label": "210 /index.php", "isController": false}, {"data": [[1.52834622E12, 540.0], [1.52834616E12, 553.3333333333334]], "isOverall": false, "label": "130 /custom/themes/SuiteR/images/previous_off.gif", "isController": false}, {"data": [[1.52834634E12, 950.6666666666666], [1.5283464E12, 1194.5]], "isOverall": false, "label": "189 /cache/themes/SuiteR/css/deprecated.css", "isController": false}, {"data": [[1.52834604E12, 605.625], [1.52834598E12, 606.0]], "isOverall": false, "label": "93 /modules/Users/login.js", "isController": false}, {"data": [[1.52834622E12, 403.5], [1.52834616E12, 403.0]], "isOverall": false, "label": "155 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.52834598E12, 802.8750000000001], [1.52834592E12, 815.0]], "isOverall": false, "label": "80 /themes/SuiteR/css/footable.core.css", "isController": false}, {"data": [[1.52834646E12, 945.625], [1.5283464E12, 930.0]], "isOverall": false, "label": "221 /cache/include/javascript/sugar_grp_jsolait.js", "isController": false}, {"data": [[1.52834604E12, 774.0], [1.5283461E12, 776.0]], "isOverall": false, "label": "95 /include/javascript/jquery/themes/base/jquery-ui.min.css", "isController": false}, {"data": [[1.52834604E12, 703.0], [1.52834598E12, 681.5]], "isOverall": false, "label": "92 /modules/Users/login.css", "isController": false}, {"data": [[1.52834622E12, 401.0], [1.52834628E12, 401.3333333333333]], "isOverall": false, "label": "166 /custom/themes/SuiteR/images/id-ff-clear.png", "isController": false}, {"data": [[1.52834622E12, 557.0], [1.52834628E12, 595.25]], "isOverall": false, "label": "175 /getPromoPlans.php", "isController": false}, {"data": [[1.52834604E12, 770.0], [1.52834598E12, 770.0]], "isOverall": false, "label": "89 /cache/themes/SuiteR/css/deprecated.css", "isController": false}, {"data": [[1.52834604E12, 393.5], [1.5283461E12, 392.375]], "isOverall": false, "label": "104 /custom/themes/SuiteR/images/sugar_icon.ico", "isController": false}, {"data": [[1.52834622E12, 733.5], [1.52834628E12, 794.25]], "isOverall": false, "label": "177 /include/javascript/yui/build/assets/skins/sam/sprite.png", "isController": false}, {"data": [[1.52834634E12, 1203.5], [1.5283464E12, 995.25]], "isOverall": false, "label": "198 /include/javascript/jquery/themes/base/jquery-ui.theme.min.css", "isController": false}, {"data": [[1.52834622E12, 398.0], [1.52834616E12, 398.3333333333333]], "isOverall": false, "label": "129 /custom/themes/SuiteR/images/blank.gif", "isController": false}, {"data": [[1.52834622E12, 772.0], [1.52834616E12, 772.5]], "isOverall": false, "label": "158 /include/SugarFields/Fields/Datetimecombo/Datetimecombo.js", "isController": false}, {"data": [[1.52834604E12, 550.6250000000001], [1.52834598E12, 559.0]], "isOverall": false, "label": "88 /include/javascript/jquery/themes/base/jquery.ui.all.css", "isController": false}, {"data": [[1.52834634E12, 584.6], [1.5283464E12, 579.4]], "isOverall": false, "label": "194 /modules/Users/login.css", "isController": false}, {"data": [[1.52834616E12, 764.625], [1.5283461E12, 676.0]], "isOverall": false, "label": "114 /include/SugarCharts/Jit/js/mySugarCharts.js", "isController": false}, {"data": [[1.52834604E12, 395.5], [1.5283461E12, 395.25]], "isOverall": false, "label": "101 /custom/themes/SuiteR/images/advanced_search.gif", "isController": false}, {"data": [[1.52834598E12, 940.375], [1.52834592E12, 1295.0]], "isOverall": false, "label": "78 /index.php", "isController": false}, {"data": [[1.52834616E12, 911.125], [1.5283461E12, 868.5]], "isOverall": false, "label": "116 /include/javascript/jsclass_base.js", "isController": false}, {"data": [[1.52834622E12, 560.0], [1.52834628E12, 639.875]], "isOverall": false, "label": "178 /index.php", "isController": false}, {"data": [[1.52834598E12, 936.8000000000001]], "isOverall": false, "label": "83 /cache/include/javascript/sugar_grp1.js", "isController": false}, {"data": [[1.52834622E12, 398.25], [1.52834616E12, 398.33333333333337]], "isOverall": false, "label": "144 /custom/themes/SuiteR/images/edit_inline.png", "isController": false}, {"data": [[1.52834604E12, 927.75], [1.52834598E12, 929.5]], "isOverall": false, "label": "91 /themes/SuiteR/js/jscolor.js", "isController": false}, {"data": [[1.52834622E12, 400.8], [1.52834628E12, 400.2]], "isOverall": false, "label": "170 /getCategoryServices.php", "isController": false}, {"data": [[1.52834622E12, 401.6666666666667], [1.52834616E12, 401.25]], "isOverall": false, "label": "148 /index.php", "isController": false}, {"data": [[1.52834598E12, 7978.833333333333], [1.52834592E12, 482.5]], "isOverall": false, "label": "76 /success.txt", "isController": false}, {"data": [[1.52834634E12, 482.0], [1.5283464E12, 404.125]], "isOverall": false, "label": "201 /index.php", "isController": false}, {"data": [[1.52834634E12, 940.0], [1.5283464E12, 914.75]], "isOverall": false, "label": "190 /cache/themes/SuiteR/css/style.css", "isController": false}, {"data": [[1.52834622E12, 399.0], [1.52834616E12, 398.22222222222223]], "isOverall": false, "label": "138 /index.php", "isController": false}, {"data": [[1.52834634E12, 402.2]], "isOverall": false, "label": "191 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.52834604E12, 617.5], [1.5283461E12, 569.125]], "isOverall": false, "label": "103 /custom/themes/SuiteR/images/sugar_icon.ico", "isController": false}, {"data": [[1.52834604E12, 928.5], [1.5283461E12, 948.0]], "isOverall": false, "label": "96 /cache/include/javascript/sugar_field_grp.js", "isController": false}, {"data": [[1.52834622E12, 401.125], [1.52834616E12, 401.5]], "isOverall": false, "label": "163 /custom/themes/SuiteR/images/jscalendar.gif", "isController": false}, {"data": [[1.52834622E12, 401.0], [1.52834628E12, 401.125]], "isOverall": false, "label": "176 /promotions.php", "isController": false}, {"data": [[1.52834604E12, 774.0], [1.5283461E12, 774.2500000000001]], "isOverall": false, "label": "98 /include/javascript/jquery/themes/base/jquery-ui.theme.min.css", "isController": false}, {"data": [[1.52834622E12, 401.57142857142856], [1.52834628E12, 401.3333333333333]], "isOverall": false, "label": "167 /custom/themes/SuiteR/images/id-ff-select.png", "isController": false}, {"data": [[1.52834622E12, 398.2], [1.52834616E12, 398.2]], "isOverall": false, "label": "145 /custom/themes/SuiteR/images/print.gif", "isController": false}, {"data": [[1.52834616E12, 819.125], [1.5283461E12, 803.0]], "isOverall": false, "label": "119 /modules/Calendar/fullcalendar/fullcalendar.print.css", "isController": false}, {"data": [[1.52834622E12, 400.875], [1.52834616E12, 401.0]], "isOverall": false, "label": "162 /custom/themes/SuiteR/images/basic_search.gif", "isController": false}, {"data": [[1.52834634E12, 868.5], [1.5283464E12, 845.875]], "isOverall": false, "label": "199 /custom/include/images/20reasons_md.png", "isController": false}, {"data": [[1.52834604E12, 398.0], [1.52834598E12, 398.0]], "isOverall": false, "label": "90 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.52834616E12, 400.29999999999995]], "isOverall": false, "label": "128 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.52834622E12, 405.8571428571429], [1.52834628E12, 405.3333333333333]], "isOverall": false, "label": "168 /MasterData/product_category_list.json", "isController": false}, {"data": [[1.52834634E12, 650.7999999999998]], "isOverall": false, "label": "188 /include/javascript/jquery/themes/base/jquery.ui.all.css", "isController": false}, {"data": [[1.52834634E12, 402.5], [1.5283464E12, 403.62500000000006]], "isOverall": false, "label": "207 /emailMobileExistLead.php", "isController": false}, {"data": [[1.52834604E12, 919.5], [1.52834598E12, 967.5]], "isOverall": false, "label": "86 /include/javascript/qtip/jquery.qtip.min.css", "isController": false}, {"data": [[1.52834616E12, 929.2999999999998]], "isOverall": false, "label": "122 /modules/Calendar/fullcalendar/fullcalendar.min.js", "isController": false}, {"data": [[1.52834616E12, 774.125], [1.5283461E12, 773.5]], "isOverall": false, "label": "113 /include/SugarCharts/Jit/js/sugarCharts.js", "isController": false}, {"data": [[1.52834622E12, 775.5999999999999]], "isOverall": false, "label": "156 /custom/modules/Leads/LeadValidations.js", "isController": false}, {"data": [[1.52834634E12, 945.125], [1.52834628E12, 998.5]], "isOverall": false, "label": "181 /cache/include/javascript/sugar_grp1_jquery.js", "isController": false}, {"data": [[1.52834604E12, 770.875], [1.52834598E12, 769.0]], "isOverall": false, "label": "85 /cache/themes/SuiteR/js/style.js", "isController": false}, {"data": [[1.52834646E12, 750.25], [1.5283464E12, 781.5]], "isOverall": false, "label": "218 /include/social/twitter/twitter_feed.js", "isController": false}, {"data": [[1.5283461E12, 942.1]], "isOverall": false, "label": "106 /index.php", "isController": false}, {"data": [[1.52834616E12, 723.25], [1.5283461E12, 723.5]], "isOverall": false, "label": "117 /include/javascript/jsclass_async.js", "isController": false}, {"data": [[1.52834622E12, 401.0], [1.52834616E12, 401.0]], "isOverall": false, "label": "164 /custom/themes/20reasons/images/jscalendar.gif", "isController": false}, {"data": [[1.52834622E12, 936.0000000000001], [1.52834628E12, 969.0]], "isOverall": false, "label": "160 /cache/include/javascript/sugar_grp_yui_widgets.js", "isController": false}, {"data": [[1.52834634E12, 776.8333333333334], [1.5283464E12, 817.0]], "isOverall": false, "label": "193 /cache/include/javascript/sugar_field_grp.js", "isController": false}, {"data": [[1.52834646E12, 543.75], [1.5283464E12, 543.5]], "isOverall": false, "label": "222 /include/SubPanel/SubPanel.js", "isController": false}, {"data": [[1.52834622E12, 399.0], [1.52834616E12, 398.3333333333333]], "isOverall": false, "label": "131 /custom/themes/SuiteR/images/start_off.gif", "isController": false}, {"data": [[1.52834634E12, 776.5], [1.52834628E12, 775.0]], "isOverall": false, "label": "186 /cache/themes/SuiteR/js/style.js", "isController": false}, {"data": [[1.52834622E12, 774.6666666666666], [1.52834616E12, 773.4285714285713]], "isOverall": false, "label": "141 /include/MySugar/javascript/MySugar.js", "isController": false}, {"data": [[1.52834622E12, 633.875], [1.52834628E12, 600.0]], "isOverall": false, "label": "165 /custom/themes/20reasons/images/jscalendar.gif", "isController": false}, {"data": [[1.52834622E12, 653.0], [1.52834628E12, 653.25]], "isOverall": false, "label": "179 /themes/SuiteR/css/footable.core.css", "isController": false}, {"data": [[1.52834646E12, 563.2857142857142], [1.5283464E12, 552.0]], "isOverall": false, "label": "211 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.52834622E12, 401.25], [1.52834628E12, 401.3333333333333]], "isOverall": false, "label": "172 /MasterData/pinCodeMasterData.php", "isController": false}, {"data": [[1.52834634E12, 970.8], [1.5283464E12, 913.6]], "isOverall": false, "label": "192 /themes/SuiteR/js/jscolor.js", "isController": false}, {"data": [[1.52834646E12, 573.0], [1.5283464E12, 573.0]], "isOverall": false, "label": "212 /modules/Leads/Lead.js", "isController": false}, {"data": [[1.52834634E12, 780.75], [1.5283464E12, 781.5]], "isOverall": false, "label": "197 /include/javascript/jquery/themes/base/jquery-ui.structure.min.css", "isController": false}, {"data": [[1.52834598E12, 4062.5], [1.52834592E12, 436.5]], "isOverall": false, "label": "77 /success.txt", "isController": false}, {"data": [[1.52834622E12, 398.5], [1.52834616E12, 398.0]], "isOverall": false, "label": "147 /custom/themes/SuiteR/images/next.gif", "isController": false}, {"data": [[1.5283461E12, 400.2]], "isOverall": false, "label": "109 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.5283461E12, 773.7]], "isOverall": false, "label": "108 /cache/jsLanguage/Home/en_us.js", "isController": false}, {"data": [[1.52834616E12, 774.0000000000001], [1.5283461E12, 774.0]], "isOverall": false, "label": "118 /modules/Calendar/fullcalendar/fullcalendar.css", "isController": false}, {"data": [[1.52834622E12, 753.0], [1.52834616E12, 713.5]], "isOverall": false, "label": "159 /modules/Leads/Lead.js", "isController": false}, {"data": [[1.52834634E12, 780.5], [1.5283464E12, 843.6666666666667]], "isOverall": false, "label": "196 /include/javascript/jquery/themes/base/jquery-ui.min.css", "isController": false}, {"data": [[1.52834634E12, 776.875], [1.5283464E12, 777.5]], "isOverall": false, "label": "187 /cache/themes/SuiteR/css/yui.css", "isController": false}, {"data": [[1.52834634E12, 1971.0], [1.5283464E12, 1147.5000000000002]], "isOverall": false, "label": "202 /emailMobileExistLead.php", "isController": false}, {"data": [[1.52834622E12, 932.5], [1.52834616E12, 931.0]], "isOverall": false, "label": "154 /cache/jsLanguage/Leads/en_us.js", "isController": false}, {"data": [[1.52834646E12, 960.8750000000001], [1.5283464E12, 972.5]], "isOverall": false, "label": "214 /include/InlineEditing/inlineEditing.js", "isController": false}, {"data": [[1.52834616E12, 748.5], [1.5283461E12, 739.5]], "isOverall": false, "label": "125 /include/MySugar/javascript/AddRemoveDashboardPages.js", "isController": false}, {"data": [[1.52834622E12, 398.0], [1.52834616E12, 398.44444444444446]], "isOverall": false, "label": "134 /custom/themes/SuiteR/images/arrow.gif", "isController": false}, {"data": [[1.52834622E12, 637.6666666666666], [1.52834628E12, 640.7142857142858]], "isOverall": false, "label": "174 /promotions.php", "isController": false}, {"data": [[1.52834616E12, 893.625], [1.5283461E12, 933.0]], "isOverall": false, "label": "107 /cache/jsLanguage/en_us.js", "isController": false}, {"data": [[1.52834622E12, 399.0], [1.52834616E12, 398.22222222222223]], "isOverall": false, "label": "132 /custom/themes/SuiteR/images/next_off.gif", "isController": false}, {"data": [[1.52834622E12, 965.5], [1.52834628E12, 943.5000000000001]], "isOverall": false, "label": "184 /include/javascript/calendar.js", "isController": false}, {"data": [[1.52834622E12, 780.0], [1.52834628E12, 780.8571428571429]], "isOverall": false, "label": "173 /getPromoPlans.php", "isController": false}, {"data": [[1.52834634E12, 961.625], [1.52834628E12, 938.0]], "isOverall": false, "label": "185 /include/javascript/qtip/jquery.qtip.min.css", "isController": false}, {"data": [[1.52834622E12, 585.1666666666667], [1.52834616E12, 662.0]], "isOverall": false, "label": "150 /success.txt", "isController": false}, {"data": [[1.52834604E12, 771.6], [1.5283461E12, 771.2]], "isOverall": false, "label": "82 /cache/include/javascript/sugar_grp1_yui.js", "isController": false}, {"data": [[1.52834622E12, 399.0], [1.52834616E12, 398.66666666666674]], "isOverall": false, "label": "136 /custom/themes/SuiteR/images/arrow_down.gif", "isController": false}, {"data": [[1.52834604E12, 398.5], [1.5283461E12, 398.25]], "isOverall": false, "label": "102 /index.php", "isController": false}, {"data": [[1.52834622E12, 558.375], [1.52834616E12, 579.0]], "isOverall": false, "label": "161 /themes/default/images/create-record.gif", "isController": false}, {"data": [[1.52834598E12, 774.1249999999999], [1.52834592E12, 775.5]], "isOverall": false, "label": "79 /themes/SuiteR/css/bootstrap.min.css", "isController": false}, {"data": [[1.52834616E12, 933.25], [1.5283461E12, 926.0]], "isOverall": false, "label": "110 /cache/include/javascript/sugar_grp_yui_widgets.js", "isController": false}, {"data": [[1.52834616E12, 776.625], [1.5283461E12, 773.0]], "isOverall": false, "label": "124 /modules/Calendar/Cal.js", "isController": false}, {"data": [[1.52834604E12, 595.5], [1.5283461E12, 598.75]], "isOverall": false, "label": "99 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.52834646E12, 538.25], [1.5283464E12, 538.5]], "isOverall": false, "label": "219 /include/social/twitter/twitter.js", "isController": false}, {"data": [[1.52834634E12, 1251.5], [1.5283464E12, 1292.75]], "isOverall": false, "label": "204 /emailMobileExistLead.php", "isController": false}, {"data": [[1.52834628E12, 972.1999999999999]], "isOverall": false, "label": "183 /cache/include/javascript/sugar_grp1.js", "isController": false}, {"data": [[1.52834646E12, 580.2857142857143], [1.5283464E12, 579.3333333333334]], "isOverall": false, "label": "215 /modules/Favorites/favorites.js", "isController": false}, {"data": [[1.52834604E12, 655.0], [1.5283461E12, 665.3749999999999]], "isOverall": false, "label": "105 /index.php", "isController": false}, {"data": [[1.52834622E12, 778.0], [1.52834616E12, 779.125]], "isOverall": false, "label": "135 /themes/SuiteR/fonts/glyphicons-halflings-regular.woff2", "isController": false}, {"data": [[1.52834634E12, 401.5], [1.5283464E12, 401.00000000000006]], "isOverall": false, "label": "200 /custom/themes/SuiteR/images/advanced_search.gif", "isController": false}, {"data": [[1.52834646E12, 12757.5], [1.5283464E12, 13270.166666666668]], "isOverall": false, "label": "209 /index.php", "isController": false}, {"data": [[1.52834634E12, 803.5], [1.5283464E12, 725.0]], "isOverall": false, "label": "195 /modules/Users/login.js", "isController": false}, {"data": [[1.52834634E12, 1307.0], [1.5283464E12, 1314.125]], "isOverall": false, "label": "205 /emailMobileExistLead.php", "isController": false}, {"data": [[1.52834604E12, 946.5], [1.5283461E12, 941.75]], "isOverall": false, "label": "97 /include/javascript/jquery/themes/base/jquery-ui.structure.min.css", "isController": false}, {"data": [[1.52834616E12, 774.5], [1.5283461E12, 775.0]], "isOverall": false, "label": "121 /modules/Calendar/fullcalendar/lib/moment.min.js", "isController": false}, {"data": [[1.52834622E12, 940.5], [1.52834616E12, 1117.0]], "isOverall": false, "label": "153 /index.php", "isController": false}, {"data": [[1.52834622E12, 779.5], [1.52834628E12, 780.0]], "isOverall": false, "label": "180 /themes/SuiteR/css/bootstrap.min.css", "isController": false}, {"data": [[1.52834634E12, 730.0], [1.5283464E12, 706.25]], "isOverall": false, "label": "203 /custom/themes/default/images/checkLoader.gif", "isController": false}, {"data": [[1.52834622E12, 568.0], [1.52834616E12, 616.5]], "isOverall": false, "label": "151 /index.php", "isController": false}, {"data": [[1.52834634E12, 1382.5], [1.5283464E12, 1320.625]], "isOverall": false, "label": "206 /emailMobileExistLead.php", "isController": false}, {"data": [[1.52834622E12, 399.5], [1.52834616E12, 398.75]], "isOverall": false, "label": "152 /index.php", "isController": false}, {"data": [[1.52834622E12, 663.4], [1.52834628E12, 574.2]], "isOverall": false, "label": "169 /getCategoryProducts.php", "isController": false}, {"data": [[1.52834604E12, 771.0], [1.52834598E12, 771.0]], "isOverall": false, "label": "87 /cache/themes/SuiteR/css/yui.css", "isController": false}, {"data": [[1.52834622E12, 562.5], [1.52834616E12, 632.3333333333334]], "isOverall": false, "label": "142 /index.php", "isController": false}, {"data": [[1.52834646E12, 941.25], [1.5283464E12, 933.5]], "isOverall": false, "label": "220 /include/SubPanel/SubPanelTiles.js", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.52834646E12, "title": "Latencies Over Time"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Response latencies in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendLatenciesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average latency was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesLatenciesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotLatenciesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewLatenciesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Latencies Over Time
function refreshLatenciesOverTime(fixTimestamps) {
    var infos = latenciesOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 19800000);
    }
    if(isGraph($("#flotLatenciesOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesLatenciesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotLatenciesOverTime", "#overviewLatenciesOverTime");
        $('#footerLatenciesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var connectTimeOverTimeInfos = {
        data: {"result": {"minY": 0.0, "minX": 1.52834592E12, "maxY": 8970.125, "series": [{"data": [[1.52834598E12, 0.0], [1.52834592E12, 0.0]], "isOverall": false, "label": "84 /include/javascript/calendar.js", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "143 /modules/Meetings/jsclass_scheduler.js", "isController": false}, {"data": [[1.52834622E12, 172.0], [1.52834616E12, 184.2222222222222]], "isOverall": false, "label": "133 /custom/themes/SuiteR/images/end_off.gif", "isController": false}, {"data": [[1.52834616E12, 43.75], [1.5283461E12, 0.0]], "isOverall": false, "label": "115 /include/SugarFields/Fields/Datetimecombo/Datetimecombo.js", "isController": false}, {"data": [[1.52834604E12, 160.5], [1.52834598E12, 178.5]], "isOverall": false, "label": "81 /cache/include/javascript/sugar_grp1_jquery.js", "isController": false}, {"data": [[1.52834616E12, 153.25], [1.5283461E12, 173.0]], "isOverall": false, "label": "112 /include/SugarCharts/Jit/js/Jit/jit.js", "isController": false}, {"data": [[1.52834604E12, 0.0], [1.5283461E12, 0.0]], "isOverall": false, "label": "100 /custom/include/images/20reasons_md.png", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "137 /custom/themes/SuiteR/images/calendar_previous.png", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "123 /modules/Calendar/fullcalendar/lang-all.js", "isController": false}, {"data": [[1.52834622E12, 174.6], [1.52834616E12, 156.2]], "isOverall": false, "label": "146 /custom/themes/SuiteR/images/backtotop.gif", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "140 /custom/themes/SuiteR/images/end.gif", "isController": false}, {"data": [[1.52834646E12, 0.0], [1.5283464E12, 0.0]], "isOverall": false, "label": "217 /include/social/facebook/facebook.js", "isController": false}, {"data": [[1.52834604E12, 160.5], [1.5283461E12, 160.375]], "isOverall": false, "label": "94 /cache/themes/SuiteR/css/style.css", "isController": false}, {"data": [[1.52834622E12, 135.0], [1.52834616E12, 166.11111111111111]], "isOverall": false, "label": "139 /custom/themes/SuiteR/images/calendar_next.png", "isController": false}, {"data": [[1.52834634E12, 162.5], [1.5283464E12, 165.0]], "isOverall": false, "label": "208 /emailMobileExistLead.php", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "149 /vcal_server.php", "isController": false}, {"data": [[1.52834646E12, 0.0], [1.5283464E12, 0.0]], "isOverall": false, "label": "213 /custom/modules/Leads/js/Inspection.js", "isController": false}, {"data": [[1.52834616E12, 0.0], [1.5283461E12, 0.0]], "isOverall": false, "label": "120 /include/javascript/qtip/jquery.qtip.min.js", "isController": false}, {"data": [[1.52834616E12, 170.6]], "isOverall": false, "label": "127 /themes/SuiteR/css/dashboardstyle.css", "isController": false}, {"data": [[1.52834634E12, 181.9]], "isOverall": false, "label": "182 /cache/include/javascript/sugar_grp1_yui.js", "isController": false}, {"data": [[1.5283461E12, 161.29999999999998]], "isOverall": false, "label": "111 /include/javascript/dashlets.js", "isController": false}, {"data": [[1.52834616E12, 189.25], [1.5283461E12, 180.0]], "isOverall": false, "label": "126 /include/MySugar/javascript/retrievePage.js", "isController": false}, {"data": [[1.52834646E12, 0.0], [1.5283464E12, 0.0]], "isOverall": false, "label": "216 /include/social/facebook/facebook_subpanel.js", "isController": false}, {"data": [[1.52834622E12, 159.25], [1.52834628E12, 204.66666666666669]], "isOverall": false, "label": "171 /MasterData/getHAServicePincodelist.php", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "157 /include/SugarFields/Fields/File/SugarFieldFile.js", "isController": false}, {"data": [[1.52834646E12, 160.28571428571428], [1.5283464E12, 167.33333333333334]], "isOverall": false, "label": "210 /index.php", "isController": false}, {"data": [[1.52834622E12, 142.0], [1.52834616E12, 155.11111111111111]], "isOverall": false, "label": "130 /custom/themes/SuiteR/images/previous_off.gif", "isController": false}, {"data": [[1.52834634E12, 174.33333333333331], [1.5283464E12, 417.75]], "isOverall": false, "label": "189 /cache/themes/SuiteR/css/deprecated.css", "isController": false}, {"data": [[1.52834604E12, 0.0], [1.52834598E12, 0.0]], "isOverall": false, "label": "93 /modules/Users/login.js", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "155 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.52834598E12, 156.00000000000003], [1.52834592E12, 165.0]], "isOverall": false, "label": "80 /themes/SuiteR/css/footable.core.css", "isController": false}, {"data": [[1.52834646E12, 165.375], [1.5283464E12, 149.0]], "isOverall": false, "label": "221 /cache/include/javascript/sugar_grp_jsolait.js", "isController": false}, {"data": [[1.52834604E12, 0.0], [1.5283461E12, 0.0]], "isOverall": false, "label": "95 /include/javascript/jquery/themes/base/jquery-ui.min.css", "isController": false}, {"data": [[1.52834604E12, 164.00000000000003], [1.52834598E12, 142.5]], "isOverall": false, "label": "92 /modules/Users/login.css", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834628E12, 0.0]], "isOverall": false, "label": "166 /custom/themes/SuiteR/images/id-ff-clear.png", "isController": false}, {"data": [[1.52834622E12, 154.0], [1.52834628E12, 191.25]], "isOverall": false, "label": "175 /getPromoPlans.php", "isController": false}, {"data": [[1.52834604E12, 0.0], [1.52834598E12, 0.0]], "isOverall": false, "label": "89 /cache/themes/SuiteR/css/deprecated.css", "isController": false}, {"data": [[1.52834604E12, 0.0], [1.5283461E12, 0.0]], "isOverall": false, "label": "104 /custom/themes/SuiteR/images/sugar_icon.ico", "isController": false}, {"data": [[1.52834622E12, 160.0], [1.52834628E12, 219.0]], "isOverall": false, "label": "177 /include/javascript/yui/build/assets/skins/sam/sprite.png", "isController": false}, {"data": [[1.52834634E12, 422.5], [1.5283464E12, 214.375]], "isOverall": false, "label": "198 /include/javascript/jquery/themes/base/jquery-ui.theme.min.css", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "129 /custom/themes/SuiteR/images/blank.gif", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "158 /include/SugarFields/Fields/Datetimecombo/Datetimecombo.js", "isController": false}, {"data": [[1.52834604E12, 152.37500000000003], [1.52834598E12, 160.5]], "isOverall": false, "label": "88 /include/javascript/jquery/themes/base/jquery.ui.all.css", "isController": false}, {"data": [[1.52834634E12, 40.0], [1.5283464E12, 33.4]], "isOverall": false, "label": "194 /modules/Users/login.css", "isController": false}, {"data": [[1.52834616E12, 227.75], [1.5283461E12, 139.5]], "isOverall": false, "label": "114 /include/SugarCharts/Jit/js/mySugarCharts.js", "isController": false}, {"data": [[1.52834604E12, 0.0], [1.5283461E12, 0.0]], "isOverall": false, "label": "101 /custom/themes/SuiteR/images/advanced_search.gif", "isController": false}, {"data": [[1.52834598E12, 172.875], [1.52834592E12, 512.5]], "isOverall": false, "label": "78 /index.php", "isController": false}, {"data": [[1.52834616E12, 188.875], [1.5283461E12, 148.0]], "isOverall": false, "label": "116 /include/javascript/jsclass_base.js", "isController": false}, {"data": [[1.52834622E12, 161.0], [1.52834628E12, 239.37499999999997]], "isOverall": false, "label": "178 /index.php", "isController": false}, {"data": [[1.52834598E12, 165.9]], "isOverall": false, "label": "83 /cache/include/javascript/sugar_grp1.js", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "144 /custom/themes/SuiteR/images/edit_inline.png", "isController": false}, {"data": [[1.52834604E12, 158.5], [1.52834598E12, 160.0]], "isOverall": false, "label": "91 /themes/SuiteR/js/jscolor.js", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834628E12, 0.0]], "isOverall": false, "label": "170 /getCategoryServices.php", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "148 /index.php", "isController": false}, {"data": [[1.52834598E12, 7586.0], [1.52834592E12, 78.5]], "isOverall": false, "label": "76 /success.txt", "isController": false}, {"data": [[1.52834634E12, 78.5], [1.5283464E12, 0.0]], "isOverall": false, "label": "201 /index.php", "isController": false}, {"data": [[1.52834634E12, 161.0], [1.5283464E12, 137.375]], "isOverall": false, "label": "190 /cache/themes/SuiteR/css/style.css", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "138 /index.php", "isController": false}, {"data": [[1.52834634E12, 0.0]], "isOverall": false, "label": "191 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.52834604E12, 223.5], [1.5283461E12, 175.0]], "isOverall": false, "label": "103 /custom/themes/SuiteR/images/sugar_icon.ico", "isController": false}, {"data": [[1.52834604E12, 158.0], [1.5283461E12, 177.5]], "isOverall": false, "label": "96 /cache/include/javascript/sugar_field_grp.js", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "163 /custom/themes/SuiteR/images/jscalendar.gif", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834628E12, 0.0]], "isOverall": false, "label": "176 /promotions.php", "isController": false}, {"data": [[1.52834604E12, 0.0], [1.5283461E12, 0.0]], "isOverall": false, "label": "98 /include/javascript/jquery/themes/base/jquery-ui.theme.min.css", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834628E12, 0.0]], "isOverall": false, "label": "167 /custom/themes/SuiteR/images/id-ff-select.png", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "145 /custom/themes/SuiteR/images/print.gif", "isController": false}, {"data": [[1.52834616E12, 165.625], [1.5283461E12, 149.0]], "isOverall": false, "label": "119 /modules/Calendar/fullcalendar/fullcalendar.print.css", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "162 /custom/themes/SuiteR/images/basic_search.gif", "isController": false}, {"data": [[1.52834634E12, 90.0], [1.5283464E12, 67.375]], "isOverall": false, "label": "199 /custom/include/images/20reasons_md.png", "isController": false}, {"data": [[1.52834604E12, 0.0], [1.52834598E12, 0.0]], "isOverall": false, "label": "90 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.52834616E12, 0.0]], "isOverall": false, "label": "128 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834628E12, 0.0]], "isOverall": false, "label": "168 /MasterData/product_category_list.json", "isController": false}, {"data": [[1.52834634E12, 248.09999999999994]], "isOverall": false, "label": "188 /include/javascript/jquery/themes/base/jquery.ui.all.css", "isController": false}, {"data": [[1.52834634E12, 0.0], [1.5283464E12, 0.0]], "isOverall": false, "label": "207 /emailMobileExistLead.php", "isController": false}, {"data": [[1.52834604E12, 147.5], [1.52834598E12, 195.0]], "isOverall": false, "label": "86 /include/javascript/qtip/jquery.qtip.min.css", "isController": false}, {"data": [[1.52834616E12, 154.39999999999998]], "isOverall": false, "label": "122 /modules/Calendar/fullcalendar/fullcalendar.min.js", "isController": false}, {"data": [[1.52834616E12, 0.0], [1.5283461E12, 0.0]], "isOverall": false, "label": "113 /include/SugarCharts/Jit/js/sugarCharts.js", "isController": false}, {"data": [[1.52834622E12, 0.0]], "isOverall": false, "label": "156 /custom/modules/Leads/LeadValidations.js", "isController": false}, {"data": [[1.52834634E12, 168.37499999999997], [1.52834628E12, 221.5]], "isOverall": false, "label": "181 /cache/include/javascript/sugar_grp1_jquery.js", "isController": false}, {"data": [[1.52834604E12, 0.0], [1.52834598E12, 0.0]], "isOverall": false, "label": "85 /cache/themes/SuiteR/js/style.js", "isController": false}, {"data": [[1.52834646E12, 168.87499999999997], [1.5283464E12, 199.5]], "isOverall": false, "label": "218 /include/social/twitter/twitter_feed.js", "isController": false}, {"data": [[1.5283461E12, 164.8]], "isOverall": false, "label": "106 /index.php", "isController": false}, {"data": [[1.52834616E12, 0.0], [1.5283461E12, 0.0]], "isOverall": false, "label": "117 /include/javascript/jsclass_async.js", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "164 /custom/themes/20reasons/images/jscalendar.gif", "isController": false}, {"data": [[1.52834622E12, 157.22222222222226], [1.52834628E12, 188.0]], "isOverall": false, "label": "160 /cache/include/javascript/sugar_grp_yui_widgets.js", "isController": false}, {"data": [[1.52834634E12, 0.0], [1.5283464E12, 39.5]], "isOverall": false, "label": "193 /cache/include/javascript/sugar_field_grp.js", "isController": false}, {"data": [[1.52834646E12, 0.0], [1.5283464E12, 0.0]], "isOverall": false, "label": "222 /include/SubPanel/SubPanel.js", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "131 /custom/themes/SuiteR/images/start_off.gif", "isController": false}, {"data": [[1.52834634E12, 0.0], [1.52834628E12, 0.0]], "isOverall": false, "label": "186 /cache/themes/SuiteR/js/style.js", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "141 /include/MySugar/javascript/MySugar.js", "isController": false}, {"data": [[1.52834622E12, 230.5], [1.52834628E12, 197.0]], "isOverall": false, "label": "165 /custom/themes/20reasons/images/jscalendar.gif", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834628E12, 0.0]], "isOverall": false, "label": "179 /themes/SuiteR/css/footable.core.css", "isController": false}, {"data": [[1.52834646E12, 157.0], [1.5283464E12, 146.0]], "isOverall": false, "label": "211 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834628E12, 0.0]], "isOverall": false, "label": "172 /MasterData/pinCodeMasterData.php", "isController": false}, {"data": [[1.52834634E12, 194.4], [1.5283464E12, 137.2]], "isOverall": false, "label": "192 /themes/SuiteR/js/jscolor.js", "isController": false}, {"data": [[1.52834646E12, 0.0], [1.5283464E12, 0.0]], "isOverall": false, "label": "212 /modules/Leads/Lead.js", "isController": false}, {"data": [[1.52834634E12, 0.0], [1.5283464E12, 0.0]], "isOverall": false, "label": "197 /include/javascript/jquery/themes/base/jquery-ui.structure.min.css", "isController": false}, {"data": [[1.52834598E12, 8970.125], [1.52834592E12, 44.5]], "isOverall": false, "label": "77 /success.txt", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "147 /custom/themes/SuiteR/images/next.gif", "isController": false}, {"data": [[1.5283461E12, 0.0]], "isOverall": false, "label": "109 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.5283461E12, 0.0]], "isOverall": false, "label": "108 /cache/jsLanguage/Home/en_us.js", "isController": false}, {"data": [[1.52834616E12, 0.0], [1.5283461E12, 0.0]], "isOverall": false, "label": "118 /modules/Calendar/fullcalendar/fullcalendar.css", "isController": false}, {"data": [[1.52834622E12, 182.375], [1.52834616E12, 143.0]], "isOverall": false, "label": "159 /modules/Leads/Lead.js", "isController": false}, {"data": [[1.52834634E12, 0.0], [1.5283464E12, 62.833333333333336]], "isOverall": false, "label": "196 /include/javascript/jquery/themes/base/jquery-ui.min.css", "isController": false}, {"data": [[1.52834634E12, 0.0], [1.5283464E12, 0.0]], "isOverall": false, "label": "187 /cache/themes/SuiteR/css/yui.css", "isController": false}, {"data": [[1.52834634E12, 0.0], [1.5283464E12, 0.0]], "isOverall": false, "label": "202 /emailMobileExistLead.php", "isController": false}, {"data": [[1.52834622E12, 157.625], [1.52834616E12, 155.5]], "isOverall": false, "label": "154 /cache/jsLanguage/Leads/en_us.js", "isController": false}, {"data": [[1.52834646E12, 178.625], [1.5283464E12, 191.0]], "isOverall": false, "label": "214 /include/InlineEditing/inlineEditing.js", "isController": false}, {"data": [[1.52834616E12, 173.75], [1.5283461E12, 165.5]], "isOverall": false, "label": "125 /include/MySugar/javascript/AddRemoveDashboardPages.js", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "134 /custom/themes/SuiteR/images/arrow.gif", "isController": false}, {"data": [[1.52834622E12, 237.0], [1.52834628E12, 227.0]], "isOverall": false, "label": "174 /promotions.php", "isController": false}, {"data": [[1.52834616E12, 119.75], [1.5283461E12, 158.5]], "isOverall": false, "label": "107 /cache/jsLanguage/en_us.js", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "132 /custom/themes/SuiteR/images/next_off.gif", "isController": false}, {"data": [[1.52834622E12, 189.5], [1.52834628E12, 167.875]], "isOverall": false, "label": "184 /include/javascript/calendar.js", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834628E12, 0.0]], "isOverall": false, "label": "173 /getPromoPlans.php", "isController": false}, {"data": [[1.52834634E12, 183.375], [1.52834628E12, 160.5]], "isOverall": false, "label": "185 /include/javascript/qtip/jquery.qtip.min.css", "isController": false}, {"data": [[1.52834622E12, 193.66666666666666], [1.52834616E12, 270.75]], "isOverall": false, "label": "150 /success.txt", "isController": false}, {"data": [[1.52834604E12, 0.0], [1.5283461E12, 0.0]], "isOverall": false, "label": "82 /cache/include/javascript/sugar_grp1_yui.js", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "136 /custom/themes/SuiteR/images/arrow_down.gif", "isController": false}, {"data": [[1.52834604E12, 0.0], [1.5283461E12, 0.0]], "isOverall": false, "label": "102 /index.php", "isController": false}, {"data": [[1.52834622E12, 158.25], [1.52834616E12, 179.5]], "isOverall": false, "label": "161 /themes/default/images/create-record.gif", "isController": false}, {"data": [[1.52834598E12, 0.0], [1.52834592E12, 0.0]], "isOverall": false, "label": "79 /themes/SuiteR/css/bootstrap.min.css", "isController": false}, {"data": [[1.52834616E12, 158.5], [1.5283461E12, 151.16666666666666]], "isOverall": false, "label": "110 /cache/include/javascript/sugar_grp_yui_widgets.js", "isController": false}, {"data": [[1.52834616E12, 0.0], [1.5283461E12, 0.0]], "isOverall": false, "label": "124 /modules/Calendar/Cal.js", "isController": false}, {"data": [[1.52834604E12, 196.5], [1.5283461E12, 200.75]], "isOverall": false, "label": "99 /themes/SuiteR/css/colourSelector.php", "isController": false}, {"data": [[1.52834646E12, 0.0], [1.5283464E12, 0.0]], "isOverall": false, "label": "219 /include/social/twitter/twitter.js", "isController": false}, {"data": [[1.52834634E12, 88.0], [1.5283464E12, 0.0]], "isOverall": false, "label": "204 /emailMobileExistLead.php", "isController": false}, {"data": [[1.52834628E12, 195.10000000000002]], "isOverall": false, "label": "183 /cache/include/javascript/sugar_grp1.js", "isController": false}, {"data": [[1.52834646E12, 0.0], [1.5283464E12, 0.0]], "isOverall": false, "label": "215 /modules/Favorites/favorites.js", "isController": false}, {"data": [[1.52834604E12, 144.5], [1.5283461E12, 155.125]], "isOverall": false, "label": "105 /index.php", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "135 /themes/SuiteR/fonts/glyphicons-halflings-regular.woff2", "isController": false}, {"data": [[1.52834634E12, 0.0], [1.5283464E12, 0.0]], "isOverall": false, "label": "200 /custom/themes/SuiteR/images/advanced_search.gif", "isController": false}, {"data": [[1.52834646E12, 173.25], [1.5283464E12, 190.5]], "isOverall": false, "label": "209 /index.php", "isController": false}, {"data": [[1.52834634E12, 193.25], [1.5283464E12, 114.0]], "isOverall": false, "label": "195 /modules/Users/login.js", "isController": false}, {"data": [[1.52834634E12, 185.0], [1.5283464E12, 170.0]], "isOverall": false, "label": "205 /emailMobileExistLead.php", "isController": false}, {"data": [[1.52834604E12, 172.5], [1.5283461E12, 167.875]], "isOverall": false, "label": "97 /include/javascript/jquery/themes/base/jquery-ui.structure.min.css", "isController": false}, {"data": [[1.52834616E12, 0.0], [1.5283461E12, 0.0]], "isOverall": false, "label": "121 /modules/Calendar/fullcalendar/lib/moment.min.js", "isController": false}, {"data": [[1.52834622E12, 161.62499999999997], [1.52834616E12, 338.0]], "isOverall": false, "label": "153 /index.php", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834628E12, 0.0]], "isOverall": false, "label": "180 /themes/SuiteR/css/bootstrap.min.css", "isController": false}, {"data": [[1.52834634E12, 181.5], [1.5283464E12, 157.25]], "isOverall": false, "label": "203 /custom/themes/default/images/checkLoader.gif", "isController": false}, {"data": [[1.52834622E12, 170.0], [1.52834616E12, 218.25]], "isOverall": false, "label": "151 /index.php", "isController": false}, {"data": [[1.52834634E12, 165.5], [1.5283464E12, 194.75]], "isOverall": false, "label": "206 /emailMobileExistLead.php", "isController": false}, {"data": [[1.52834622E12, 0.0], [1.52834616E12, 0.0]], "isOverall": false, "label": "152 /index.php", "isController": false}, {"data": [[1.52834622E12, 263.2], [1.52834628E12, 174.6]], "isOverall": false, "label": "169 /getCategoryProducts.php", "isController": false}, {"data": [[1.52834604E12, 0.0], [1.52834598E12, 0.0]], "isOverall": false, "label": "87 /cache/themes/SuiteR/css/yui.css", "isController": false}, {"data": [[1.52834622E12, 161.25], [1.52834616E12, 231.5]], "isOverall": false, "label": "142 /index.php", "isController": false}, {"data": [[1.52834646E12, 161.125], [1.5283464E12, 153.5]], "isOverall": false, "label": "220 /include/SubPanel/SubPanelTiles.js", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.52834646E12, "title": "Connect Time Over Time"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getConnectTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average Connect Time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendConnectTimeOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average connect time was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesConnectTimeOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotConnectTimeOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewConnectTimeOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Connect Time Over Time
function refreshConnectTimeOverTime(fixTimestamps) {
    var infos = connectTimeOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 19800000);
    }
    if(isGraph($("#flotConnectTimeOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesConnectTimeOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotConnectTimeOverTime", "#overviewConnectTimeOverTime");
        $('#footerConnectTimeOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var responseTimePercentilesOverTimeInfos = {
        data: {"result": {"minY": 391.0, "minX": 1.52834592E12, "maxY": 31006.0, "series": [{"data": [[1.52834622E12, 18315.0], [1.52834604E12, 30904.0], [1.52834634E12, 30964.0], [1.52834616E12, 18604.0], [1.52834598E12, 30919.0], [1.52834646E12, 21918.0], [1.52834628E12, 31006.0], [1.5283461E12, 26038.0], [1.52834592E12, 6008.0], [1.5283464E12, 22872.0]], "isOverall": false, "label": "Max", "isController": false}, {"data": [[1.52834622E12, 398.0], [1.52834604E12, 392.0], [1.52834634E12, 401.0], [1.52834616E12, 397.0], [1.52834598E12, 398.0], [1.52834646E12, 537.0], [1.52834628E12, 399.0], [1.5283461E12, 391.0], [1.52834592E12, 423.0], [1.5283464E12, 400.0]], "isOverall": false, "label": "Min", "isController": false}, {"data": [[1.52834622E12, 9288.2], [1.52834604E12, 13348.5], [1.52834634E12, 10131.0], [1.52834616E12, 9268.6], [1.52834598E12, 9302.0], [1.52834646E12, 9316.0], [1.52834628E12, 9283.8], [1.5283461E12, 13358.4], [1.52834592E12, 6006.5], [1.5283464E12, 10130.3]], "isOverall": false, "label": "90th percentile", "isController": false}, {"data": [[1.52834622E12, 30860.88], [1.52834604E12, 30904.15], [1.52834634E12, 30899.0], [1.52834616E12, 30882.86], [1.52834598E12, 30919.0], [1.52834646E12, 30888.9], [1.52834628E12, 30866.8], [1.5283461E12, 30899.52], [1.52834592E12, 6008.0], [1.5283464E12, 30892.65]], "isOverall": false, "label": "99th percentile", "isController": false}, {"data": [[1.52834622E12, 14575.4], [1.52834604E12, 30860.1], [1.52834634E12, 14613.4], [1.52834616E12, 14342.799999999985], [1.52834598E12, 22926.5], [1.52834646E12, 14591.5], [1.52834628E12, 14568.4], [1.5283461E12, 26032.3], [1.52834592E12, 6008.0], [1.5283464E12, 14600.949999999999]], "isOverall": false, "label": "95th percentile", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.52834646E12, "title": "Response Time Percentiles Over Time (successful requests only)"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true,
                        fill: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Response Time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimePercentilesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Response time was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimePercentilesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimePercentilesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimePercentilesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Response Time Percentiles Over Time
function refreshResponseTimePercentilesOverTime(fixTimestamps) {
    var infos = responseTimePercentilesOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 19800000);
    }
    if(isGraph($("#flotResponseTimePercentilesOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesResponseTimePercentilesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimePercentilesOverTime", "#overviewResponseTimePercentilesOverTime");
        $('#footerResponseTimePercentilesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var responseTimeVsRequestInfos = {
    data: {"result": {"minY": 548.0, "minX": 14.0, "maxY": 42005.0, "series": [{"data": [[76.0, 1011.0], [175.0, 1057.0], [340.0, 595.0], [171.0, 1099.0], [103.0, 604.0], [109.0, 957.0], [14.0, 815.0], [242.0, 548.0], [120.0, 1008.5]], "isOverall": false, "label": "Successes", "isController": false}, {"data": [[76.0, 42005.0]], "isOverall": false, "label": "Failures", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 340.0, "title": "Response Time Vs Request"}},
    getOptions: function() {
        return {
            series: {
                lines: {
                    show: false
                },
                points: {
                    show: true
                }
            },
            xaxis: {
                axisLabel: "Global number of requests per second",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            yaxis: {
                axisLabel: "Median Response Time (ms)",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            legend: {
                noColumns: 2,
                show: true,
                container: '#legendResponseTimeVsRequest'
            },
            selection: {
                mode: 'xy'
            },
            grid: {
                hoverable: true // IMPORTANT! this is needed for tooltip to work
            },
            tooltip: true,
            tooltipOpts: {
                content: "%s : Median response time at %x req/s was %y ms"
            },
            colors: ["#9ACD32", "#FF6347"]
        };
    },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesResponseTimeVsRequest"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotResponseTimeVsRequest"), dataset, options);
        // setup overview
        $.plot($("#overviewResponseTimeVsRequest"), dataset, prepareOverviewOptions(options));

    }
};

// Response Time vs Request
function refreshResponseTimeVsRequest() {
    var infos = responseTimeVsRequestInfos;
    prepareSeries(infos.data);
    if (isGraph($("#flotResponseTimeVsRequest"))){
        infos.create();
    }else{
        var choiceContainer = $("#choicesResponseTimeVsRequest");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimeVsRequest", "#overviewResponseTimeVsRequest");
        $('#footerResponseRimeVsRequest .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var latenciesVsRequestInfos = {
    data: {"result": {"minY": 0.0, "minX": 14.0, "maxY": 781.0, "series": [{"data": [[76.0, 775.0], [175.0, 772.0], [340.0, 595.0], [171.0, 781.0], [103.0, 604.0], [109.0, 770.0], [14.0, 771.5], [242.0, 548.0], [120.0, 776.0]], "isOverall": false, "label": "Successes", "isController": false}, {"data": [[76.0, 0.0]], "isOverall": false, "label": "Failures", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 340.0, "title": "Latencies Vs Request"}},
    getOptions: function() {
        return{
            series: {
                lines: {
                    show: false
                },
                points: {
                    show: true
                }
            },
            xaxis: {
                axisLabel: "Global number of requests per second",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            yaxis: {
                axisLabel: "Median Latency (ms)",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            legend: { noColumns: 2,show: true, container: '#legendLatencyVsRequest' },
            selection: {
                mode: 'xy'
            },
            grid: {
                hoverable: true // IMPORTANT! this is needed for tooltip to work
            },
            tooltip: true,
            tooltipOpts: {
                content: "%s : Median response time at %x req/s was %y ms"
            },
            colors: ["#9ACD32", "#FF6347"]
        };
    },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesLatencyVsRequest"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotLatenciesVsRequest"), dataset, options);
        // setup overview
        $.plot($("#overviewLatenciesVsRequest"), dataset, prepareOverviewOptions(options));
    }
};

// Latencies vs Request
function refreshLatenciesVsRequest() {
        var infos = latenciesVsRequestInfos;
        prepareSeries(infos.data);
        if(isGraph($("#flotLatenciesVsRequest"))){
            infos.createGraph();
        }else{
            var choiceContainer = $("#choicesLatencyVsRequest");
            createLegend(choiceContainer, infos);
            infos.createGraph();
            setGraphZoomable("#flotLatenciesVsRequest", "#overviewLatenciesVsRequest");
            $('#footerLatenciesVsRequest .legendColorBox > div').each(function(i){
                $(this).clone().prependTo(choiceContainer.find("li").eq(i));
            });
        }
};

var hitsPerSecondInfos = {
        data: {"result": {"minY": 0.31666666666666665, "minX": 1.52834592E12, "maxY": 5.65, "series": [{"data": [[1.52834622E12, 3.9833333333333334], [1.52834604E12, 1.8166666666666667], [1.52834634E12, 1.9833333333333334], [1.52834616E12, 5.65], [1.52834598E12, 1.35], [1.52834646E12, 1.5833333333333333], [1.52834628E12, 2.066666666666667], [1.5283461E12, 2.9166666666666665], [1.52834592E12, 0.31666666666666665], [1.5283464E12, 2.8333333333333335]], "isOverall": false, "label": "hitsPerSecond", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.52834646E12, "title": "Hits Per Second"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of hits / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendHitsPerSecond"
                },
                selection: {
                    mode : 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y.2 hits/sec"
                }
            };
        },
        createGraph: function createGraph() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesHitsPerSecond"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotHitsPerSecond"), dataset, options);
            // setup overview
            $.plot($("#overviewHitsPerSecond"), dataset, prepareOverviewOptions(options));
        }
};

// Hits per second
function refreshHitsPerSecond(fixTimestamps) {
    var infos = hitsPerSecondInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 19800000);
    }
    if (isGraph($("#flotHitsPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesHitsPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotHitsPerSecond", "#overviewHitsPerSecond");
        $('#footerHitsPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var codesPerSecondInfos = {
        data: {"result": {"minY": 0.016666666666666666, "minX": 1.52834592E12, "maxY": 5.666666666666667, "series": [{"data": [[1.52834622E12, 4.033333333333333], [1.52834604E12, 1.8166666666666667], [1.52834634E12, 2.0], [1.52834616E12, 5.666666666666667], [1.52834598E12, 1.25], [1.52834646E12, 1.7166666666666666], [1.52834628E12, 2.0], [1.5283461E12, 2.9166666666666665], [1.52834592E12, 0.23333333333333334], [1.5283464E12, 2.85]], "isOverall": false, "label": "200", "isController": false}, {"data": [[1.52834598E12, 0.016666666666666666]], "isOverall": false, "label": "Non HTTP response code: java.net.ConnectException", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.52834646E12, "title": "Codes Per Second"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of responses/sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendCodesPerSecond"
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "Number of Response Codes %s at %x was %y.2 responses / sec"
                }
            };
        },
    createGraph: function() {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesCodesPerSecond"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotCodesPerSecond"), dataset, options);
        // setup overview
        $.plot($("#overviewCodesPerSecond"), dataset, prepareOverviewOptions(options));
    }
};

// Codes per second
function refreshCodesPerSecond(fixTimestamps) {
    var infos = codesPerSecondInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 19800000);
    }
    if(isGraph($("#flotCodesPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesCodesPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotCodesPerSecond", "#overviewCodesPerSecond");
        $('#footerCodesPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var transactionsPerSecondInfos = {
        data: {"result": {"minY": 0.016666666666666666, "minX": 1.52834592E12, "maxY": 0.16666666666666666, "series": [{"data": [[1.52834598E12, 0.13333333333333333], [1.52834592E12, 0.03333333333333333]], "isOverall": false, "label": "80 /themes/SuiteR/css/footable.core.css-success", "isController": false}, {"data": [[1.52834622E12, 0.08333333333333333], [1.52834616E12, 0.08333333333333333]], "isOverall": false, "label": "143 /modules/Meetings/jsclass_scheduler.js-success", "isController": false}, {"data": [[1.52834634E12, 0.03333333333333333], [1.5283464E12, 0.13333333333333333]], "isOverall": false, "label": "190 /cache/themes/SuiteR/css/style.css-success", "isController": false}, {"data": [[1.52834622E12, 0.13333333333333333], [1.52834616E12, 0.03333333333333333]], "isOverall": false, "label": "157 /include/SugarFields/Fields/File/SugarFieldFile.js-success", "isController": false}, {"data": [[1.52834622E12, 0.08333333333333333], [1.52834628E12, 0.08333333333333333]], "isOverall": false, "label": "169 /getCategoryProducts.php-success", "isController": false}, {"data": [[1.52834622E12, 0.13333333333333333], [1.52834616E12, 0.03333333333333333]], "isOverall": false, "label": "155 /themes/SuiteR/css/colourSelector.php-success", "isController": false}, {"data": [[1.52834622E12, 0.16666666666666666]], "isOverall": false, "label": "156 /custom/modules/Leads/LeadValidations.js-success", "isController": false}, {"data": [[1.52834598E12, 0.016666666666666666]], "isOverall": false, "label": "77 /success.txt-failure", "isController": false}, {"data": [[1.52834604E12, 0.03333333333333333], [1.5283461E12, 0.13333333333333333]], "isOverall": false, "label": "101 /custom/themes/SuiteR/images/advanced_search.gif-success", "isController": false}, {"data": [[1.52834616E12, 0.13333333333333333], [1.5283461E12, 0.03333333333333333]], "isOverall": false, "label": "124 /modules/Calendar/Cal.js-success", "isController": false}, {"data": [[1.52834598E12, 0.1], [1.52834592E12, 0.06666666666666667]], "isOverall": false, "label": "76 /success.txt-success", "isController": false}, {"data": [[1.52834604E12, 0.03333333333333333], [1.5283461E12, 0.13333333333333333]], "isOverall": false, "label": "104 /custom/themes/SuiteR/images/sugar_icon.ico-success", "isController": false}, {"data": [[1.52834616E12, 0.13333333333333333], [1.5283461E12, 0.03333333333333333]], "isOverall": false, "label": "112 /include/SugarCharts/Jit/js/Jit/jit.js-success", "isController": false}, {"data": [[1.52834634E12, 0.03333333333333333], [1.5283464E12, 0.13333333333333333]], "isOverall": false, "label": "202 /emailMobileExistLead.php-success", "isController": false}, {"data": [[1.52834646E12, 0.11666666666666667], [1.5283464E12, 0.05]], "isOverall": false, "label": "210 /index.php-success", "isController": false}, {"data": [[1.52834622E12, 0.1], [1.52834616E12, 0.06666666666666667]], "isOverall": false, "label": "149 /vcal_server.php-success", "isController": false}, {"data": [[1.52834646E12, 0.06666666666666667], [1.5283464E12, 0.1]], "isOverall": false, "label": "209 /index.php-success", "isController": false}, {"data": [[1.52834616E12, 0.13333333333333333], [1.5283461E12, 0.03333333333333333]], "isOverall": false, "label": "115 /include/SugarFields/Fields/Datetimecombo/Datetimecombo.js-success", "isController": false}, {"data": [[1.52834604E12, 0.03333333333333333], [1.5283461E12, 0.13333333333333333]], "isOverall": false, "label": "98 /include/javascript/jquery/themes/base/jquery-ui.theme.min.css-success", "isController": false}, {"data": [[1.52834604E12, 0.03333333333333333], [1.5283461E12, 0.13333333333333333]], "isOverall": false, "label": "100 /custom/include/images/20reasons_md.png-success", "isController": false}, {"data": [[1.52834598E12, 0.11666666666666667], [1.52834592E12, 0.03333333333333333]], "isOverall": false, "label": "77 /success.txt-success", "isController": false}, {"data": [[1.52834604E12, 0.03333333333333333], [1.5283461E12, 0.13333333333333333]], "isOverall": false, "label": "95 /include/javascript/jquery/themes/base/jquery-ui.min.css-success", "isController": false}, {"data": [[1.52834634E12, 0.03333333333333333], [1.5283464E12, 0.13333333333333333]], "isOverall": false, "label": "201 /index.php-success", "isController": false}, {"data": [[1.52834622E12, 0.06666666666666667], [1.52834628E12, 0.1]], "isOverall": false, "label": "171 /MasterData/getHAServicePincodelist.php-success", "isController": false}, {"data": [[1.52834646E12, 0.13333333333333333], [1.5283464E12, 0.03333333333333333]], "isOverall": false, "label": "221 /cache/include/javascript/sugar_grp_jsolait.js-success", "isController": false}, {"data": [[1.52834622E12, 0.06666666666666667], [1.52834628E12, 0.1]], "isOverall": false, "label": "172 /MasterData/pinCodeMasterData.php-success", "isController": false}, {"data": [[1.52834622E12, 0.1], [1.52834616E12, 0.06666666666666667]], "isOverall": false, "label": "147 /custom/themes/SuiteR/images/next.gif-success", "isController": false}, {"data": [[1.52834622E12, 0.016666666666666666], [1.52834616E12, 0.15]], "isOverall": false, "label": "129 /custom/themes/SuiteR/images/blank.gif-success", "isController": false}, {"data": [[1.52834646E12, 0.11666666666666667], [1.5283464E12, 0.05]], "isOverall": false, "label": "211 /themes/SuiteR/css/colourSelector.php-success", "isController": false}, {"data": [[1.52834622E12, 0.13333333333333333], [1.52834616E12, 0.03333333333333333]], "isOverall": false, "label": "162 /custom/themes/SuiteR/images/basic_search.gif-success", "isController": false}, {"data": [[1.52834622E12, 0.016666666666666666], [1.52834616E12, 0.15]], "isOverall": false, "label": "133 /custom/themes/SuiteR/images/end_off.gif-success", "isController": false}, {"data": [[1.52834646E12, 0.11666666666666667], [1.5283464E12, 0.05]], "isOverall": false, "label": "215 /modules/Favorites/favorites.js-success", "isController": false}, {"data": [[1.52834634E12, 0.03333333333333333], [1.5283464E12, 0.13333333333333333]], "isOverall": false, "label": "206 /emailMobileExistLead.php-success", "isController": false}, {"data": [[1.52834616E12, 0.13333333333333333], [1.5283461E12, 0.03333333333333333]], "isOverall": false, "label": "116 /include/javascript/jsclass_base.js-success", "isController": false}, {"data": [[1.52834634E12, 0.16666666666666666]], "isOverall": false, "label": "188 /include/javascript/jquery/themes/base/jquery.ui.all.css-success", "isController": false}, {"data": [[1.52834616E12, 0.13333333333333333], [1.5283461E12, 0.03333333333333333]], "isOverall": false, "label": "118 /modules/Calendar/fullcalendar/fullcalendar.css-success", "isController": false}, {"data": [[1.52834622E12, 0.03333333333333333], [1.52834628E12, 0.13333333333333333]], "isOverall": false, "label": "184 /include/javascript/calendar.js-success", "isController": false}, {"data": [[1.52834604E12, 0.03333333333333333], [1.5283461E12, 0.13333333333333333]], "isOverall": false, "label": "105 /index.php-success", "isController": false}, {"data": [[1.52834616E12, 0.13333333333333333], [1.5283461E12, 0.03333333333333333]], "isOverall": false, "label": "126 /include/MySugar/javascript/retrievePage.js-success", "isController": false}, {"data": [[1.52834604E12, 0.13333333333333333], [1.52834598E12, 0.03333333333333333]], "isOverall": false, "label": "92 /modules/Users/login.css-success", "isController": false}, {"data": [[1.52834634E12, 0.06666666666666667], [1.5283464E12, 0.1]], "isOverall": false, "label": "197 /include/javascript/jquery/themes/base/jquery-ui.structure.min.css-success", "isController": false}, {"data": [[1.52834622E12, 0.13333333333333333], [1.52834616E12, 0.03333333333333333]], "isOverall": false, "label": "161 /themes/default/images/create-record.gif-success", "isController": false}, {"data": [[1.52834622E12, 0.13333333333333333], [1.52834616E12, 0.03333333333333333]], "isOverall": false, "label": "163 /custom/themes/SuiteR/images/jscalendar.gif-success", "isController": false}, {"data": [[1.52834604E12, 0.03333333333333333], [1.5283461E12, 0.13333333333333333]], "isOverall": false, "label": "103 /custom/themes/SuiteR/images/sugar_icon.ico-success", "isController": false}, {"data": [[1.52834622E12, 0.03333333333333333], [1.52834628E12, 0.13333333333333333]], "isOverall": false, "label": "177 /include/javascript/yui/build/assets/skins/sam/sprite.png-success", "isController": false}, {"data": [[1.52834616E12, 0.13333333333333333], [1.5283461E12, 0.03333333333333333]], "isOverall": false, "label": "120 /include/javascript/qtip/jquery.qtip.min.js-success", "isController": false}, {"data": [[1.52834634E12, 0.03333333333333333], [1.5283464E12, 0.13333333333333333]], "isOverall": false, "label": "199 /custom/include/images/20reasons_md.png-success", "isController": false}, {"data": [[1.52834646E12, 0.13333333333333333], [1.5283464E12, 0.03333333333333333]], "isOverall": false, "label": "214 /include/InlineEditing/inlineEditing.js-success", "isController": false}, {"data": [[1.52834622E12, 0.08333333333333333], [1.52834628E12, 0.08333333333333333]], "isOverall": false, "label": "170 /getCategoryServices.php-success", "isController": false}, {"data": [[1.52834604E12, 0.03333333333333333], [1.5283461E12, 0.13333333333333333]], "isOverall": false, "label": "96 /cache/include/javascript/sugar_field_grp.js-success", "isController": false}, {"data": [[1.52834616E12, 0.16666666666666666]], "isOverall": false, "label": "127 /themes/SuiteR/css/dashboardstyle.css-success", "isController": false}, {"data": [[1.52834622E12, 0.13333333333333333], [1.52834616E12, 0.03333333333333333]], "isOverall": false, "label": "164 /custom/themes/20reasons/images/jscalendar.gif-success", "isController": false}, {"data": [[1.52834622E12, 0.016666666666666666], [1.52834616E12, 0.15]], "isOverall": false, "label": "139 /custom/themes/SuiteR/images/calendar_next.png-success", "isController": false}, {"data": [[1.52834646E12, 0.13333333333333333], [1.5283464E12, 0.03333333333333333]], "isOverall": false, "label": "219 /include/social/twitter/twitter.js-success", "isController": false}, {"data": [[1.52834616E12, 0.06666666666666667], [1.5283461E12, 0.1]], "isOverall": false, "label": "110 /cache/include/javascript/sugar_grp_yui_widgets.js-success", "isController": false}, {"data": [[1.52834622E12, 0.08333333333333333], [1.52834616E12, 0.08333333333333333]], "isOverall": false, "label": "146 /custom/themes/SuiteR/images/backtotop.gif-success", "isController": false}, {"data": [[1.52834646E12, 0.13333333333333333], [1.5283464E12, 0.03333333333333333]], "isOverall": false, "label": "213 /custom/modules/Leads/js/Inspection.js-success", "isController": false}, {"data": [[1.52834646E12, 0.11666666666666667], [1.5283464E12, 0.05]], "isOverall": false, "label": "212 /modules/Leads/Lead.js-success", "isController": false}, {"data": [[1.52834604E12, 0.08333333333333333], [1.5283461E12, 0.08333333333333333]], "isOverall": false, "label": "82 /cache/include/javascript/sugar_grp1_yui.js-success", "isController": false}, {"data": [[1.52834616E12, 0.13333333333333333], [1.5283461E12, 0.03333333333333333]], "isOverall": false, "label": "121 /modules/Calendar/fullcalendar/lib/moment.min.js-success", "isController": false}, {"data": [[1.52834622E12, 0.11666666666666667], [1.52834628E12, 0.05]], "isOverall": false, "label": "167 /custom/themes/SuiteR/images/id-ff-select.png-success", "isController": false}, {"data": [[1.52834646E12, 0.13333333333333333], [1.5283464E12, 0.03333333333333333]], "isOverall": false, "label": "218 /include/social/twitter/twitter_feed.js-success", "isController": false}, {"data": [[1.52834604E12, 0.03333333333333333], [1.5283461E12, 0.13333333333333333]], "isOverall": false, "label": "102 /index.php-success", "isController": false}, {"data": [[1.52834622E12, 0.13333333333333333], [1.52834616E12, 0.03333333333333333]], "isOverall": false, "label": "154 /cache/jsLanguage/Leads/en_us.js-success", "isController": false}, {"data": [[1.52834622E12, 0.11666666666666667], [1.52834628E12, 0.05]], "isOverall": false, "label": "168 /MasterData/product_category_list.json-success", "isController": false}, {"data": [[1.52834634E12, 0.1], [1.5283464E12, 0.06666666666666667]], "isOverall": false, "label": "193 /cache/include/javascript/sugar_field_grp.js-success", "isController": false}, {"data": [[1.52834634E12, 0.03333333333333333], [1.5283464E12, 0.13333333333333333]], "isOverall": false, "label": "204 /emailMobileExistLead.php-success", "isController": false}, {"data": [[1.52834604E12, 0.13333333333333333], [1.52834598E12, 0.03333333333333333]], "isOverall": false, "label": "91 /themes/SuiteR/js/jscolor.js-success", "isController": false}, {"data": [[1.52834622E12, 0.05], [1.52834616E12, 0.11666666666666667]], "isOverall": false, "label": "141 /include/MySugar/javascript/MySugar.js-success", "isController": false}, {"data": [[1.52834616E12, 0.13333333333333333], [1.5283461E12, 0.03333333333333333]], "isOverall": false, "label": "117 /include/javascript/jsclass_async.js-success", "isController": false}, {"data": [[1.52834616E12, 0.16666666666666666]], "isOverall": false, "label": "128 /themes/SuiteR/css/colourSelector.php-success", "isController": false}, {"data": [[1.52834598E12, 0.16666666666666666]], "isOverall": false, "label": "83 /cache/include/javascript/sugar_grp1.js-success", "isController": false}, {"data": [[1.52834622E12, 0.13333333333333333], [1.52834628E12, 0.03333333333333333]], "isOverall": false, "label": "165 /custom/themes/20reasons/images/jscalendar.gif-success", "isController": false}, {"data": [[1.52834622E12, 0.06666666666666667], [1.52834616E12, 0.1]], "isOverall": false, "label": "144 /custom/themes/SuiteR/images/edit_inline.png-success", "isController": false}, {"data": [[1.52834634E12, 0.13333333333333333], [1.52834628E12, 0.03333333333333333]], "isOverall": false, "label": "185 /include/javascript/qtip/jquery.qtip.min.css-success", "isController": false}, {"data": [[1.52834598E12, 0.13333333333333333], [1.52834592E12, 0.03333333333333333]], "isOverall": false, "label": "79 /themes/SuiteR/css/bootstrap.min.css-success", "isController": false}, {"data": [[1.52834604E12, 0.13333333333333333], [1.52834598E12, 0.03333333333333333]], "isOverall": false, "label": "89 /cache/themes/SuiteR/css/deprecated.css-success", "isController": false}, {"data": [[1.52834622E12, 0.05], [1.52834628E12, 0.11666666666666667]], "isOverall": false, "label": "174 /promotions.php-success", "isController": false}, {"data": [[1.52834622E12, 0.03333333333333333], [1.52834628E12, 0.13333333333333333]], "isOverall": false, "label": "179 /themes/SuiteR/css/footable.core.css-success", "isController": false}, {"data": [[1.52834604E12, 0.13333333333333333], [1.52834598E12, 0.03333333333333333]], "isOverall": false, "label": "86 /include/javascript/qtip/jquery.qtip.min.css-success", "isController": false}, {"data": [[1.52834604E12, 0.03333333333333333], [1.5283461E12, 0.13333333333333333]], "isOverall": false, "label": "97 /include/javascript/jquery/themes/base/jquery-ui.structure.min.css-success", "isController": false}, {"data": [[1.52834622E12, 0.03333333333333333], [1.52834616E12, 0.13333333333333333]], "isOverall": false, "label": "135 /themes/SuiteR/fonts/glyphicons-halflings-regular.woff2-success", "isController": false}, {"data": [[1.52834604E12, 0.13333333333333333], [1.52834598E12, 0.03333333333333333]], "isOverall": false, "label": "87 /cache/themes/SuiteR/css/yui.css-success", "isController": false}, {"data": [[1.52834622E12, 0.05], [1.52834628E12, 0.11666666666666667]], "isOverall": false, "label": "173 /getPromoPlans.php-success", "isController": false}, {"data": [[1.5283461E12, 0.16666666666666666]], "isOverall": false, "label": "106 /index.php-success", "isController": false}, {"data": [[1.52834604E12, 0.13333333333333333], [1.52834598E12, 0.03333333333333333]], "isOverall": false, "label": "93 /modules/Users/login.js-success", "isController": false}, {"data": [[1.52834634E12, 0.03333333333333333], [1.5283464E12, 0.13333333333333333]], "isOverall": false, "label": "208 /emailMobileExistLead.php-success", "isController": false}, {"data": [[1.52834622E12, 0.03333333333333333], [1.52834628E12, 0.13333333333333333]], "isOverall": false, "label": "175 /getPromoPlans.php-success", "isController": false}, {"data": [[1.52834646E12, 0.11666666666666667], [1.5283464E12, 0.05]], "isOverall": false, "label": "216 /include/social/facebook/facebook_subpanel.js-success", "isController": false}, {"data": [[1.52834604E12, 0.03333333333333333], [1.5283461E12, 0.13333333333333333]], "isOverall": false, "label": "99 /themes/SuiteR/css/colourSelector.php-success", "isController": false}, {"data": [[1.52834622E12, 0.08333333333333333], [1.52834616E12, 0.08333333333333333]], "isOverall": false, "label": "145 /custom/themes/SuiteR/images/print.gif-success", "isController": false}, {"data": [[1.52834628E12, 0.16666666666666666]], "isOverall": false, "label": "183 /cache/include/javascript/sugar_grp1.js-success", "isController": false}, {"data": [[1.52834622E12, 0.03333333333333333], [1.52834628E12, 0.13333333333333333]], "isOverall": false, "label": "180 /themes/SuiteR/css/bootstrap.min.css-success", "isController": false}, {"data": [[1.52834646E12, 0.13333333333333333], [1.5283464E12, 0.03333333333333333]], "isOverall": false, "label": "222 /include/SubPanel/SubPanel.js-success", "isController": false}, {"data": [[1.52834616E12, 0.13333333333333333], [1.5283461E12, 0.03333333333333333]], "isOverall": false, "label": "114 /include/SugarCharts/Jit/js/mySugarCharts.js-success", "isController": false}, {"data": [[1.52834622E12, 0.13333333333333333], [1.52834616E12, 0.03333333333333333]], "isOverall": false, "label": "158 /include/SugarFields/Fields/Datetimecombo/Datetimecombo.js-success", "isController": false}, {"data": [[1.52834634E12, 0.03333333333333333], [1.5283464E12, 0.13333333333333333]], "isOverall": false, "label": "198 /include/javascript/jquery/themes/base/jquery-ui.theme.min.css-success", "isController": false}, {"data": [[1.52834622E12, 0.016666666666666666], [1.52834616E12, 0.15]], "isOverall": false, "label": "136 /custom/themes/SuiteR/images/arrow_down.gif-success", "isController": false}, {"data": [[1.52834634E12, 0.08333333333333333], [1.5283464E12, 0.08333333333333333]], "isOverall": false, "label": "194 /modules/Users/login.css-success", "isController": false}, {"data": [[1.52834622E12, 0.11666666666666667], [1.52834628E12, 0.05]], "isOverall": false, "label": "166 /custom/themes/SuiteR/images/id-ff-clear.png-success", "isController": false}, {"data": [[1.52834622E12, 0.03333333333333333], [1.52834628E12, 0.13333333333333333]], "isOverall": false, "label": "178 /index.php-success", "isController": false}, {"data": [[1.52834622E12, 0.016666666666666666], [1.52834616E12, 0.15]], "isOverall": false, "label": "131 /custom/themes/SuiteR/images/start_off.gif-success", "isController": false}, {"data": [[1.52834634E12, 0.03333333333333333], [1.5283464E12, 0.13333333333333333]], "isOverall": false, "label": "207 /emailMobileExistLead.php-success", "isController": false}, {"data": [[1.52834604E12, 0.13333333333333333], [1.52834598E12, 0.03333333333333333]], "isOverall": false, "label": "88 /include/javascript/jquery/themes/base/jquery.ui.all.css-success", "isController": false}, {"data": [[1.52834616E12, 0.13333333333333333], [1.5283461E12, 0.03333333333333333]], "isOverall": false, "label": "125 /include/MySugar/javascript/AddRemoveDashboardPages.js-success", "isController": false}, {"data": [[1.52834646E12, 0.13333333333333333], [1.5283464E12, 0.03333333333333333]], "isOverall": false, "label": "217 /include/social/facebook/facebook.js-success", "isController": false}, {"data": [[1.52834622E12, 0.016666666666666666], [1.52834616E12, 0.15]], "isOverall": false, "label": "137 /custom/themes/SuiteR/images/calendar_previous.png-success", "isController": false}, {"data": [[1.52834604E12, 0.13333333333333333], [1.52834598E12, 0.03333333333333333]], "isOverall": false, "label": "90 /themes/SuiteR/css/colourSelector.php-success", "isController": false}, {"data": [[1.52834622E12, 0.15], [1.52834628E12, 0.016666666666666666]], "isOverall": false, "label": "160 /cache/include/javascript/sugar_grp_yui_widgets.js-success", "isController": false}, {"data": [[1.52834604E12, 0.13333333333333333], [1.52834598E12, 0.03333333333333333]], "isOverall": false, "label": "81 /cache/include/javascript/sugar_grp1_jquery.js-success", "isController": false}, {"data": [[1.52834616E12, 0.16666666666666666]], "isOverall": false, "label": "122 /modules/Calendar/fullcalendar/fullcalendar.min.js-success", "isController": false}, {"data": [[1.52834634E12, 0.06666666666666667], [1.5283464E12, 0.1]], "isOverall": false, "label": "195 /modules/Users/login.js-success", "isController": false}, {"data": [[1.52834622E12, 0.016666666666666666], [1.52834616E12, 0.15]], "isOverall": false, "label": "123 /modules/Calendar/fullcalendar/lang-all.js-success", "isController": false}, {"data": [[1.52834616E12, 0.13333333333333333], [1.5283461E12, 0.03333333333333333]], "isOverall": false, "label": "107 /cache/jsLanguage/en_us.js-success", "isController": false}, {"data": [[1.52834598E12, 0.13333333333333333], [1.52834592E12, 0.03333333333333333]], "isOverall": false, "label": "78 /index.php-success", "isController": false}, {"data": [[1.52834634E12, 0.1], [1.5283464E12, 0.06666666666666667]], "isOverall": false, "label": "189 /cache/themes/SuiteR/css/deprecated.css-success", "isController": false}, {"data": [[1.52834604E12, 0.03333333333333333], [1.5283461E12, 0.13333333333333333]], "isOverall": false, "label": "94 /cache/themes/SuiteR/css/style.css-success", "isController": false}, {"data": [[1.52834616E12, 0.13333333333333333], [1.5283461E12, 0.03333333333333333]], "isOverall": false, "label": "119 /modules/Calendar/fullcalendar/fullcalendar.print.css-success", "isController": false}, {"data": [[1.52834634E12, 0.06666666666666667], [1.5283464E12, 0.1]], "isOverall": false, "label": "196 /include/javascript/jquery/themes/base/jquery-ui.min.css-success", "isController": false}, {"data": [[1.52834598E12, 0.13333333333333333], [1.52834592E12, 0.03333333333333333]], "isOverall": false, "label": "84 /include/javascript/calendar.js-success", "isController": false}, {"data": [[1.5283461E12, 0.16666666666666666]], "isOverall": false, "label": "109 /themes/SuiteR/css/colourSelector.php-success", "isController": false}, {"data": [[1.52834622E12, 0.016666666666666666], [1.52834616E12, 0.15]], "isOverall": false, "label": "130 /custom/themes/SuiteR/images/previous_off.gif-success", "isController": false}, {"data": [[1.52834634E12, 0.08333333333333333], [1.5283464E12, 0.08333333333333333]], "isOverall": false, "label": "192 /themes/SuiteR/js/jscolor.js-success", "isController": false}, {"data": [[1.52834622E12, 0.016666666666666666], [1.52834616E12, 0.15]], "isOverall": false, "label": "132 /custom/themes/SuiteR/images/next_off.gif-success", "isController": false}, {"data": [[1.52834634E12, 0.03333333333333333], [1.5283464E12, 0.13333333333333333]], "isOverall": false, "label": "203 /custom/themes/default/images/checkLoader.gif-success", "isController": false}, {"data": [[1.52834622E12, 0.1], [1.52834616E12, 0.06666666666666667]], "isOverall": false, "label": "150 /success.txt-success", "isController": false}, {"data": [[1.52834634E12, 0.03333333333333333], [1.5283464E12, 0.13333333333333333]], "isOverall": false, "label": "205 /emailMobileExistLead.php-success", "isController": false}, {"data": [[1.52834622E12, 0.016666666666666666], [1.52834616E12, 0.15]], "isOverall": false, "label": "138 /index.php-success", "isController": false}, {"data": [[1.52834604E12, 0.13333333333333333], [1.52834598E12, 0.03333333333333333]], "isOverall": false, "label": "85 /cache/themes/SuiteR/js/style.js-success", "isController": false}, {"data": [[1.52834622E12, 0.1], [1.52834616E12, 0.06666666666666667]], "isOverall": false, "label": "151 /index.php-success", "isController": false}, {"data": [[1.52834622E12, 0.03333333333333333], [1.52834628E12, 0.13333333333333333]], "isOverall": false, "label": "176 /promotions.php-success", "isController": false}, {"data": [[1.5283461E12, 0.16666666666666666]], "isOverall": false, "label": "111 /include/javascript/dashlets.js-success", "isController": false}, {"data": [[1.52834622E12, 0.1], [1.52834616E12, 0.06666666666666667]], "isOverall": false, "label": "148 /index.php-success", "isController": false}, {"data": [[1.52834634E12, 0.13333333333333333], [1.52834628E12, 0.03333333333333333]], "isOverall": false, "label": "181 /cache/include/javascript/sugar_grp1_jquery.js-success", "isController": false}, {"data": [[1.52834616E12, 0.13333333333333333], [1.5283461E12, 0.03333333333333333]], "isOverall": false, "label": "113 /include/SugarCharts/Jit/js/sugarCharts.js-success", "isController": false}, {"data": [[1.5283461E12, 0.16666666666666666]], "isOverall": false, "label": "108 /cache/jsLanguage/Home/en_us.js-success", "isController": false}, {"data": [[1.52834622E12, 0.1], [1.52834616E12, 0.06666666666666667]], "isOverall": false, "label": "152 /index.php-success", "isController": false}, {"data": [[1.52834634E12, 0.03333333333333333], [1.5283464E12, 0.13333333333333333]], "isOverall": false, "label": "200 /custom/themes/SuiteR/images/advanced_search.gif-success", "isController": false}, {"data": [[1.52834622E12, 0.13333333333333333], [1.52834616E12, 0.03333333333333333]], "isOverall": false, "label": "153 /index.php-success", "isController": false}, {"data": [[1.52834634E12, 0.16666666666666666]], "isOverall": false, "label": "182 /cache/include/javascript/sugar_grp1_yui.js-success", "isController": false}, {"data": [[1.52834622E12, 0.06666666666666667], [1.52834616E12, 0.1]], "isOverall": false, "label": "142 /index.php-success", "isController": false}, {"data": [[1.52834634E12, 0.16666666666666666]], "isOverall": false, "label": "191 /themes/SuiteR/css/colourSelector.php-success", "isController": false}, {"data": [[1.52834622E12, 0.13333333333333333], [1.52834616E12, 0.03333333333333333]], "isOverall": false, "label": "159 /modules/Leads/Lead.js-success", "isController": false}, {"data": [[1.52834634E12, 0.13333333333333333], [1.5283464E12, 0.03333333333333333]], "isOverall": false, "label": "187 /cache/themes/SuiteR/css/yui.css-success", "isController": false}, {"data": [[1.52834622E12, 0.016666666666666666], [1.52834616E12, 0.15]], "isOverall": false, "label": "134 /custom/themes/SuiteR/images/arrow.gif-success", "isController": false}, {"data": [[1.52834634E12, 0.13333333333333333], [1.52834628E12, 0.03333333333333333]], "isOverall": false, "label": "186 /cache/themes/SuiteR/js/style.js-success", "isController": false}, {"data": [[1.52834646E12, 0.13333333333333333], [1.5283464E12, 0.03333333333333333]], "isOverall": false, "label": "220 /include/SubPanel/SubPanelTiles.js-success", "isController": false}, {"data": [[1.52834622E12, 0.016666666666666666], [1.52834616E12, 0.15]], "isOverall": false, "label": "140 /custom/themes/SuiteR/images/end.gif-success", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.52834646E12, "title": "Transactions Per Second"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: "%H:%M:%S",
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of transactions / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendTransactionsPerSecond"
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y transactions / sec"
                }
            };
        },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesTransactionsPerSecond"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotTransactionsPerSecond"), dataset, options);
        // setup overview
        $.plot($("#overviewTransactionsPerSecond"), dataset, prepareOverviewOptions(options));
    }
};

// Transactions per second
function refreshTransactionsPerSecond(fixTimestamps) {
    var infos = transactionsPerSecondInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 19800000);
    }
    if(isGraph($("#flotTransactionsPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesTransactionsPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotTransactionsPerSecond", "#overviewTransactionsPerSecond");
        $('#footerTransactionsPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

// Collapse the graph matching the specified DOM element depending the collapsed
// status
function collapse(elem, collapsed){
    if(collapsed){
        $(elem).parent().find(".fa-chevron-up").removeClass("fa-chevron-up").addClass("fa-chevron-down");
    } else {
        $(elem).parent().find(".fa-chevron-down").removeClass("fa-chevron-down").addClass("fa-chevron-up");
        if (elem.id == "bodyBytesThroughputOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshBytesThroughputOverTime(true);
            }
            document.location.href="#bytesThroughputOverTime";
        } else if (elem.id == "bodyLatenciesOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshLatenciesOverTime(true);
            }
            document.location.href="#latenciesOverTime";
        } else if (elem.id == "bodyConnectTimeOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshConnectTimeOverTime(true);
            }
            document.location.href="#connectTimeOverTime";
        } else if (elem.id == "bodyResponseTimePercentilesOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimePercentilesOverTime(true);
            }
            document.location.href="#responseTimePercentilesOverTime";
        } else if (elem.id == "bodyResponseTimeDistribution") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimeDistribution();
            }
            document.location.href="#responseTimeDistribution" ;
        } else if (elem.id == "bodySyntheticResponseTimeDistribution") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshSyntheticResponseTimeDistribution();
            }
            document.location.href="#syntheticResponseTimeDistribution" ;
        } else if (elem.id == "bodyActiveThreadsOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshActiveThreadsOverTime(true);
            }
            document.location.href="#activeThreadsOverTime";
        } else if (elem.id == "bodyTimeVsThreads") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshTimeVsThreads();
            }
            document.location.href="#timeVsThreads" ;
        } else if (elem.id == "bodyCodesPerSecond") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshCodesPerSecond(true);
            }
            document.location.href="#codesPerSecond";
        } else if (elem.id == "bodyTransactionsPerSecond") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshTransactionsPerSecond(true);
            }
            document.location.href="#transactionsPerSecond";
        } else if (elem.id == "bodyResponseTimeVsRequest") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimeVsRequest();
            }
            document.location.href="#responseTimeVsRequest";
        } else if (elem.id == "bodyLatenciesVsRequest") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshLatenciesVsRequest();
            }
            document.location.href="#latencyVsRequest";
        }
    }
}

// Collapse
$(function() {
        $('.collapse').on('shown.bs.collapse', function(){
            collapse(this, false);
        }).on('hidden.bs.collapse', function(){
            collapse(this, true);
        });
});

$(function() {
    $(".glyphicon").mousedown( function(event){
        var tmp = $('.in:not(ul)');
        tmp.parent().parent().parent().find(".fa-chevron-up").removeClass("fa-chevron-down").addClass("fa-chevron-down");
        tmp.removeClass("in");
        tmp.addClass("out");
    });
});

/*
 * Activates or deactivates all series of the specified graph (represented by id parameter)
 * depending on checked argument.
 */
function toggleAll(id, checked){
    var placeholder = document.getElementById(id);

    var cases = $(placeholder).find(':checkbox');
    cases.prop('checked', checked);
    $(cases).parent().children().children().toggleClass("legend-disabled", !checked);

    var choiceContainer;
    if ( id == "choicesBytesThroughputOverTime"){
        choiceContainer = $("#choicesBytesThroughputOverTime");
        refreshBytesThroughputOverTime(false);
    } else if(id == "choicesResponseTimesOverTime"){
        choiceContainer = $("#choicesResponseTimesOverTime");
        refreshResponseTimeOverTime(false);
    } else if ( id == "choicesLatenciesOverTime"){
        choiceContainer = $("#choicesLatenciesOverTime");
        refreshLatenciesOverTime(false);
    } else if ( id == "choicesConnectTimeOverTime"){
        choiceContainer = $("#choicesConnectTimeOverTime");
        refreshConnectTimeOverTime(false);
    } else if ( id == "responseTimePercentilesOverTime"){
        choiceContainer = $("#choicesResponseTimePercentilesOverTime");
        refreshResponseTimePercentilesOverTime(false);
    } else if ( id == "choicesResponseTimePercentiles"){
        choiceContainer = $("#choicesResponseTimePercentiles");
        refreshResponseTimePercentiles();
    } else if(id == "choicesActiveThreadsOverTime"){
        choiceContainer = $("#choicesActiveThreadsOverTime");
        refreshActiveThreadsOverTime(false);
    } else if ( id == "choicesTimeVsThreads"){
        choiceContainer = $("#choicesTimeVsThreads");
        refreshTimeVsThreads();
    } else if ( id == "choicesSyntheticResponseTimeDistribution"){
        choiceContainer = $("#choicesSyntheticResponseTimeDistribution");
        refreshSyntheticResponseTimeDistribution();
    } else if ( id == "choicesResponseTimeDistribution"){
        choiceContainer = $("#choicesResponseTimeDistribution");
        refreshResponseTimeDistribution();
    } else if ( id == "choicesHitsPerSecond"){
        choiceContainer = $("#choicesHitsPerSecond");
        refreshHitsPerSecond(false);
    } else if(id == "choicesCodesPerSecond"){
        choiceContainer = $("#choicesCodesPerSecond");
        refreshCodesPerSecond(false);
    } else if ( id == "choicesTransactionsPerSecond"){
        choiceContainer = $("#choicesTransactionsPerSecond");
        refreshTransactionsPerSecond(false);
    } else if ( id == "choicesResponseTimeVsRequest"){
        choiceContainer = $("#choicesResponseTimeVsRequest");
        refreshResponseTimeVsRequest();
    } else if ( id == "choicesLatencyVsRequest"){
        choiceContainer = $("#choicesLatencyVsRequest");
        refreshLatenciesVsRequest();
    }
    var color = checked ? "black" : "#818181";
    choiceContainer.find("label").each(function(){
        this.style.color = color;
    });
}

// Unchecks all boxes for "Hide all samples" functionality
function uncheckAll(id){
    toggleAll(id, false);
}

// Checks all boxes for "Show all samples" functionality
function checkAll(id){
    toggleAll(id, true);
}

// Prepares data to be consumed by plot plugins
function prepareData(series, choiceContainer, customizeSeries){
    var datasets = [];

    // Add only selected series to the data set
    choiceContainer.find("input:checked").each(function (index, item) {
        var key = $(item).attr("name");
        var i = 0;
        var size = series.length;
        while(i < size && series[i].label != key)
            i++;
        if(i < size){
            var currentSeries = series[i];
            datasets.push(currentSeries);
            if(customizeSeries)
                customizeSeries(currentSeries);
        }
    });
    return datasets;
}

/*
 * Ignore case comparator
 */
function sortAlphaCaseless(a,b){
    return a.toLowerCase() > b.toLowerCase() ? 1 : -1;
};

/*
 * Creates a legend in the specified element with graph information
 */
function createLegend(choiceContainer, infos) {
    // Sort series by name
    var keys = [];
    $.each(infos.data.result.series, function(index, series){
        keys.push(series.label);
    });
    keys.sort(sortAlphaCaseless);

    // Create list of series with support of activation/deactivation
    $.each(keys, function(index, key) {
        var id = choiceContainer.attr('id') + index;
        $('<li />')
            .append($('<input id="' + id + '" name="' + key + '" type="checkbox" checked="checked" hidden />'))
            .append($('<label />', { 'text': key , 'for': id }))
            .appendTo(choiceContainer);
    });
    choiceContainer.find("label").click( function(){
        if (this.style.color !== "rgb(129, 129, 129)" ){
            this.style.color="#818181";
        }else {
            this.style.color="black";
        }
        $(this).parent().children().children().toggleClass("legend-disabled");
    });
    choiceContainer.find("label").mousedown( function(event){
        event.preventDefault();
    });
    choiceContainer.find("label").mouseenter(function(){
        this.style.cursor="pointer";
    });

    // Recreate graphe on series activation toggle
    choiceContainer.find("input").click(function(){
        infos.createGraph();
    });
}