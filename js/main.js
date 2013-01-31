$(function() {

    $('#editable').html(localStorage.getItem("myClipboard")).focus();
    var saveTimer, lastSaveTime = 0;
    var minSaveTime = 1000;

    $('#editable').on('input', function() {
   
        var now = new Date().getTime();
    
        function saveProgress() {
            $('#worksave').show().html("Work saved").fadeOut();
            localStorage.setItem("myClipboard", $('#editable').html());
        }

        if (!saveTimer) {
            if (now - lastSaveTime > (3 * minSaveTime)) {
                saveProgress();   // fire immediately on first scroll
                lastSaveTime = now;
            }
        
            saveTimer = setTimeout(function() {
                saveTimer = null;
                lastSaveTime = new Date().getTime();
                saveProgress();
            }, minSaveTime);
        }
    });

});
