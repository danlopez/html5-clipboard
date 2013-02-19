/*global $, jQuery, window, Storage, localStorage, alert, document, openFile, Firebase, FirebaseAuthClient, clearTimeout, setTimeout, location */

$(function () {
    'use strict';

    /******
     *  NOTE THIS GLOBAL NAMESPACE OBJECT
     *  In lieu of global variables
     ****************/
    var NoteThis = {
        activeNote :        null,     //Current Note Index
        saveTimer:          null,     //SaveTimer Object
        minSaveTime:        150,      //Minimum Time between Saves
        FireBaseUser:       null,
        myDataReference:    null,
        authClient:         null,
        editor:             null,
        userData:           null, 
    };

    /******
     *  FUNCTION DECLARATIONS
     *
     ****************/

    function supports_html5_storage() {
        try {
            localStorage.setItem('a', 'a');
            localStorage.removeItem('a');
            return true;
        } catch (e) {
            return false;
        }
    }

    function getObjectLength (obj){
        var size = 0;
        for (var prop in obj) {
            if (hasOwnProperty.call(obj, prop)) size = size + 1;
          }
          return size;
    }

    function setLocalObject(key, value){
        localStorage.setItem(key, JSON.stringify(value));
    }

    function getLocalObject(key){
        var value = localStorage.getItem(key);
        return value && JSON.parse(value);
    }

    //Timer function keeps from firing save too often.
    function saveProgress() {
        clearTimeout(NoteThis.saveTimer);
        NoteThis.saveTimer = setTimeout(function () {       
            delayedSave();
        }, NoteThis.minSaveTime);
    }

    //Splits save action depending on context (logged out, logged in),
    //catches storage handling errors.
    function delayedSave(){
        //Safely ignore if no note is active.  
        if(NoteThis.activeNote === null){
            return;
        }
        if (NoteThis.FireBaseUser) {
            try{
                delayedSaveOnline();
            } catch (e){
                alert("Save Operation Failed");
                console.log(e);
            }
        } else {
            try {
                 delayedSaveOffLine();
            } catch (e) {
                if(e.name === 'QUOTA_EXCEEDED_ERR'){
                    $('#storageExceeded').modal('show');
                } else {
                    throw e; // Let any other errors bubble up
                }
            }
        }
    }

    function delayedSaveOnline(){
        var note_obj = {note: NoteThis.editor.getCode(), title: $('#title').val()};  
        if(NoteThis.activeNote.indexOf('myClipboard-') >= 0){
            pushNewNote(note_obj);
        } else {   
            NoteThis.FireBaseUser.child(NoteThis.activeNote).update(note_obj);
            setLocalObject(NoteThis.activeNote, note_obj);
        }
    }

    function delayedSaveOffLine(){
        var note_obj = {note: NoteThis.editor.getCode(), title: $('#title').val()};
        if(NoteThis.activeNote.indexOf('fireClip-') >= 0){
            pushNoteLocal(note_obj);
            setLocalObject(NoteThis.activeNote, note_obj); //REMOVE THIS ONCE pushNOTE LOCAL IS WRITTEN
        } else {
            setLocalObject(NoteThis.activeNote, note_obj);
        }
    }

    /* Take a previously online note, and convert it back to a local note */
    function pushNoteLocal(note_object) {
        //TO DO.  This should ONLY happen when a user's login expires and they still have local copies
        console.log("Unwritten function!");
    }

    /* Generate a NEW Server-Side Note Object*/
    function pushNewNote(note_object) {
        var newNote, newNoteNum = 1;
        do{
            newNote = "fireClip-" + newNoteNum;
            newNoteNum = newNoteNum + 1;
        } while(newNote in NoteThis.userData);

        NoteThis.FireBaseUser.child(newNote).update(note_object); 
        localStorage.removeItem(NoteThis.activeNote);    
        $('#' + NoteThis.activeNote).attr('id', newNote).addClass("cloud");
        NoteThis.activeNote = newNote;        
    }

    function addDropDown(id, title, myClass) {
        var thisClass = (myClass || '');
        thisClass = thisClass + " truncate switch_note";
        $('#notes_tabs').append('<li><a title="' + title + '" href="#" class="' + thisClass + '" id="' + id + '">' + title + '</a></li>');
        //add active class if it should have it
        if (NoteThis.activeNote == id) {
            $('#'+id).parent().addClass('active');
        }
    }

    function updateNoteList(loader, updateOnFocus) {  

        var exists = false, cloudNotes = false, temp, key, noteList;
        loader = loader || false;
        updateOnFocus = updateOnFocus || false;
        noteList = $('#notes_tabs').html('');

        if(!loader) { 
            $('#warningGradientOuterBarG').show();
        }
        for (key in NoteThis.userData){
            if(Object.prototype.hasOwnProperty.call(NoteThis.userData,key)){
                if (key.indexOf('fireClip-') >= 0) {
                    temp = NoteThis.userData[key].title || "untitled";
                    addDropDown(key, temp, 'cloud');
                    exists = key;
                    cloudNotes = true;
                }
            }
        }
        for (key in localStorage){
            if(Object.prototype.hasOwnProperty.call(localStorage,key)){
                if (key.indexOf('myClipboard-') >= 0) {
                    temp = getLocalObject(key).title || "untitled";
                    if (! updateOnFocus && cloudNotes && temp === 'New Note' && getLocalObject(key).note ===''){
                        console.log('blank note removed');
                        localStorage.removeItem(key);
                    }
                    else {
                        addDropDown(key, temp);
                        exists = key;
                    }
                } else if (key.indexOf('myClipboard') >= 0) {     
                    temp = migrateNote(key);
                    exists = key; 
                }
            }
        }
        

        if(loader){
            $('#warningGradientOuterBarG').hide();
        }
        return exists;
    }

    function migrateNote(key) {
        var obj, note_obj, next_note;
        if(key !== undefined){
            try{
                obj = getLocalObject(key);
                note_obj = {note: obj.note, title:  obj.title};
            }
            catch(e){//If all else fails, grab the item directly (do not parse), dump the contents in a note
                note_obj = {note: localStorage.getItem(key), title: "untitled"}
            }
            next_note = getNextNote();
            setLocalObject(next_note, note_obj);
            addDropDown(next_note, note_obj.title);
            deleteNote(key);
        }  
    }

    /*  
    **  Switches Active Note, Loads WYSIWYG from LocalStorage                  
    */
    function loadNote(note_id) {
        var thisNote;
        $('#notes_tabs li.active').removeClass('active');
        $('#' + note_id).parent().addClass('active');

        if (note_id.indexOf('fireClip-') >= 0) {
            thisNote = {note: NoteThis.userData[note_id].note, title: NoteThis.userData[note_id].title};
        } else {
            thisNote = getLocalObject(note_id);
        }
        
        thisNote.note = thisNote.note || "";
        thisNote.title = thisNote.title || "untitled";
        
        NoteThis.editor.setCode(thisNote.note);
        $('#title').val(thisNote.title);

        NoteThis.activeNote = note_id;
        localStorage.setItem('activeNote', note_id);
        //also set this in firebase if user is logged in
        if (NoteThis.FireBaseUser) {
            NoteThis.FireBaseUser.child('activeNote').set(note_id);
        }
    }

    /*  
    **  Identify next available local note name                                                   
    */   
    function getNextNote() {
        var num = 0, nextNote;
        do{
            num = num + 1;
            nextNote = "myClipboard-" + num;            
        }   while(nextNote in localStorage);
        return nextNote;
    }

    /*
    **  Generates a local note and makes it active
    */
    function createNote() {
        var current_note, note_obj;
        current_note = getNextNote();
        //create new note

        note_obj = {note: '', title: 'New Note'};
        setLocalObject(current_note, note_obj);

        //insert note in drop down with Text / title of Note
        addDropDown(current_note, note_obj.title);
        loadNote(current_note);
    }

    //Check for the note in localstorage, or check if remote data exists, and check for it there.
    function noteExists(note_id) {
        return (note_id in localStorage || (NoteThis.userData && (note_id in NoteThis.userData)));
    }

    function createEditor(){
        var buttons = ['html', '|', 'formatting', '|', 'bold', 'italic', 'deleted', '|', 
                        'unorderedlist', 'orderedlist', 'outdent', 'indent', '|',
                        'image', 'video', 'file', 'table', 'link', '|',
                        'fontcolor', 'backcolor', '|', 'alignment'];

        $('#redactor').redactor({
            focus: true,
            buttons: buttons,
            toolbarExternal: '#toolbar',
            callback: function(obj)
            {
                NoteThis.editor = obj;
                attachScrollObserver();
            },
            keyupCallback: function(obj, event) {
                saveProgress();
            }
        });
    }

    //Lets wysiwyg toolbar scroll with the user
    function attachScrollObserver(){
        var height, $window = $(window);

         $window.scroll(function(e) {
            height = $('#edit_wrapper').offset().top;
             if($window.scrollTop() > height){
                 $("#toolbar, .redactor_box").addClass('scrollfix');   
             } else {
                 $("#toolbar, .redactor_box").removeClass('scrollfix');
             }
        });

    }

    //fix sidebar on scroll
    function fixSidebar(){
        var height, $window = $(window);

         $window.scroll(function(e) {
            height = $('.side-nav-wrapper').offset().top+$('#new_note').height();
             if($window.scrollTop() > height){
                 $(".side-nav").addClass('scrollfix');   
             } else {
                 $(".side-nav").removeClass('scrollfix');
             }
        });
    }

    function initialize(updateList) {
        var exists;

        updateList = updateList || false;
        //Load the NoteList, if any notes exist
        exists = updateNoteList(updateList);

        //If no note exists, create one.  Otherwise, check to see if we have an active note, and load it.  Otherwise, just load an existing note.
        if (!exists) {
            createNote();
        } else {

            if (NoteThis.FireBaseUser) {
                NoteThis.activeNote = NoteThis.userData.activeNote;
            }
            else if (NoteThis.activeNote ===null) {
                NoteThis.activeNote = localStorage.getItem('activeNote');
            }
            if (NoteThis.activeNote !== null && noteExists(NoteThis.activeNote)) {
                loadNote(NoteThis.activeNote);
            } else {
                loadNote(exists);
            }
        }
        fixSidebar();
    }

    function loggedOutSetup() {
        $('#logins .dropdown-menu').html('').append(
            $("<li />", {
                    'data-placement': "bottom",
                    'class': "tip facebook_login",
                    'rel': "tooltip",
                    'data-delay': 500,
                    'title': "Login to keep your notes stored online and available anywhere.", 
                    'html': "<a href='#'>Facebook Login</a>"
                })
            ).append(
                $("<li />", {
                    'data-placement': "bottom",
                    'class' : "tip twitter_login",
                    'rel': "tooltip",
                    'data-delay': 500,
                    'title': "Login to keep your notes stored online and available anywhere.", 
                    'html': "<a href='#'>Twitter Login</a>"
                })
            )

        $('.tip').tooltip();

        initialize(true);
        //clear local storage

    }

    function loggedInSetup(user) {
        // $("<span />", {
        //     'class': "facebook login_name",
        //     'html': "Welcome back, " + user.displayName // from an Ajax request or something
        // }).appendTo("#welcome");
        $('#logins .dropdown-toggle').html(user.displayName + '<b class="caret"></b>');
        $('#logins .dropdown-menu').html('').append(
            $("<li />", {
                'id': "logout",
                'html': "<a>Logout</a>"
            })
        );
        $('#logout_keep_data').tooltip();
    }

    function export_note() {
        var html, div;

        $("#editable *").each(function () {
            $(this).removeAttr("style");
        });

        html  = $("#editable").html();

        //now remove all </div> and <br> tags
        html = html.split('</div>').join('');
        html = html.split('<br>').join('');
        //add a new line for each div
        html = html.split('<div>').join('\n');
        //decode html again, in case you pasted that
        div = document.createElement('div');
        div.innerHTML = html;
        html = div.firstChild.nodeValue;
        openFile(html, "application/octet-stream", false);
    }

    function openFile(textToEncode, contentType, newWindow) {
        var encodedText = window.btoa(textToEncode),
            dataURL = 'data:' + contentType + ';base64,' + encodedText;

        if (newWindow) { // Not useful for application/octet-stream type
            window.open(dataURL); // To open in a new tab/window
        } else {
            window.location = dataURL; // To change the current page
        }
    }

    function deleteNote(note_id) {
        var i, key, $parent;

        localStorage.removeItem(note_id);

        if (NoteThis.FireBaseUser) {
            NoteThis.FireBaseUser.child(NoteThis.activeNote).set(null);
        }

        $parent = $('#' + note_id).parent();
        for (key in NoteThis.userData){
            if(Object.prototype.hasOwnProperty.call(NoteThis.userData,key)){
                if (key.indexOf('fireClip-') >= 0) {
                    loadNote(key);
                    $parent.fadeOut(300, function() { $(this).remove(); });
                    return;
                }
            }
        }
        for (key in localStorage){
            if(Object.prototype.hasOwnProperty.call(localStorage,key)){
                if (key.indexOf('myClipboard-') >= 0) {
                    loadNote(key);
                    $parent.fadeOut(300, function() { $(this).remove(); });
                    return;
                }
            }
        }
        $parent = $('#' + note_id).parent();
        $parent.fadeOut(300, function() { $(this).remove(); createNote(); }); 
    }

    function searchNotes(query){
        if (query.length >=2) {
            var note_id, currentNote, results=[], haystack, key;
            //first search online notes
            for (note_id in NoteThis.userData){
                if (note_id.indexOf('fireClip-') >= 0){
                    currentNote=NoteThis.userData[note_id];
                    haystack =currentNote.title.toLowerCase() + $('<div>'+currentNote.note+'</div>').text().toLowerCase();
                    if ((haystack.indexOf(query.toLowerCase()) >=0)) {
                        results.push({id: note_id, pos: haystack.indexOf(query.toLowerCase())});
                    }
                }
            }

            for (key in localStorage){
                if(Object.prototype.hasOwnProperty.call(localStorage,key)){
                    if (key.indexOf('myClipboard-') >= 0){
                        currentNote=getLocalObject(key);
                        haystack =currentNote.title.toLowerCase() + $('<div>'+currentNote.note+'</div>').text().toLowerCase();
                        if ((haystack.indexOf(query.toLowerCase()) >=0)) {
                            results.push({id: key, pos: haystack.indexOf(query.toLowerCase())});
                        }
                    }
                }
            }
            // console.log(results);
            return results;
        }
    }
    function formatSearch(list, query){
        var currentNote, searchResult='', i, currentID;
        if (list){
            // $('#app-body').hide();
            $('#search-body').slideDown();
            $('#clear-search').attr('style','display: inline-block');
            $('#query').html(query);
            $('.note-list-search').html('');
            for (i =0 ; i < list.length; i++) {
                currentID = list[i].id
                if (currentID.indexOf('fireClip-') >=0) {
                    currentNote = NoteThis.userData[currentID];
                }
                else {
                    currentNote = getLocalObject(currentID);    
                }
                searchResult = searchResult + '<div class = " span2 search-result" id = "search-' + currentID + '"><h4>' + currentNote.title + '</h4>';
                searchResult = searchResult + printNotePreview(currentID, list[i].pos, query);
                searchResult = searchResult + '</div>';
            }
            $('.note-list-search').append(searchResult || "<h5>There are no notes that match your search</h5>");


        }
        else {
            $('#app-body').show();
            $('#search-body').slideUp();
            $('#clear-search').hide();

        }
    }
    // return a snippet of a note based on a position and the note id.  Position is that of a matching string
    function printNotePreview(note_id, position, query, length) {
        var currentNote;
        var length = length || 70, result ='<p>';

        if (note_id.indexOf('fireClip-') >=0) {
                    currentNote = NoteThis.userData[note_id];
                }
                else {
                    currentNote = getLocalObject(note_id);    
                }

        if (position < length / 2 ){
            result +=  $('<div>' + currentNote.note + '</div>').text().substring(0,length).replace(query, '<b>'+query+'</b>');
        }
        else {
            result = $('<div>' + currentNote.note + '</div>').text().substring(position-length/2,position+length/2).replace(query, '<b>'+query+'</b>');
        }
        return result + '</p>';
    }
    //This function definitely has a limited shelf-life.  Used to knock all the fireclip entries out of localstorage.
    // having them in there can cause some issues when loading notes.
    function wipeLocalFireClips() {
        var key;
        for (key in localStorage){
            if(Object.prototype.hasOwnProperty.call(localStorage,key)){
                if (key.indexOf('fireClip-') >= 0) {
                    localStorage.removeItem(key);    
                }
            }
        }
    }

    /******
     * FireBase Handler
     *
     ****************/

    function setupFireBaseHandlers(user_id) {
        var key, note_obj;
        NoteThis.FireBaseUser = new Firebase('https://definedclarity.firebaseio.com/users/' + user_id);
        NoteThis.FireBaseUser.once('value', function (snapshot) {
            if (snapshot.val() !== null) {
            //     for (key in snapshot.val()) {
            //         if (snapshot.val().hasOwnProperty(key)) {
            //             note_obj = {note: snapshot.val()[key].note, title: snapshot.val()[key].title};
            //             setLocalObject(key, note_obj)
            //         }
                NoteThis.userData = snapshot.val();
            }   
                
            // }
            initialize(true);
        });

        //This is used to keep track of the notes on the server
        // NoteThis.FireBaseUser.on('value', function (snapshot) {
        //     if(snapshot.val() !== null) {
        //         NoteThis.userData = snapshot.val();
        //     }
        // });

        //Testing use of child changed instead of value to reduce firebase bandwidth
        NoteThis.FireBaseUser.on('child_changed', function(snapshot) {
            if(snapshot.val() !== null) {
                NoteThis.userData[snapshot.name()] = snapshot.val();
            }
        });
    }

    /***********************************************************************************************/
    if (supports_html5_storage()) {

        //Load the exitor
        createEditor();

        wipeLocalFireClips();

        NoteThis.myDataReference = new Firebase('https://definedclarity.firebaseio.com/');
        NoteThis.authClient = new FirebaseAuthClient(NoteThis.myDataReference, function (error, user) {
            if (error) {
                alert("Error during authorization");
            // an error occurred while attempting login
            } else if (user) {
            //User Is Logged In
                setupFireBaseHandlers(user.id);
                loggedInSetup(user);
                
            } else {
            // User Is Logged Out
                loggedOutSetup();
            }
        });

        /******
         *  Save Handler
         *
         ****************/
        $('#title').on('input', function () {
            saveProgress();
        });

        /******
         *  Event Handlers
         *
         ****************/

        $('#logins, #storageExceeded').on('click', '.facebook_login', function (e) {
            e.preventDefault();
            NoteThis.authClient.login('facebook', {
                rememberMe: true
            });
        });

        $('#logins, #storageExceeded').on('click', '.twitter_login', function (e) {
            e.preventDefault();
            NoteThis.authClient.login('twitter', {
                rememberMe: true
            });
        });

        $('#logins').on("click", '#logout', function () {
            NoteThis.authClient.logout();
            window.location.reload(); //Force a Reload to reapply loggedin/loggedout setup
        });

        /*Triggers an update on other tabs when notethis is open in multiple windows*/
        $(window).on("storage", function () {
            updateNoteList(true, true);
        });

        //Reload the current note on focus, if there is an active note
        $(window).on("focus", function(){
            if (NoteThis.activeNote !== null){
                loadNote(NoteThis.activeNote)
            }
        });
        $('#search').on('input', function(){
            var results;
            results = searchNotes($('#search').val());
            formatSearch(results, $('#search').val());
        });

        //Create A New Note
        $('#new_note').on('click', function () {
            createNote();
        });

        $('#notes_tabs').on('click', '.switch_note', function (e) {
            e.preventDefault();
            loadNote($(this).attr('id'));
            if ($(window).width() < 768 && $('#sidebar_btn.collapsed').length <=0){
                $('.note-list').collapse('hide');
            }
        });

        $('#delete_note').on('click', function (e) {
            e.preventDefault();
            deleteNote(NoteThis.activeNote);
        });

        $('#title').on('input', function () {
            $('#' + NoteThis.activeNote).html($(this).val()).attr("title", $(this).val());
        });

        $('#download').on('click', function () {
            export_note();
        });
        $(document).on('click', '.search-result', function(){
            console.log('event');
            $('#search-body').slideUp();
            $('#app-body').show();
            $('#clear-search').hide();
            loadNote($(this).attr('id').replace('search-',''));
            $('#search').val('');
        })
        $('#clear-search').on('click', function(){
            $('#search').val('');
            $('#clear-search').hide();
            $('#search-body').slideUp();
        })

    /***********************************************************************************************/
    } else {
        //user notification that html5 storage doesn't exist
        alert('noteThis requires a modern browser.  Please try again in Chrome, Firefox or Safari.');
    }
});