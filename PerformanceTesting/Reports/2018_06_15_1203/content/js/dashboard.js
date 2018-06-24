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
var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

/*
 * Populates the table identified by id parameter with the specified data and
 * format
 *
 */
function createTable(table, info, formatter, defaultSorts, seriesIndex) {
    var tableRef = table[0];

    // Create header and populate it with data.titles array
    var header = tableRef.createTHead();
    var newRow = header.insertRow(-1);
    for (var index = 0; index < info.titles.length; index++) {
        var cell = document.createElement('th');
        cell.innerHTML = info.titles[index];
        newRow.appendChild(cell);
    }

    var tBody;

    // Create overall body if defined
    if(info.overall){
        tBody = document.createElement('tbody');
        tBody.className = "tablesorter-no-sort";
        tableRef.appendChild(tBody);
        var newRow = tBody.insertRow(-1);
        var data = info.overall.data;
        for(var index=0;index < data.length; index++){
            var cell = newRow.insertCell(-1);
            cell.innerHTML = formatter ? formatter(index, data[index]): data[index];
        }
    }

    // Create regular body
    tBody = document.createElement('tbody');
    tableRef.appendChild(tBody);

    var regexp;
    if(seriesFilter)
        regexp = new RegExp(seriesFilter, 'i');

    // Populate body with data.items array
    for(var index=0; index < info.items.length; index++){
        var item = info.items[index];
        if((!regexp || filtersOnlySampleSeries && !info.supportsControllersDiscrimination || regexp.test(item.data[seriesIndex]))
                &&
                (!showControllersOnly || !info.supportsControllersDiscrimination || item.isController)){
            if(item.data.length > 0) {
                var newRow = tBody.insertRow(-1);
                for(var col=0; col < item.data.length; col++){
                    var cell = newRow.insertCell(-1);
                    cell.innerHTML = formatter ? formatter(col, item.data[col]) : item.data[col];
                }
            }
        }
    }

    // Add support of columns sort
    table.tablesorter({sortList : defaultSorts});
}

