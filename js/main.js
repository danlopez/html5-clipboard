/*global $, jQuery, window, Storage, localStorage, alert, document, openFile, Firebase, FirebaseAuthClient, clearTimeout, setTimeout, location */

$(function () {
    'use strict';

    /******
     *  NOTE THIS GLOBAL NAMESPACE OBJECT
     *  In lieu of global variables
     ****************/
    var NoteThis = {
        noteIndex :         0,       //Current Note Index
        Incrementer:        0,       //Number Only Ever Goes Up.  Used for note naming
        saveTimer:          null,    //SaveTimer Object
        minSaveTime:        500,      //Minimum Time between Saves
        FireBaseUser:       null,
        myDataReference:    null,
        authClient:         null,
        editor:             null 
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

    function saveProgress() {

        var content, note_obj;
        try {
            content = NoteThis.editor.getCode();
            /*Clean any empty tagss out of the clipboard before saving*/
            $('#editable *:empty').not('br').remove();
            note_obj = {note: content, title: $('#title').val()};
            localStorage.setObject("myClipboard" + NoteThis.noteIndex, note_obj);
            console.log("Setting myClipboard" + NoteThis.noteIndex + " to " + note_obj);
            if (NoteThis.FireBaseUser) {
                NoteThis.FireBaseUser.child("myClipboard" + NoteThis.noteIndex).update({title: $('#title').val(), content: $('#editable').html()});
            }
        } catch (e) {
            alert("Current Save Operation failed.");
            console.log(e);
        }
    }

    function addDropDown(id, title) {
        $('#notes_tabs').append('<li><a href="#" class="switch_note" id="' + id + '"">' + title + '</a></li>');
    }

    function updateNoteList() {
        var num = 0, i, key, localStorageKeys = Object.keys(localStorage);

        $('#notes_tabs').html('');

        for (i = 0; i < localStorageKeys.length; i = i + 1) {
            key = localStorageKeys[i];
            if (key.indexOf('myClipboard') >= 0) {
                num = num + 1;
                addDropDown(key, localStorage.getObject(key).title);
                if (NoteThis.noteIndex <= parseInt(key.split('myClipboard')[1], 10)) {
                    NoteThis.noteIndex = parseInt(key.split('myClipboard')[1], 10);
                }
            }
        }
        return num;
    }

    function loadNote(note_id) {

        console.log(note_id);
        var note = localStorage.getObject(note_id);
        console.log(note);
        NoteThis.editor.setCode(localStorage.getObject(note_id).note);

        //$('#editable').html(localStorage.getObject(note_id).note).focus();
        $('#title').val(localStorage.getObject(note_id).title);
        $('#notes_tabs li.active').removeClass('active');
        $('#' + note_id).parent().addClass('active');
        NoteThis.noteIndex = parseInt(note_id.split('myClipboard')[1], 10);
    }

    function createNote() {
        var current_note, note_obj;
        NoteThis.Incrementer = NoteThis.Incrementer + 1;
        current_note = 'myClipboard' + NoteThis.Incrementer;
        //create new note
        note_obj = {note: '', title: 'Note ' + NoteThis.Incrementer};
        localStorage.setObject(current_note, note_obj);
        //insert note in drop down with Text / title of Note
        addDropDown(current_note, note_obj.title);
        loadNote(current_note);
    }

    function createEditor(){
        $('#redactor').redactor({
            focus: true,
            callback: function(obj)
            {
                NoteThis.editor = obj;
            },
            keyupCallback: function(obj, event) {
                saveProgress();
            }
        });
    }

    function initialize() {
        //Initialize The Local Note List

        NoteThis.Incrementer = updateNoteList();

        if (NoteThis.noteIndex > NoteThis.Incrementer) {
            NoteThis.Incrementer = NoteThis.noteIndex;
        }

        createEditor();

        if (NoteThis.Incrementer === 0) {
            createNote();
        } else {
            loadNote("myClipboard" + NoteThis.noteIndex);
        }
    }

    function loggedOutSetup() {
        $('#logins').html(
            $("<button />", {
                'class': "btn",
                'data-placement': "bottom",
                'rel': "tooltip",
                'title': "Online tool sync still very much in beta.  Please do not login if you're afraid to lose notes!", 
                'id': "facebook_login",
                'html': "Facebook Login"
            })
        );
        initialize();
    }

    function loggedInSetup(user) {
        $("<span />", {
            'class': "facebook login_name",
            'html': "Welcome back, " + user.displayName // from an Ajax request or something
        }).appendTo("#welcome");

        $('#logins').html(
            $("<button />", {
                'class': "btn",
                'id': "logout",
                'html': "Logout"
            })
        );
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
        var i, key, localStorageKeys;

        localStorage.removeItem(note_id);
        localStorageKeys = Object.keys(localStorage);
        for (i = 0; i < localStorageKeys.length; i = i + 1) {
            key = localStorageKeys[i];
            if (key.indexOf('myClipboard') >= 0) {
                loadNote(key);
                break;
            }
        }
        $('#' + note_id).parent().fadeOut();
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
                for (key in snapshot.val()) {
                    if (snapshot.val().hasOwnProperty(key)) {
                        note_obj = {note: snapshot.val()[key].content, title: snapshot.val()[key].title};
                        localStorage.setObject(key, note_obj);
                    }
                }
                initialize();
            }
        });
    }

    /***********************************************************************************************/
    if (supports_html5_storage()) {

        /****** ADD OBJECT SUPPORT TO LOCALSTORAGE ********/
        Storage.prototype.setObject = function (key, value) {
            this.setItem(key, JSON.stringify(value));
        };

        Storage.prototype.getObject = function (key) {
            var value = this.getItem(key);
            return value && JSON.parse(value);
        };

        NoteThis.myDataReference = new Firebase('https://definedclarity.firebaseio.com/');
        NoteThis.authClient = new FirebaseAuthClient(NoteThis.myDataReference, function (error, user) {
            if (error) {
                alert("Error during authorization");
            // an error occurred while attempting login
            } else if (user) {
            //User Is Logged In
                loggedInSetup(user);
                setupFireBaseHandlers(user.id);
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
            clearTimeout(NoteThis.saveTimer);
            NoteThis.saveTimer = setTimeout(function () {
                saveProgress();
            }, NoteThis.minSaveTime);
        });




        /******
         *  Event Handlers
         *
         ****************/

        $('#logins').on('click', '#facebook_login', function () {
            NoteThis.authClient.login('facebook');
        });

        $('#logins').on("click", '#logout', function () {
            NoteThis.authClient.logout();
            location.reload(); //Force a Reload to reapply loggedin/loggedout setup
        });

        /*Triggers an update on other tabs when noteme is open in multiple windows*/
        $(window).on("storage", function () {
            updateNoteList();
        });

        //Create A New Note
        $('#new_note').on('click', function () {
            createNote();
        });

        $('#notes_tabs').on('click', '.switch_note', function (e) {
            e.preventDefault();
            loadNote($(this).attr('id'));
        });

        $('#delete_note').on('click', function (e) {
            e.preventDefault();
            deleteNote("myClipboard" + NoteThis.noteIndex);
        });

        $('#title').on('input', function () {
            $('#myClipboard' + NoteThis.noteIndex).html($(this).val());
        });

        $('#download').on('click', function () {
            export_note();
        });

        $('#reset').on('click', function () {
            var note_obj = {note: '', title: $('#title').val()};
            localStorage.setObject("myClipboard" + NoteThis.noteIndex, note_obj);
            $('#editable').html('');
        });

        $('#facebook_login').tooltip();



    /***********************************************************************************************/
    } else {
        //user notification that html5 storage doesn't exist
        alert('noteThis requires a modern browser.  Please try again in Chrome, Firefox or Safari.');
    }
});