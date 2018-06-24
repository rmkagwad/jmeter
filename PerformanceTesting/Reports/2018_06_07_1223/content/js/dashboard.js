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

    var data = {"OkPercent": 74.26669953167365, "KoPercent": 25.733300468326348};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.006250220078171767, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)  ", "F (Frustration threshold)", "Label"], "items": [{"data": [0.003911342894393742, 500, 1500, "207 /emailMobileExistLead.php"], "isController": false}, {"data": [0.0, 500, 1500, "173 /getPromoPlans.php"], "isController": false}, {"data": [0.0, 500, 1500, "106 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "102 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "78 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "178 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "170 /getCategoryServices.php"], "isController": false}, {"data": [0.0, 500, 1500, "148 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "99 /themes/SuiteR/css/colourSelector.php"], "isController": false}, {"data": [0.0750256937307297, 500, 1500, "76 /success.txt"], "isController": false}, {"data": [0.0, 500, 1500, "204 /emailMobileExistLead.php"], "isController": false}, {"data": [0.0, 500, 1500, "201 /index.php"], "isController": false}, {"data": [0.04563233376792699, 500, 1500, "211 /themes/SuiteR/css/colourSelector.php"], "isController": false}, {"data": [0.0, 500, 1500, "172 /MasterData/pinCodeMasterData.php"], "isController": false}, {"data": [0.0, 500, 1500, "105 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "209 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "138 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "191 /themes/SuiteR/css/colourSelector.php"], "isController": false}, {"data": [0.002607561929595828, 500, 1500, "208 /emailMobileExistLead.php"], "isController": false}, {"data": [0.0, 500, 1500, "205 /emailMobileExistLead.php"], "isController": false}, {"data": [0.0, 500, 1500, "149 /vcal_server.php"], "isController": false}, {"data": [0.0, 500, 1500, "176 /promotions.php"], "isController": false}, {"data": [0.06781485468245425, 500, 1500, "77 /success.txt"], "isController": false}, {"data": [0.0, 500, 1500, "109 /themes/SuiteR/css/colourSelector.php"], "isController": false}, {"data": [0.0, 500, 1500, "171 /MasterData/getHAServicePincodelist.php"], "isController": false}, {"data": [0.0, 500, 1500, "210 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "151 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "202 /emailMobileExistLead.php"], "isController": false}, {"data": [0.001955671447196871, 500, 1500, "206 /emailMobileExistLead.php"], "isController": false}, {"data": [0.0, 500, 1500, "90 /themes/SuiteR/css/colourSelector.php"], "isController": false}, {"data": [0.0, 500, 1500, "152 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "169 /getCategoryProducts.php"], "isController": false}, {"data": [0.0, 500, 1500, "128 /themes/SuiteR/css/colourSelector.php"], "isController": false}, {"data": [0.0, 500, 1500, "142 /index.php"], "isController": false}, {"data": [0.0, 500, 1500, "174 /promotions.php"], "isController": false}, {"data": [0.0, 500, 1500, "175 /getPromoPlans.php"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 28399, 7308, 25.733300468326348, 58152.896404802996, 95265.60000000003, 117964.30000000005, 149700.89000000083, 12.182242469478975, 64.5602495302808, 12.561871412090658, 400, 652797], "isController": false}, "titles": ["Label", "#Samples", "KO", "Error %", "Average response time", "90th pct", "95th pct", "99th pct", "Throughput", "Received KB/sec", "Sent KB/sec", "Min", "Max"], "items": [{"data": ["207 /emailMobileExistLead.php", 767, 456, 59.452411994784875, 52108.752281616726, 105348.80000000006, 123992.59999999999, 134878.28, 1.3554325985957931, 0.35265221943252084, 0.7400441642176397, 400, 165864], "isController": false}, {"data": ["173 /getPromoPlans.php", 767, 94, 12.25554106910039, 46678.28422425032, 60424.60000000003, 120927.4, 151621.31999999966, 1.1331001146395945, 96.11749436589236, 0.6416146505819141, 11683, 252698], "isController": false}, {"data": ["106 /index.php", 768, 100, 13.020833333333334, 88624.88020833339, 236666.70000000004, 259606.54999999993, 302322.25999999896, 1.0536179016266598, 18.37630454667678, 1.0129352218771135, 7497, 468855], "isController": false}, {"data": ["102 /index.php", 841, 70, 8.323424494649228, 127264.97027348394, 235766.0, 244449.0, 250141.18000000002, 1.1137759919691586, 0.6684616606453013, 0.4889440702519835, 6223, 268509], "isController": false}, {"data": ["78 /index.php", 892, 258, 28.923766816143498, 224723.66591928242, 453069.9000000001, 466121.14999999997, 505119.67999999993, 1.2531698031034215, 17.31098430069402, 0.31400861993270535, 16290, 559157], "isController": false}, {"data": ["178 /index.php", 767, 405, 52.803129074315514, 43709.104302477135, 118848.20000000008, 126864.59999999992, 132782.32, 0.9658696667812613, 8.564034622633967, 0.4528436389076732, 5567, 238780], "isController": false}, {"data": ["170 /getCategoryServices.php", 767, 34, 4.432855280312907, 16559.099087353316, 23499.4, 33188.5999999998, 124188.35999999988, 1.6118186021098642, 0.6904563251271382, 0.7891489388948429, 4874, 130661], "isController": false}, {"data": ["148 /index.php", 767, 1, 0.1303780964797914, 15488.78357235985, 21705.2, 26616.59999999999, 42850.91999999997, 1.805751093574163, 2.5341989311754567, 0.9410640114631057, 4437, 119191], "isController": false}, {"data": ["99 /themes/SuiteR/css/colourSelector.php", 861, 142, 16.492450638792103, 97728.46689895475, 215982.40000000002, 245872.3, 294475.55999999994, 0.8252240612716886, 0.534991101106241, 0.32800649684239175, 5782, 333137], "isController": false}, {"data": ["76 /success.txt", 973, 90, 9.249743062692703, 47693.586844809855, 222786.8, 273023.0, 402900.0, 2.124936666841379, 1.1564635617312664, 0.7006294653971644, 509, 406691], "isController": false}, {"data": ["204 /emailMobileExistLead.php", 767, 498, 64.92829204693612, 51252.32985658408, 115819.40000000001, 128752.99999999999, 183009.59999999803, 1.2195199511556025, 0.27437521961694034, 0.674688581191091, 8003, 215993], "isController": false}, {"data": ["201 /index.php", 767, 0, 0.0, 33067.91134289437, 86901.0, 97339.99999999983, 121109.32, 1.032313984960787, 0.41937755639031965, 0.587970036396807, 7534, 125298], "isController": false}, {"data": ["211 /themes/SuiteR/css/colourSelector.php", 767, 6, 0.7822685788787483, 17537.176010430252, 47209.80000000003, 50873.59999999999, 80497.99999999997, 1.7560930935400043, 0.39456465433356613, 1.047301877869106, 547, 136863], "isController": false}, {"data": ["172 /MasterData/pinCodeMasterData.php", 767, 0, 0.0, 19835.970013037822, 28810.60000000001, 86211.19999999988, 116738.36, 1.3979666602266638, 0.34266565597352794, 0.7240375423308679, 6342, 142077], "isController": false}, {"data": ["105 /index.php", 792, 426, 53.78787878787879, 310218.1919191919, 506534.9, 551634.6999999996, 597402.7299999999, 0.8865903213889915, 11.367674627928714, 1.247518664783222, 22634, 652797], "isController": false}, {"data": ["209 /index.php", 767, 420, 54.758800521512384, 70722.75619295968, 121024.0, 139476.39999999994, 207633.5999999995, 1.41318667145713, 13.855009819873974, 25.919252912279248, 4129, 268891], "isController": false}, {"data": ["138 /index.php", 767, 7, 0.9126466753585397, 15705.271186440683, 24858.6, 31131.2, 50518.639999999934, 2.3704811736817866, 1.4166936529748457, 1.017998716633237, 3799, 230035], "isController": false}, {"data": ["191 /themes/SuiteR/css/colourSelector.php", 767, 4, 0.5215123859191656, 43604.77705345499, 112234.20000000004, 118799.0, 125723.55999999997, 1.0079823793640907, 0.22141633393063187, 0.5437004653704828, 7128, 177428], "isController": false}, {"data": ["208 /emailMobileExistLead.php", 767, 443, 57.75749674054759, 55596.83572359832, 102641.40000000001, 121696.8, 201022.91999999998, 1.4098850033822534, 0.4749957233564822, 0.7239759348759963, 584, 213034], "isController": false}, {"data": ["205 /emailMobileExistLead.php", 767, 487, 63.49413298565841, 62110.139504563245, 118769.60000000003, 130771.99999999997, 207220.08, 1.2557589728644731, 0.29878253185240006, 0.6923040301758718, 1610, 224264], "isController": false}, {"data": ["149 /vcal_server.php", 767, 762, 99.34810951760105, 15014.249022164275, 20946.2, 23257.6, 45727.03999999999, 1.7252121651075278, 0.8003439986178058, 0.8933889664584566, 3077, 202838], "isController": false}, {"data": ["176 /promotions.php", 767, 324, 42.24250325945241, 38498.15254237285, 116838.8, 123139.19999999994, 130634.68, 0.9841345197692994, 0.27453113873153145, 0.5032818183713664, 6495, 186012], "isController": false}, {"data": ["77 /success.txt", 929, 96, 10.333692142088267, 45435.08180839613, 235645.0, 274116.0, 356990.30000000494, 2.0150969589171837, 1.09771878118086, 0.6643556678669038, 513, 407332], "isController": false}, {"data": ["109 /themes/SuiteR/css/colourSelector.php", 767, 8, 1.0430247718383312, 20974.868318122564, 32634.00000000002, 34788.6, 120510.47999999425, 1.570578779781102, 0.3661127023374389, 0.7601951801199947, 4222, 219891], "isController": false}, {"data": ["171 /MasterData/getHAServicePincodelist.php", 767, 8, 1.0430247718383312, 17137.47848761408, 24078.800000000003, 31087.799999999927, 111807.64, 1.4042372446924591, 0.3339365162787164, 0.7604151505206846, 4866, 252122], "isController": false}, {"data": ["210 /index.php", 767, 288, 37.54889178617992, 43746.8709256845, 98555.60000000002, 119277.79999999999, 162507.47999999998, 1.4672405547584888, 18.987913229316117, 1.6082541248206599, 3290, 207714], "isController": false}, {"data": ["151 /index.php", 767, 3, 0.39113428943937417, 13119.388526727504, 18894.0, 23926.59999999998, 37072.39999999962, 1.675459003680767, 1.1570042261924265, 0.7600584540231767, 5241, 123550], "isController": false}, {"data": ["202 /emailMobileExistLead.php", 767, 423, 55.14993481095176, 34290.302477183846, 77990.40000000026, 96783.6, 126067.79999999992, 1.206828731020376, 0.27214371410589255, 0.6670710900007868, 9032, 208730], "isController": false}, {"data": ["206 /emailMobileExistLead.php", 767, 482, 62.84224250325945, 70109.68187744469, 129452.00000000006, 159862.2, 213028.92, 1.3130503855266582, 0.32013092841393104, 0.7245075419080489, 1268, 214932], "isController": false}, {"data": ["90 /themes/SuiteR/css/colourSelector.php", 867, 276, 31.833910034602077, 134227.2722029988, 313794.2, 320358.39999999997, 364200.11999999644, 0.9547354105527445, 0.9945881034544464, 0.29737191390312795, 5223, 440828], "isController": false}, {"data": ["152 /index.php", 767, 0, 0.0, 12940.88005215125, 18965.2, 22619.39999999999, 39822.519999999866, 1.7021106616039785, 0.9873571611257453, 0.7884762031836349, 3082, 122370], "isController": false}, {"data": ["169 /getCategoryProducts.php", 767, 18, 2.346805736636245, 14166.134289439387, 20043.200000000008, 27181.8, 48014.07999999959, 1.6560759851708868, 1.7580899858413062, 0.8087046515601014, 4777, 120291], "isController": false}, {"data": ["128 /themes/SuiteR/css/colourSelector.php", 767, 60, 7.822685788787484, 19660.03911342894, 32253.600000000002, 39422.59999999988, 59329.96, 2.696763532162509, 1.0309470206388551, 1.217023182453457, 5041, 88932], "isController": false}, {"data": ["142 /index.php", 767, 20, 2.607561929595828, 45356.38070404175, 60662.20000000001, 71388.0, 100329.43999999962, 1.6692347200821775, 30.980013491801813, 1.685172412550164, 9232, 332810], "isController": false}, {"data": ["174 /promotions.php", 767, 274, 35.72359843546284, 35908.67535853976, 125594.4, 131230.59999999992, 138772.24, 1.0962655506769117, 0.3194547249116699, 0.5577581512417673, 6483, 193543], "isController": false}, {"data": ["175 /getPromoPlans.php", 767, 325, 42.3728813559322, 41344.47066492831, 117606.6, 118482.8, 123558.75999999988, 1.048904667283884, 1.3282237728533353, 0.568369928043362, 5570, 146426], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["Non HTTP response code: java.net.SocketException/Non HTTP response message: Software caused connection abort: recv failed", 672, 9.195402298850574, 2.366280502834607], "isController": false}, {"data": ["Non HTTP response code: java.net.SocketException/Non HTTP response message: Unrecognized Windows Sockets error: 0: recv failed", 31, 0.42419266557197594, 0.1091587731962393], "isController": false}, {"data": ["Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 162, 2.2167487684729066, 0.570442621219057], "isController": false}, {"data": ["500/Internal Server Error", 5022, 68.7192118226601, 17.68372125779077], "isController": false}, {"data": ["Non HTTP response code: javax.net.ssl.SSLHandshakeException/Non HTTP response message: Remote host closed connection during handshake", 147, 2.0114942528735633, 0.5176238599950702], "isController": false}, {"data": ["408/Request Time-out", 53, 0.7252326217843459, 0.18662628965808656], "isController": false}, {"data": ["Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 19, 0.25998905309250137, 0.0669037642170499], "isController": false}, {"data": ["Non HTTP response code: java.net.SocketException/Non HTTP response message: Software caused connection abort: socket write error", 9, 0.12315270935960591, 0.031691256734392055], "isController": false}, {"data": ["401/Unauthorized", 758, 10.372194854953475, 2.6691080671854643], "isController": false}, {"data": ["Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 405, 5.541871921182266, 1.4261065530476424], "isController": false}, {"data": ["Non HTTP response code: java.net.SocketTimeoutException/Non HTTP response message: Read timed out", 30, 0.41050903119868637, 0.10563752244797352], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);
    
        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 28399, 7308, "500/Internal Server Error", 5022, "401/Unauthorized", 758, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Software caused connection abort: recv failed", 672, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 405, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 162], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["207 /emailMobileExistLead.php", 767, 456, "500/Internal Server Error", 441, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 14, "Non HTTP response code: javax.net.ssl.SSLHandshakeException/Non HTTP response message: Remote host closed connection during handshake", 1, null, null, null, null], "isController": false}, {"data": ["173 /getPromoPlans.php", 767, 94, "500/Internal Server Error", 92, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 2, null, null, null, null, null, null], "isController": false}, {"data": ["106 /index.php", 768, 100, "500/Internal Server Error", 55, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 22, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 17, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Software caused connection abort: recv failed", 3, null, null], "isController": false}, {"data": ["102 /index.php", 841, 70, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Software caused connection abort: recv failed", 42, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 28, null, null, null, null, null, null], "isController": false}, {"data": ["78 /index.php", 892, 258, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Software caused connection abort: recv failed", 161, "Non HTTP response code: javax.net.ssl.SSLHandshakeException/Non HTTP response message: Remote host closed connection during handshake", 55, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 38, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Software caused connection abort: socket write error", 4, null, null], "isController": false}, {"data": ["178 /index.php", 767, 405, "500/Internal Server Error", 370, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 25, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 8, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Unrecognized Windows Sockets error: 0: recv failed", 1, null, null], "isController": false}, {"data": ["170 /getCategoryServices.php", 767, 34, "500/Internal Server Error", 34, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["148 /index.php", 767, 1, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 1, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["99 /themes/SuiteR/css/colourSelector.php", 861, 142, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Software caused connection abort: recv failed", 107, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 32, "Non HTTP response code: javax.net.ssl.SSLHandshakeException/Non HTTP response message: Remote host closed connection during handshake", 3, null, null, null, null], "isController": false}, {"data": ["76 /success.txt", 973, 90, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Software caused connection abort: recv failed", 68, "408/Request Time-out", 22, null, null, null, null, null, null], "isController": false}, {"data": ["204 /emailMobileExistLead.php", 767, 498, "500/Internal Server Error", 493, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 5, null, null, null, null, null, null], "isController": false}, {"data": [], "isController": false}, {"data": ["211 /themes/SuiteR/css/colourSelector.php", 767, 6, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 6, null, null, null, null, null, null, null, null], "isController": false}, {"data": [], "isController": false}, {"data": ["105 /index.php", 792, 426, "500/Internal Server Error", 225, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 133, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Software caused connection abort: recv failed", 57, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 8, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Unrecognized Windows Sockets error: 0: recv failed", 3], "isController": false}, {"data": ["209 /index.php", 767, 420, "500/Internal Server Error", 359, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 34, "Non HTTP response code: java.net.ConnectException/Non HTTP response message: Connection timed out: connect", 15, "Non HTTP response code: java.net.SocketTimeoutException/Non HTTP response message: Read timed out", 10, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Unrecognized Windows Sockets error: 0: recv failed", 2], "isController": false}, {"data": ["138 /index.php", 767, 7, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Unrecognized Windows Sockets error: 0: recv failed", 3, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 1, null, null, null, null, null, null], "isController": false}, {"data": ["191 /themes/SuiteR/css/colourSelector.php", 767, 4, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 3, "Non HTTP response code: javax.net.ssl.SSLHandshakeException/Non HTTP response message: Remote host closed connection during handshake", 1, null, null, null, null, null, null], "isController": false}, {"data": ["208 /emailMobileExistLead.php", 767, 443, "500/Internal Server Error", 401, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 20, "Non HTTP response code: java.net.SocketTimeoutException/Non HTTP response message: Read timed out", 16, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Unrecognized Windows Sockets error: 0: recv failed", 3, null, null], "isController": false}, {"data": ["205 /emailMobileExistLead.php", 767, 487, "500/Internal Server Error", 478, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 4, "Non HTTP response code: javax.net.ssl.SSLHandshakeException/Non HTTP response message: Remote host closed connection during handshake", 3, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 1, null, null], "isController": false}, {"data": ["149 /vcal_server.php", 767, 762, "401/Unauthorized", 758, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 2, "500/Internal Server Error", 1, null, null, null, null], "isController": false}, {"data": ["176 /promotions.php", 767, 324, "500/Internal Server Error", 323, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 1, null, null, null, null, null, null], "isController": false}, {"data": ["77 /success.txt", 929, 96, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Software caused connection abort: recv failed", 65, "408/Request Time-out", 31, null, null, null, null, null, null], "isController": false}, {"data": ["109 /themes/SuiteR/css/colourSelector.php", 767, 8, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 4, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Unrecognized Windows Sockets error: 0: recv failed", 2, null, null, null, null, null, null], "isController": false}, {"data": ["171 /MasterData/getHAServicePincodelist.php", 767, 8, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 6, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Unrecognized Windows Sockets error: 0: recv failed", 1, null, null, null, null, null, null], "isController": false}, {"data": ["210 /index.php", 767, 288, "500/Internal Server Error", 279, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 8, "Non HTTP response code: javax.net.ssl.SSLHandshakeException/Non HTTP response message: Remote host closed connection during handshake", 1, null, null, null, null], "isController": false}, {"data": ["151 /index.php", 767, 3, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 3, null, null, null, null, null, null, null, null], "isController": false}, {"data": ["202 /emailMobileExistLead.php", 767, 423, "500/Internal Server Error", 420, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 2, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Unrecognized Windows Sockets error: 0: recv failed", 1, null, null, null, null], "isController": false}, {"data": ["206 /emailMobileExistLead.php", 767, 482, "500/Internal Server Error", 471, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 6, "Non HTTP response code: java.net.SocketTimeoutException/Non HTTP response message: Read timed out", 3, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 1, null, null], "isController": false}, {"data": ["90 /themes/SuiteR/css/colourSelector.php", 867, 276, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Software caused connection abort: recv failed", 165, "Non HTTP response code: javax.net.ssl.SSLHandshakeException/Non HTTP response message: Remote host closed connection during handshake", 82, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 11, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 8, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Unrecognized Windows Sockets error: 0: recv failed", 5], "isController": false}, {"data": [], "isController": false}, {"data": ["169 /getCategoryProducts.php", 767, 18, "500/Internal Server Error", 16, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 2, null, null, null, null, null, null], "isController": false}, {"data": ["128 /themes/SuiteR/css/colourSelector.php", 767, 60, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 56, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 3, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Software caused connection abort: recv failed", 1, null, null, null, null], "isController": false}, {"data": ["142 /index.php", 767, 20, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 14, "500/Internal Server Error", 2, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Unrecognized Windows Sockets error: 0: recv failed", 1, null, null, null, null], "isController": false}, {"data": ["174 /promotions.php", 767, 274, "500/Internal Server Error", 272, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: 35.154.77.53:443 failed to respond", 2, null, null, null, null, null, null], "isController": false}, {"data": ["175 /getPromoPlans.php", 767, 325, "500/Internal Server Error", 290, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 25, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Unrecognized Windows Sockets error: 0: recv failed", 5, null, null, null, null], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);
    
});
