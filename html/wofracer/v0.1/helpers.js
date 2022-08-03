function distinct(arr, propName) 
{
    var result = arr.reduce(function (arr1, e1) {
        var matches = arr1.filter(function (e2) {
            return e1[propName] == e2[propName];
        })
        if (matches.length == 0)
            arr1.push(e1)
        return arr1;
    }, []);

    return result;
}

function roundTo(n, digits) 
{
    if (digits === undefined) {
        digits = 0;
    }

    var multiplicator = Math.pow(10, digits);
    n = parseFloat((n * multiplicator).toFixed(11));
    return Math.round(n) / multiplicator;
}

function saveFile(fileName, fileContent)
{
    var a = document.createElement("a");
    var file = new Blob([fileContent], {endings: 'native', type: 'text/plain'});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function saveLog()
{
    if ((!mySettings) || (!mySettings.enable_logging) || (!mySettings.enable_logging())) return;
    
    var formattedDate = moment(new Date()).format('YYYYMMDD-HHmmss');
    saveFile(`wofracer-log-${formattedDate}`, [messageLog.join('\n')])
    messageLog = [];
}

function Log(message, className, severity)
{
    if ((!mySettings) || (!mySettings.enable_logging) || (!mySettings.enable_logging())) return;

    //logCounter++;
    var formattedDate = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    console.log(message);
    /*
    messageLog.push(formattedDate + '\t' + severity + '\t' + message);
    if ((logCounter % 10000 == 0) && (messageLog.length > mySettings.max_log_entries()))
    {
        messageLog.splice(0, messageLog.length - mySettings.max_log_entries());
    }
    */
}