$(document).ready(function() {

    // Customize table sorter default options
    $.extend( $.tablesorter.defaults, {
        theme: 'blue',
        cssInfoBlock: "tablesorter-no-sort",
        widthFixed: true,
        widgets: ['zebra']
    });

    var data = {"OkPercent": 5.555555555555555, "KoPercent": 94.44444444444444};
    var dataset = [
        {
            "label" : "KO",
            "data" : data.KoPercent,
			"color" : "#FF6347"
        },
        {
            "label" : "OK",
            "data" : data.OkPercent,
            "color" : "#9ACD32"
        }];
    $.plot($("#flot-requests-summary"), dataset, {
        series : {
            pie : {
                show : true,
                radius : 1,
                label : {
                    show : true,
                    radius : 3 / 4,
                    formatter : function(label, series) {
                        return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
                            + label
                            + '<br/>'
                            + Math.round10(series.percent, -2)
                            + '%</div>';
                    },
                    background : {
                        opacity : 0.5,
                        color : '#000'
                    }
                }
            }
        },
        legend : {
            show : true
        }
    });

    // Creates APDEX table
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.05416666666666667, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)  ", "F (Frustration threshold)", "Label"], "items": [{"data": [0.0, 500, 1500, "207 /emailMobileExistLead.php"], "isController": false}, {"data": [0.0, 500, 1500, "173 /getPromoPlans.php"], "isController": false}, {"data": [0.0, 500, 1500, "106 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "102 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "78 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "178 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "170 /getCategoryServices.php"], "isController": false}, {"data": [0.0, 500, 1500, "148 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "99 /themes/SuiteR/css/colourSelector.php"], "isController": false}, {"data": [0.95, 500, 1500, "76 /success.txt"], "isController": false}, {"data": [0.0, 500, 1500, "204 /emailMobileExistLead.php"], "isController": false}, {"data": [0.0, 500, 1500, "201 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "211 /themes/SuiteR/css/colourSelector.php"], "isController": false}, {"data": [0.0, 500, 1500, "172 /MasterData/pinCodeMasterData.php"], "isController": false}, {"data": [0.0, 500, 1500, "105 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "209 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "138 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "191 /themes/SuiteR/css/colourSelector.php"], "isController": false}, {"data": [0.0, 500, 1500, "208 /emailMobileExistLead.php"], "isController": false}, {"data": [0.0, 500, 1500, "205 /emailMobileExistLead.php"], "isController": false}, {"data": [0.0, 500, 1500, "149 /vcal_server.php"], "isController": false}, {"data": [0.0, 500, 1500, "176 /promotions.php"], "isController": false}, {"data": [1.0, 500, 1500, "77 /success.txt"], "isController": false}, {"data": [0.0, 500, 1500, "109 /themes/SuiteR/css/colourSelector.php"], "isController": false}, {"data": [0.0, 500, 1500, "171 /MasterData/getHAServicePincodelist.php"], "isController": false}, {"data": [0.0, 500, 1500, "210 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "151 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "202 /emailMobileExistLead.php"], "isController": false}, {"data": [0.0, 500, 1500, "206 /emailMobileExistLead.php"], "isController": false}, {"data": [0.0, 500, 1500, "90 /themes/SuiteR/css/colourSelector.php"], "isController": false}, {"data": [0.0, 500, 1500, "152 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "169 /getCategoryProducts.php"], "isController": false}, {"data": [0.0, 500, 1500, "128 /themes/SuiteR/css/colourSelector.php"], "isController": false}, {"data": [0.0, 500, 1500, "142 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "174 /promotions.php"], "isController": false}, {"data": [0.0, 500, 1500, "175 /getPromoPlans.php"], "isController": false}]}, function(index, item){
        switch(index){
            case 0:
                item = item.toFixed(3);
                break;
            case 1:
            case 2:
                item = formatDuration(item);
                break;
        }
        return item;
    }, [[0, 0]], 3);

    // Create statistics table
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 360, 340, 94.44444444444444, 19868.838888888888, 21021.0, 21027.0, 21047.41, 0.4603256804188964, 1.0867052589012283, 0.009065658745228918, 398, 21733], "isController": false}, "titles": ["Label", "#Samples", "KO", "Error %", "Average response time", "90th pct", "95th pct", "99th pct", "Throughput", "Received KB/sec", "Sent KB/sec", "Min", "Max"], "items": [{"data": ["207 /emailMobileExistLead.php", 10, 10, 100.0, 21005.9, 21011.5, 21012.0, 21012.0, 0.15396221767178334, 0.3814474084309711, 0.0, 21003, 21012], "isController": false}, {"data": ["173 /getPromoPlans.php", 10, 10, 100.0, 21012.0, 21031.1, 21032.0, 21032.0, 0.15395510669088894, 0.3814297906980325, 0.0, 21002, 21032], "isController": false}, {"data": ["106 /index.php", 10, 10, 100.0, 21011.699999999997, 21020.9, 21021.0, 21021.0, 0.1540048973557359, 0.38155314901513865, 0.0, 21007, 21021], "isController": false}, {"data": ["102 /index.php", 10, 10, 100.0, 21016.0, 21036.3, 21037.0, 21037.0, 0.15395036640187204, 0.38141804644682553, 0.0, 21004, 21037], "isController": false}, {"data": ["78 /index.php", 10, 10, 100.0, 21088.7, 21663.7, 21733.0, 21733.0, 0.15230900450834656, 0.3773515082399171, 0.0, 21005, 21733], "isController": false}, {"data": ["178 /index.php", 10, 10, 100.0, 21011.100000000002, 21026.4, 21027.0, 21027.0, 0.15398118349937637, 0.3814943970096854, 0.0, 21004, 21027], "isController": false}, {"data": ["170 /getCategoryServices.php", 10, 10, 100.0, 21010.4, 21028.3, 21030.0, 21030.0, 0.1539882968894364, 0.3815120207114259, 0.0, 21002, 21030], "isController": false}, {"data": ["148 /index.php", 10, 10, 100.0, 21009.5, 21013.9, 21014.0, 21014.0, 0.15395036640187204, 0.38141804644682553, 0.0, 21006, 21014], "isController": false}, {"data": ["99 /themes/SuiteR/css/colourSelector.php", 10, 10, 100.0, 21013.8, 21027.7, 21028.0, 21028.0, 0.15395273650989147, 0.381423918482026, 0.0, 21004, 21028], "isController": false}, {"data": ["76 /success.txt", 10, 0, 0.0, 422.40000000000003, 556.2, 572.0, 572.0, 0.22106287028030774, 0.0828985763551154, 0.07836506046069502, 398, 572], "isController": false}, {"data": ["204 /emailMobileExistLead.php", 10, 10, 100.0, 21009.6, 21020.9, 21022.0, 21022.0, 0.15396695869066498, 0.3814591544904464, 0.0, 21004, 21022], "isController": false}, {"data": ["201 /index.php", 10, 10, 100.0, 21014.2, 21028.5, 21029.0, 21029.0, 0.15396458814472672, 0.38145328137028484, 0.0, 21005, 21029], "isController": false}, {"data": ["211 /themes/SuiteR/css/colourSelector.php", 10, 10, 100.0, 21006.3, 21011.0, 21011.0, 21011.0, 0.1540784567501772, 0.38173539528828077, 0.0, 21002, 21011], "isController": false}, {"data": ["172 /MasterData/pinCodeMasterData.php", 10, 10, 100.0, 21009.0, 21013.8, 21014.0, 21014.0, 0.15401438494355374, 0.3815766548845662, 0.0, 21006, 21014], "isController": false}, {"data": ["105 /index.php", 10, 10, 100.0, 21015.9, 21028.8, 21029.0, 21029.0, 0.1539598472718315, 0.3814415356724966, 0.0, 21007, 21029], "isController": false}, {"data": ["209 /index.php", 10, 10, 100.0, 21026.600000000002, 21075.2, 21077.0, 21077.0, 0.1539408866995074, 0.3813945601139163, 0.0, 21008, 21077], "isController": false}, {"data": ["138 /index.php", 10, 10, 100.0, 21009.899999999998, 21016.8, 21017.0, 21017.0, 0.15397644160443452, 0.38148264877973675, 0.0, 21004, 21017], "isController": false}, {"data": ["191 /themes/SuiteR/css/colourSelector.php", 10, 10, 100.0, 21011.5, 21021.9, 21022.0, 21022.0, 0.1539906681655092, 0.38151789564052424, 0.0, 21003, 21022], "isController": false}, {"data": ["208 /emailMobileExistLead.php", 10, 10, 100.0, 21008.0, 21012.0, 21012.0, 21012.0, 0.15396932930960153, 0.38146502779146396, 0.0, 21004, 21012], "isController": false}, {"data": ["205 /emailMobileExistLead.php", 10, 10, 100.0, 21006.8, 21010.8, 21011.0, 21011.0, 0.15395747694486783, 0.38143566309485316, 0.0, 21005, 21011], "isController": false}, {"data": ["149 /vcal_server.php", 10, 10, 100.0, 21011.500000000004, 21022.9, 21024.0, 21024.0, 0.15393851695632765, 0.38138868898262035, 0.0, 21003, 21024], "isController": false}, {"data": ["176 /promotions.php", 10, 10, 100.0, 21006.8, 21012.0, 21012.0, 21012.0, 0.15396458814472672, 0.38145328137028484, 0.0, 21001, 21012], "isController": false}, {"data": ["77 /success.txt", 10, 0, 0.0, 408.5, 425.5, 427.0, 427.0, 0.22195587517201582, 0.08323345318950592, 0.07868162371820482, 402, 427], "isController": false}, {"data": ["109 /themes/SuiteR/css/colourSelector.php", 10, 10, 100.0, 21013.000000000004, 21021.8, 21022.0, 21022.0, 0.1539906681655092, 0.38151789564052424, 0.0, 21007, 21022], "isController": false}, {"data": ["171 /MasterData/getHAServicePincodelist.php", 10, 10, 100.0, 21009.1, 21012.9, 21013.0, 21013.0, 0.15400726914310356, 0.38155902521098994, 0.0, 21003, 21013], "isController": false}, {"data": ["210 /index.php", 10, 10, 100.0, 21005.5, 21011.5, 21012.0, 21012.0, 0.15407608276967166, 0.3817295136588447, 0.0, 21002, 21012], "isController": false}, {"data": ["151 /index.php", 10, 10, 100.0, 21011.0, 21030.2, 21032.0, 21032.0, 0.1540025256414205, 0.38154727300027724, 0.0, 21005, 21032], "isController": false}, {"data": ["202 /emailMobileExistLead.php", 10, 10, 100.0, 21012.4, 21024.7, 21026.0, 21026.0, 0.15396221767178334, 0.3814474084309711, 0.0, 21007, 21026], "isController": false}, {"data": ["206 /emailMobileExistLead.php", 10, 10, 100.0, 21005.600000000002, 21008.0, 21008.0, 21008.0, 0.1539598472718315, 0.3814415356724966, 0.0, 21004, 21008], "isController": false}, {"data": ["90 /themes/SuiteR/css/colourSelector.php", 10, 10, 100.0, 21015.8, 21027.0, 21027.0, 21027.0, 0.15397407076648292, 0.38147677493610077, 0.0, 21003, 21027], "isController": false}, {"data": ["152 /index.php", 10, 10, 100.0, 21011.6, 21034.1, 21036.0, 21036.0, 0.15398118349937637, 0.3814943970096854, 0.0, 21006, 21036], "isController": false}, {"data": ["169 /getCategoryProducts.php", 10, 10, 100.0, 21010.6, 21026.3, 21027.0, 21027.0, 0.15399303951461393, 0.38152377075056204, 0.0, 21004, 21027], "isController": false}, {"data": ["128 /themes/SuiteR/css/colourSelector.php", 10, 10, 100.0, 21010.100000000002, 21017.8, 21018.0, 21018.0, 0.1539954109367541, 0.381529646041548, 0.0, 21005, 21018], "isController": false}, {"data": ["142 /index.php", 10, 10, 100.0, 21009.699999999997, 21012.9, 21013.0, 21013.0, 0.15396458814472672, 0.38145328137028484, 0.0, 21006, 21013], "isController": false}, {"data": ["174 /promotions.php", 10, 10, 100.0, 21009.1, 21017.5, 21018.0, 21018.0, 0.1539598472718315, 0.3814415356724966, 0.0, 21003, 21018], "isController": false}, {"data": ["175 /getPromoPlans.php", 10, 10, 100.0, 21008.600000000002, 21010.9, 21011.0, 21011.0, 0.15395747694486783, 0.38143566309485316, 0.0, 21007, 21011], "isController": false}]}, function(index, item){
        switch(index){
            // Errors pct
            case 3:
                item = item.toFixed(2) + '%';
                break;
            // Mean
            case 4:
            // Percentile 1
            case 5:
            // Percentile 2
            case 6:
            // Percentile 3
            case 7:
            // Throughput
            case 8:
            // Kbytes/s
            case 9:
            // Sent Kbytes/s
            case 10:
                item = item.toFixed(2);
                break;
        }
        return item;
    }, [[0, 0]], 0);
    
    // Create error table
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 340, 100.0, 94.44444444444444], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);
    
        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 360, 340, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 340, null, null, null, null, null, null, null, null], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["207 /emailMobileExistLead.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["173 /getPromoPlans.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["106 /index.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["102 /index.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["78 /index.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["178 /index.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["170 /getCategoryServices.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["148 /index.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["99 /themes/SuiteR/css/colourSelector.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": [], "isController": false}, {"data": ["204 /emailMobileExistLead.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["201 /index.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["211 /themes/SuiteR/css/colourSelector.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["172 /MasterData/pinCodeMasterData.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["105 /index.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["209 /index.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["138 /index.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["191 /themes/SuiteR/css/colourSelector.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["208 /emailMobileExistLead.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["205 /emailMobileExistLead.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["149 /vcal_server.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["176 /promotions.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": [], "isController": false}, {"data": ["109 /themes/SuiteR/css/colourSelector.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["171 /MasterData/getHAServicePincodelist.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["210 /index.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["151 /index.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["202 /emailMobileExistLead.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["206 /emailMobileExistLead.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["90 /themes/SuiteR/css/colourSelector.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["152 /index.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["169 /getCategoryProducts.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["128 /themes/SuiteR/css/colourSelector.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["142 /index.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["174 /promotions.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["175 /getPromoPlans.php", 10, 10, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 10, null, null, null, null, null, null, null, null], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);
    
});
