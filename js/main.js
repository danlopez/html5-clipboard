$(function() {

    function supports_html5_storage() {
        try {
            return 'localStorage' in window && window['localStorage'] !== null;
        } catch (e) {
            return false;
        }
    }
    /*Only run if html5 storage supported*/
    if(supports_html5_storage()){
        
        /******** INITIALIZATION **********/
        //initialize by creating a link for each note
        var current_num=0;
        for (var key in localStorage){
            if (key.indexOf('myClipboard') >=0){
                addDropDown(key, localStorage.getItem(key).substring(0,localStorage.getItem(key).indexOf('--')));
                //track highest (i.e. current) key
                if (current_num <= key.split('myClipboard')[1])
                    current_num = parseInt(key.split('myClipboard')[1])+1;
            }
        }

        //create new note & set current note to it
        var current_note = 'myClipboard'+current_num;
        createNote();
        //load current note/ first note
        $('#editable').html(localStorage.getItem(localStorage.getItem('currentNote'))).focus();

        /******* END INITIALIZATION *********/

        function addDropDown(id, title){
            $('#notes_dropdown .divider').before('<li><a href="#" class="switch_note" id="' + id + '""><i class="icon-book"></i> ' + title + '</a></li>');
            $('#notes_tabs').append('<li><a href="#" class="switch_note" id="' + id + '""><i class="icon-book"></i> ' + title + '</a></li>');
        }
        function createNote(){
            current_note='myClipboard'+current_num;
            //create new note
            localStorage.setItem(current_note,'Note'+current_num+'--<div><br><br></div>');
            //insert note in drop down with Text / title of Note
            addDropDown(current_note, 'Note'+current_num);
            loadNote(current_note);
            current_num+=1;
        }

        function loadNote(note_id){
            current_note=note_id;
            localStorage.setItem('currentNote', current_note);
            $('#editable').html(localStorage.getItem(note_id)).focus();
            $('#notes_tabs li.active').removeClass('active');
            $('#'+note_id).parent().addClass('active');
        }
        function deleteNote(note_id){
            localStorage.removeItem(note_id);
            for (var key in localStorage){
                if (key.indexOf('myClipboard') >=0){
                    loadNote(key)
                    break;
                }
            }
            $('#'+note_id).parent().fadeOut();
        }
        function saveProgress() {
            $('#worksave').show().html(" Saving...").fadeOut('slow');
            console.log(current_note);
            try {
                /*Clean any empty tagss out of the clipboard before saving*/
                $('#editable *:empty').not('br').remove();
                localStorage.setItem(current_note, $('#editable').html());
            } catch (e) {
                alert("Current Save Operation failed.  Local storage capacity reached");
            }
        }
        /***** SAVE HANDLER *******/
        var saveTimer;
        var minSaveTime = 500;
        $('#editable').on('input', function() {
            
            clearTimeout(saveTimer);
            saveTimer = setTimeout(function() {
                saveProgress();
            }, minSaveTime);
        });
        /****** END SAVE ********/
        function openFile (textToEncode, contentType, newWindow) {
            var encodedText = window.btoa(textToEncode);
            var dataURL = 'data:' + contentType + ';base64,' + encodedText;
            if (newWindow) { // Not useful for application/octet-stream type
                window.open(dataURL); // To open in a new tab/window
            }
            else {
                window.location = dataURL; // To change the current page
            }
        }
        /****** Event Handlers **********/
        $('#download').on('click', function(){
            
            $("#editable *").each(function(){
                $(this).removeAttr("style");
            });

            var html  = $("#editable").html();
            
    
            //now remove all </div> and <br> tags
            html=html.split('</div>').join('');
            html=html.split('<br>').join('');
            //add a new line for each div
            html = html.split('<div>').join('\n');
            //decode html again, in case you pasted that
            var div = document.createElement('div');
            div.innerHTML = html;
            html = div.firstChild.nodeValue;
            openFile(html, "application/octet-stream", false);
        });

        $('#reset').on('click', function(){
            localStorage.setItem(current_note,'');
            $('#editable').html('');
        });

        $('#new_note').on('click', function(){
            createNote();
        });
        $('.switch_note').on('click', function(){
            loadNote($(this).attr('id'));
        });
        $('#delete_note').on('click', function(){
            deleteNote(current_note);
        });

        /********* END Event Handlers *********/

    }
    else {
        //user notification that html5 storage doesn't exist
        alert('noteThis requires a modern browser.  Please try again in Chrome, Firefox or Safari.')
    }

});
