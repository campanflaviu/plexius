var settings;
var global_server_addresses;
var server_addresses = {};
var criticRatingRtEl = elementsStartingWithClass('CriticRating-rt', 'Zm7_X');
var titleRatingContainerEl = elementsStartingWithClass('PrePlayRatingRightTitle-ratingRightTitle-', '_1d4Yy');
var titleCriticRatingContainerEl = elementsStartingWithClass('PrePlayRatingRightTitle-criticRating', '_2J_tn');
var criticRatingContainerEl = elementsStartingWithClass('CriticRating-container-', '_2t5Lw');
var imdbRatingContainerEl = elementsStartingWithClass('CriticRating-imdb-', '_16xaH');
var headerToolbarContainerEl = elementsStartingWithClass('pageHeaderToolbar-toolbar-', '_1lW-M');
var task_counter = 0;
var server;


var checkPage = function() {
    if (jQuery('#plex.application').length) {
        if (/\/details\?key=%2Flibrary%2Fmetadata%2F(\d+)$/.test(document.URL)) { // check if on movie/tv show page
            checkElement();
        }

        // show the stats button in the navigation bar if they were previously gathered
        local_storage_get('PlexiusStats', function(result) {
            if (result && result.movie) {
                insertStatsButton();
            }
        });
    }
};

window.onhashchange = function() {
    closeModal();
    checkPage();
};

function insertStatsButton() {
    jQuery(document).arrive('.nav-bar-right', {existing: true}, function() {
        if (!jQuery('.plexius-stats-btn').length) {
            jQuery('.nav.nav-bar-nav.nav-bar-right').prepend(createEl({
                type: 'li',
                class: 'plexius-stats-btn',
                children: [{
                    type: 'a',
                    attrs: {
                        title: 'Stats',
                        href: getStatsURL(),
                        'data-toggle': 'tooltip',
                        target: 'stats'
                    },
                    children: [{
                        type: 'span',
                        class: 'activity-badge badge badge-transparent hidden'
                    }, {
                        type: 'i',
                        class: 'glyphicon pie-chart'
                    }]
                }]
            }));
        }
    });
}


function checkElement() {
    // go forward as soon as the title for movie/tv show/episode is rendered
    jQuery(document).arrive(titleRatingContainerEl, {existing: true}, function() {

        getServerAddresses(localStorage.myPlexAccessToken, function() {

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

            getXML(metadata_xml_url, function(metadata_xml) {

                mediaDetails = processPageDetails(metadata_xml);

                if (!mediaDetails) {
                    return;
                }

                // IMDB rating
                if (!jQuery('.plexius-imdb-rating-container').length) {
                    omdbApi.processResource(mediaDetails);
                }

                // trakt rating
                if (!jQuery('.plexius-trakt-rating-container').length) {
                    traktApi.processResource(mediaDetails);
                }

                // missingEpisodes
                missingEpisodes.init(global_server_addresses[machine_identifier], mediaDetails);

            });

            // update stats if they are older than 1 day
            local_storage_get('PlexiusStatsUpdated', function(result) {
                if (!result || Date.now() - result > 1000 * 60 * 60 * 24) {
                    Stats.generate(global_server_addresses[machine_identifier], localStorage.myPlexAccessToken, function(stats) {
                    });
                }
            });
        });
        jQuery(document).unbindArrive();
    });
}

// first run
getDefaultOptions(function(storedSettings) {
    settings = storedSettings;
    checkPage();
});
