function startTimer() {
    timePassed = 0;
    timeLeft = mySettings.refreshRateSeconds();
    timerIntervalId = setInterval(() => 
    {
      // The amount of time passed increments by one
      timePassed = timePassed += (isPaused) ? 0 : 1;
      timeLeft = mySettings.refreshRateSeconds() - timePassed;
      if (timeLeft < 0) timeLeft = 0;
      
      // The time left label is updated
      $('#spnTimeLeft').html(updateTimer_FormatTimeLeft(timeLeft)); 
      updateTimer_SetCircleDasharray();
      updateTimer_SetRemainingPathColor(timeLeft);
    }, 1000);
}

function updateTimer()
{
    $('#divTimer').html(`
        <div class="base-timer">
            <svg class="base-timer__svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <g class="base-timer__circle">
                    <circle class="base-timer__path-elapsed" cx="50" cy="50" r="45" />
                    <path
                        id="base-timer-path-remaining"
                        stroke-dasharray="283"
                        class="base-timer__path-remaining ${remainingPathColor}"
                        d="
                        M 50, 50
                        m -45, 0
                        a 45,45 0 1,0 90,0
                        a 45,45 0 1,0 -90,0
                        "
                    ></path>
                </g>
            </svg>
            <span class="base-timer__label" id="spnTimeLeft">
                ${updateTimer_FormatTimeLeft(timeLeft)}
            </span>
        </div>
    `);
}

function updateTimer_FormatTimeLeft(time) 
{
    // The largest round integer less than or equal to the result of time divided being by 60.
    const minutes = Math.floor(time / 60);

    // Seconds are the remainder of the time divided by 60 (modulus operator)
    let seconds = time % 60;

    // If the value of seconds is less than 10, then display seconds with a leading zero
    if (seconds < 10) {
        seconds = `0${seconds}`;
    }

    // The output in MM:SS format
    return `${minutes}:${seconds}`;
}

// Update the dasharray value as time passes, starting with 283
function updateTimer_SetCircleDasharray() 
{
    const circleDashArray = `${(
      (timeLeft / mySettings.refreshRateSeconds()) * FULL_DASH_ARRAY
    ).toFixed(0)} 283`;

    $(".base-timer__path-remaining").attr("stroke-dasharray", circleDashArray);
}
  
function updateTimer_SetRemainingPathColor(timeLeft) 
{
    var { alert, warning, info } = colorCodes;
  
    // If the remaining time is less than or equal to 5, remove the "warning" class and apply the "alert" class.
    if (timeLeft <= warning.threshold) {
        $(".base-timer__path-remaining").removeClass(alert.color);
        $(".base-timer__path-remaining").addClass(warning.color);
    } 
    // If the remaining time is less than or equal to 10, remove the base color and apply the "warning" class.
    else if (timeLeft <= alert.threshold) 
    {
        $(".base-timer__path-remaining").removeClass(info.color);
        $(".base-timer__path-remaining").addClass(alert.color);
    }
  }
  
var timerThresholds = {alert: 10, warning: 5}

var colorCodes = {
    info: {
        color: "info"
    },
    warning: {
        color: "warning",
        threshold: timerThresholds.warning
    },
    alert: {
        color: "alert",
        threshold: timerThresholds.alert
    }
};

var  remainingPathColor = colorCodes.info.color;
var timeLeft = 0;
var timePassed = 0;