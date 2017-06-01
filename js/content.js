var settings;
var global_server_addresses;
var server_addresses = {};
var criticRatingRtEl = "div[class^='CriticRating-rt'], div[class*=' CriticRating-rt']";
var titleRatingContainerEl = "div[class^='PrePlayRatingRightTitle-ratingRightTitle-'], div[class*=' PrePlayRatingRightTitle-ratingRightTitle-']";
var titleCriticRatingContainerEl = "span[class^='PrePlayRatingRightTitle-criticRating'], span[class*=' PrePlayRatingRightTitle-criticRating']";
var criticRatingContainerEl = "div[class^='CriticRating-container-'], div[class*=' CriticRating-container-']";
var imdbRatingContainerEl = "div[class^='CriticRating-imdb-'], div[class*=' CriticRating-imdb-']";
var headerToolbarContainerEl = "div[class^='pageHeaderToolbar-toolbar-'], div[class*=' pageHeaderToolbar-toolbar-']";
var task_counter = 0;
var server;


var checkPage = function() {
    if (/\/details\?key=%2Flibrary%2Fmetadata%2F(\d+)$/.test(document.URL)) { // check if on movie/tv show page
        checkElement();
    }
};

window.onhashchange = function() {
    closeModal();
    checkPage();
};


function checkElement() {
    // go forward as soon as the title for movie/tv show/episode is rendered
    jQuery(document).arrive(titleRatingContainerEl, {existing: true}, function() {

        var requests_url;
        if (localStorage.myPlexAccessToken) {
            requests_url = 'https://plex.tv/pms';
        } else {
            var url_matches = page_url.match(/^?\:\/\/(.+):(\d+)\/web\/.+/);
            requests_url = window.location.protocol + '//' + url_matches[1] + ':' + url_matches[2];
        }

        getServerAddresses(requests_url, localStorage.myPlexAccessToken, function(server_addresses) {

            // there is a built in imdb rating for some movies
            if (jQuery(imdbRatingContainerEl).length) {
                return;
            }

            var parent_item_id, machine_identifier;
            var page_identifier = document.URL.match(/\/server\/(.[^\/]+)\/details\?key=%2Flibrary%2Fmetadata%2F(\d+)$/);
            if (page_identifier) {
                machine_identifier = page_identifier[1];
                parent_item_id = page_identifier[2];
            } else {
                return;
            }


            if (localStorage.users) {
                var users = JSON.parse(localStorage.users);
                servers = users.users[0].servers[0].connections;
            }

            server = global_server_addresses[machine_identifier];

            var metadata_xml_url = global_server_addresses[machine_identifier].uri + '/library/metadata/' + parent_item_id + '?X-Plex-Token=' + localStorage.myPlexAccessToken;

            console.log('plexius', metadata_xml_url);
            getXML(metadata_xml_url, function(metadata_xml) {

                movieDetails = processPageDetails(metadata_xml);

                if (!movieDetails) {
                    return;
                }

                // add IMDB rating
                if (settings.showIMDB) {
                    // omdbApi.processResource(movieDetails);
                }

                // add trakt rating
                traktApi.processResource(movieDetails);

                // add missingEpisodes
                missingEpisodes.init(global_server_addresses[machine_identifier], movieDetails);

            });
        });
        jQuery(document).unbindArrive();
    });
}

// first run
setDefaultOptions(function(storedSettings) {
    settings = storedSettings;
    checkPage();
});
