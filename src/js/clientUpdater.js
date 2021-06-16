window.onload = function(){
    var lblXPPath = document.getElementById('lblXPPath');
    var lblP3DPath = document.getElementById('lblP3DPath');
    var modelCTU = 0;
    var prgXPIncrementer = 0;
    var prgP3DIncrementer = 0;
    var prgModelIncrementer = 0;

    //*****START XPLANE DEFAULTS */
    ipcRenderer.send('load-xp-dir');
    ipcRenderer.on('load-xp-dir-resp', (event, arg) => {
        log.info("Rx load-xp-dir-resp: " + arg);

        if(arg == "" || arg == null) {
            lblXPPath.innerHTML = "XPlane Base Dir: Not Detected. Please Select!"
            $('#btnCheckXP').attr("disabled", true);
            $('#btnCheckModels').attr("disabled", true);
        } else {
            lblXPPath.innerHTML = lblXPPath.innerHTML + " " + arg;
            $('#btnCheckXP').attr("disabled", false);
            $('#btnCheckModels').attr("disabled", false);
        }


    });

    $('#lblXPPath').click(function() {
        log.info('Opening ofd');
        ipcRenderer.send('show-ofd-xp');

        ipcRenderer.on('ofd-result-xp', (event, arg) => {
            log.info("Rx ofd result: " + arg);
            lblXPPath.innerHTML = "XPlane Base Dir: " + arg;
            $('#btnCheckXP').attr("disabled", false);
            $('#btnCheckModels').attr("disabled", false);
        });
    });

    $('#btnCheckXP').click(function() {
        $('#prgDL').attr('aria-valuenow', 0).css('width', 0);
        $('#prgDL').text('Checking...');
        ipcRenderer.send('check-xp-updates');

        ipcRenderer.on('no-xp-updates', (event, arg) => {
            $('#prgDL').attr('aria-valuenow', 400).css('width', 400);
            $('#prgDL').text('No Updates Available');
        });

        ipcRenderer.on('down-item-result-xp', (event, arg) => {
            prgXPIncrementer += 20;
            $('#prgDL').attr('aria-valuenow', prgXPIncrementer).css('width', prgXPIncrementer);
            $('#prgDL').text(arg);
        });

        ipcRenderer.on('updater-finished-xp', (event, arg) => {
            $('#prgDL').attr('aria-valuenow', 400).css('width', 400);
            $('#prgDL').text('Done!');
        });
    });
    //*****END XPLANE DEFAULTS */

    //*****START P3D DEFAULTS */
    ipcRenderer.send('load-p3d-dir');
    ipcRenderer.on('load-p3d-dir-resp', (event, arg1) => {
        log.info("Rx load-p3d-dir-resp: " + arg1);
 
        if(arg1 == "" || arg1 == null) {
            lblP3DPath.innerHTML = "P3D Pilot Client Dir: Not Detected. Please Select!";
            $('#btnCheckP3D').attr("disabled", true);
        } else {
            lblP3DPath.innerHTML = lblP3DPath.innerHTML + " " + arg1;
            $('#btnCheckP3D').attr("disabled", false);
        }
 
 
    });
 
    $('#lblP3DPath').click(function() {
        log.info('Opening ofd');
        ipcRenderer.send('show-ofd-p3d');
 
        ipcRenderer.on('ofd-result-p3d', (event, arg2) => {
            var dir = arg2.replace(/\\\\/g, "\\");
            log.info("Rx ofd result: " + dir);
            lblP3DPath.innerHTML = "P3D Pilot Client Dir: " + dir;
            $('#btnCheckP3D').attr("disabled", false);
        });
    });
 
    $('#btnCheckP3D').click(function() {
        $('#prgDL').attr('aria-valuenow', 0).css('width', 0);
        $('#prgDL').text('Checking...');
        ipcRenderer.send('check-p3d-updates');

        ipcRenderer.on('no-p3d-updates', (event, arg) => {
            $('#prgDL').attr('aria-valuenow', 400).css('width', 400);
            $('#prgDL').text('No Updates Available');
        });

        ipcRenderer.on('down-item-result-p3d', (event, arg) => {
            prgP3DIncrementer += 10;
            $('#prgDL').attr('aria-valuenow', prgP3DIncrementer).css('width', prgP3DIncrementer);
            $('#prgDL').text(arg);
        });

        ipcRenderer.on('updater-finished-p3d', (event, arg) => {
            $('#prgDL').attr('aria-valuenow', 400).css('width', 400);
            $('#prgDL').text('Done!');
        });
    });
    //*****END P3D DEFAULTS */   

    //*****START MODEL DEFAULTS */
    $('#btnCheckModels').click(function() {
        $('#prgDL').attr('aria-valuenow', 0).css('width', 0);
        $('#prgDL').text('Checking...');
        ipcRenderer.send('check-model-updates');
    
        ipcRenderer.on('no-model-updates', (event, arg) => {
            $('#prgDL').attr('aria-valuenow', 400).css('width', 400);
            $('#prgDL').text('No Updates Available!');
        });

        ipcRenderer.on('down-item-result-model', (event, arg) => {
            modelCTU++;
            prgModelIncrementer += .05;
            $('#prgDL').attr('aria-valuenow', prgModelIncrementer).css('width', prgModelIncrementer);
            $('#prgDL').text(arg);
        });

        ipcRenderer.on('updater-finished-model', (event, arg) => {
            $('#prgDL').attr('aria-valuenow', 400).css('width', 400);
            $('#prgDL').text('Done!');
            log.info("Model Counter: " + modelCTU);
        });
    });
    //*****END MODEL DEFAULTS */ 
}