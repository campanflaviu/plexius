function save_options() {
    var showIMDB = document.getElementById('imdb').checked;
    var showTrakt = document.getElementById('trakt').checked;
    chrome.storage.sync.set({
        showIMDB: showIMDB,
        showTrakt: showTrakt
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
        showTrakt: true
    }, function(items) {
        document.getElementById('imdb').checked = items.showIMDB;
        document.getElementById('trakt').checked = items.showTrakt;
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);
