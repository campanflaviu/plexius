function save_options() {

    var showIMDB = document.getElementById('imdb').checked;
    var showTrakt = document.getElementById('trakt').checked;
    var showTrailer = document.getElementById('trailer').checked;
    var showMissing = document.getElementById('missing').checked;
    var showMissingSpecials = document.getElementById('missingSpecials').checked;

    chrome.storage.sync.set({
        showIMDB: showIMDB,
        showTrakt: showTrakt,
        showTrailer: showTrailer,
        showMissing: showMissing,
        showMissingSpecials: showMissingSpecials
    }, function() {

        var status = document.getElementById('status');
        status.textContent = 'Options saved. Plex application page needs to be reloaded.';
        setTimeout(function() {
            status.textContent = '';
        }, 3000);
    });
}

function restore_options() {

    chrome.storage.sync.get({
        showIMDB: true,
        showTrakt: true,
        showTrailer: true,
        showMissing: true,
        showMissingSpecials: true
    }, function(items) {

        document.getElementById('imdb').checked = items.showIMDB;
        document.getElementById('trakt').checked = items.showTrakt;
        document.getElementById('trailer').checked = items.showTrailer;
        document.getElementById('missing').checked = items.showMissing;
        document.getElementById('missingSpecials').checked = items.showMissingSpecials;
    });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);
